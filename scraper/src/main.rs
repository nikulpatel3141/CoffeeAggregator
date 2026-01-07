use anyhow::Result;
use axum::{
    extract::{Query, State},
    http::{header, StatusCode},
    routing::{get, post},
    Json, Router,
};
use chrono::Utc;
use firestore::FirestoreDb;
use scraper::{Html, Selector};
use serde::{Deserialize, Serialize};
use std::{net::SocketAddr, sync::Arc};
use tower_http::cors::{Any, CorsLayer};
use tracing::info;

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Coffee {
    name: String,
    roaster: String,
    origin: Option<String>,
    region: Option<String>, // Geographic region (e.g., Africa, South America)
    tasting_notes: Vec<String>,
    price: Option<String>,
    url: String,
    in_stock: bool,
    scraped_at: String,
}

#[derive(Clone)]
struct AppState {
    db: Arc<FirestoreDb>,
}

#[derive(Debug, Deserialize)]
struct CoffeeFilters {
    roaster: Option<String>,
    region: Option<String>,
    min_price: Option<f32>,
    max_price: Option<f32>,
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();

    let project_id = std::env::var("GCP_PROJECT_ID")?;
    let db = Arc::new(FirestoreDb::new(&project_id).await?);

    let state = AppState { db };

    // Configure CORS to allow requests from any origin
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/", post(scrape_handler))
        .route("/api/coffees", get(get_coffees))
        .route("/api/health", get(health_check))
        .layer(cors)
        .with_state(state);

    let addr = SocketAddr::from(([0, 0, 0, 0], 8080));
    info!("Starting server on {}", addr);

    axum::Server::bind(&addr)
        .serve(app.into_make_service())
        .await?;

    Ok(())
}

async fn health_check() -> &'static str {
    "OK"
}

async fn scrape_handler(State(state): State<AppState>) -> &'static str {
    match run_scraper(&state.db).await {
        Ok(_) => {
            info!("Scraping completed successfully");
            "OK"
        }
        Err(e) => {
            tracing::error!("Scraping failed: {}", e);
            "ERROR"
        }
    }
}

async fn get_coffees(
    State(state): State<AppState>,
    Query(filters): Query<CoffeeFilters>,
) -> Result<Json<Vec<Coffee>>, StatusCode> {
    info!("Fetching coffees from Firestore");

    match state
        .db
        .fluent()
        .select()
        .from("coffees")
        .obj()
        .query()
        .await
    {
        Ok(coffees) => {
            let mut coffees: Vec<Coffee> = coffees;

            // Apply filters
            if let Some(roaster) = filters.roaster {
                coffees.retain(|c| c.roaster.to_lowercase().contains(&roaster.to_lowercase()));
            }

            if let Some(region) = filters.region {
                coffees.retain(|c| {
                    c.region
                        .as_ref()
                        .map(|r| r.to_lowercase().contains(&region.to_lowercase()))
                        .unwrap_or(false)
                });
            }

            // Price filtering (parse prices like "£12.50")
            if filters.min_price.is_some() || filters.max_price.is_some() {
                coffees.retain(|c| {
                    if let Some(price_str) = &c.price {
                        let price = price_str
                            .chars()
                            .filter(|c| c.is_numeric() || *c == '.')
                            .collect::<String>()
                            .parse::<f32>()
                            .ok();

                        if let Some(price) = price {
                            let above_min = filters.min_price.map(|min| price >= min).unwrap_or(true);
                            let below_max = filters.max_price.map(|max| price <= max).unwrap_or(true);
                            return above_min && below_max;
                        }
                    }
                    false
                });
            }

            Ok(Json(coffees))
        }
        Err(e) => {
            tracing::error!("Failed to fetch coffees: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

async fn run_scraper(db: &FirestoreDb) -> Result<()> {
    info!("Starting coffee scraper");

    // List of UK specialty coffee roasters to scrape
    let scrapers = vec![
        scrape_pact_coffee,
        scrape_origin_coffee,
        scrape_rave_coffee,
        scrape_square_mile,
        scrape_has_bean,
        scrape_assembly,
        scrape_dark_arts,
        scrape_round_hill,
    ];

    let mut all_coffees = Vec::new();

    for scraper_fn in scrapers {
        match scraper_fn().await {
            Ok(mut coffees) => all_coffees.append(&mut coffees),
            Err(e) => tracing::error!("Scraper failed: {}", e),
        }
    }

    // Store in Firestore
    for coffee in all_coffees {
        let doc_id = format!(
            "{}_{}_{}",
            coffee.roaster.replace(" ", "_"),
            coffee.name.replace(" ", "_"),
            Utc::now().timestamp()
        );

        db.fluent()
            .insert()
            .into("coffees")
            .document_id(&doc_id)
            .object(&coffee)
            .execute()
            .await?;
    }

    info!("Scraping completed");
    Ok(())
}

async fn scrape_square_mile() -> Result<Vec<Coffee>> {
    info!("Scraping Square Mile Coffee");
    let url = "https://shop.squaremilecoffee.com/collections/coffee";
    let body = reqwest::get(url).await?.text().await?;
    let document = Html::parse_document(&body);

    // Example selectors - these need to be adjusted based on actual site structure
    let product_selector = Selector::parse(".product-item").unwrap();
    let name_selector = Selector::parse(".product-title").unwrap();
    let price_selector = Selector::parse(".price").unwrap();

    let mut coffees = Vec::new();

    for product in document.select(&product_selector) {
        let name = product
            .select(&name_selector)
            .next()
            .map(|e| e.text().collect::<String>())
            .unwrap_or_default()
            .trim()
            .to_string();

        let price = product
            .select(&price_selector)
            .next()
            .map(|e| e.text().collect::<String>());

        if !name.is_empty() {
            coffees.push(Coffee {
                name,
                roaster: "Square Mile Coffee".to_string(),
                origin: None,
                region: None,
                tasting_notes: Vec::new(),
                price,
                url: url.to_string(),
                in_stock: true,
                scraped_at: Utc::now().to_rfc3339(),
            });
        }
    }

    Ok(coffees)
}

async fn scrape_has_bean() -> Result<Vec<Coffee>> {
    info!("Scraping Has Bean Coffee");
    let url = "https://www.hasbean.co.uk/collections/coffee";
    let body = reqwest::get(url).await?.text().await?;
    let document = Html::parse_document(&body);

    let product_selector = Selector::parse(".product-item").unwrap();
    let name_selector = Selector::parse(".product-item__title").unwrap();
    let price_selector = Selector::parse(".price").unwrap();
    let link_selector = Selector::parse("a.product-item__link").unwrap();

    let mut coffees = Vec::new();

    for product in document.select(&product_selector) {
        let name = product
            .select(&name_selector)
            .next()
            .map(|e| e.text().collect::<String>())
            .unwrap_or_default()
            .trim()
            .to_string();

        let price = product
            .select(&price_selector)
            .next()
            .map(|e| e.text().collect::<String>());

        let product_url = product
            .select(&link_selector)
            .next()
            .and_then(|e| e.value().attr("href"))
            .map(|href| {
                if href.starts_with("http") {
                    href.to_string()
                } else {
                    format!("https://www.hasbean.co.uk{}", href)
                }
            })
            .unwrap_or_else(|| url.to_string());

        if !name.is_empty() {
            coffees.push(Coffee {
                name,
                roaster: "Has Bean Coffee".to_string(),
                origin: None,
                region: None,
                tasting_notes: Vec::new(),
                price,
                url: product_url,
                in_stock: true,
                scraped_at: Utc::now().to_rfc3339(),
            });
        }
    }

    Ok(coffees)
}

async fn scrape_assembly() -> Result<Vec<Coffee>> {
    info!("Scraping Assembly Coffee");
    let url = "https://www.assemblycoffee.co.uk/collections/coffee";
    let body = reqwest::get(url).await?.text().await?;
    let document = Html::parse_document(&body);

    let product_selector = Selector::parse(".product-card").unwrap();
    let name_selector = Selector::parse(".product-card__title").unwrap();
    let price_selector = Selector::parse(".price").unwrap();

    let mut coffees = Vec::new();

    for product in document.select(&product_selector) {
        let name = product
            .select(&name_selector)
            .next()
            .map(|e| e.text().collect::<String>())
            .unwrap_or_default()
            .trim()
            .to_string();

        let price = product
            .select(&price_selector)
            .next()
            .map(|e| e.text().collect::<String>());

        if !name.is_empty() {
            coffees.push(Coffee {
                name,
                roaster: "Assembly Coffee".to_string(),
                origin: None,
                region: None,
                tasting_notes: Vec::new(),
                price,
                url: url.to_string(),
                in_stock: true,
                scraped_at: Utc::now().to_rfc3339(),
            });
        }
    }

    Ok(coffees)
}

async fn scrape_pact_coffee() -> Result<Vec<Coffee>> {
    info!("Scraping Pact Coffee");
    let url = "https://www.pactcoffee.com/coffees";
    let body = reqwest::get(url).await?.text().await?;
    let document = Html::parse_document(&body);

    let product_selector = Selector::parse(".product-card, [data-testid='product-card']").unwrap();
    let name_selector = Selector::parse("h3, .product-title, [data-testid='product-title']").unwrap();
    let price_selector = Selector::parse(".price, [data-testid='price']").unwrap();
    let origin_selector = Selector::parse(".origin, .product-origin").unwrap();

    let mut coffees = Vec::new();

    for product in document.select(&product_selector) {
        let name = product
            .select(&name_selector)
            .next()
            .map(|e| e.text().collect::<String>())
            .unwrap_or_default()
            .trim()
            .to_string();

        let price = product
            .select(&price_selector)
            .next()
            .map(|e| e.text().collect::<String>());

        let origin = product
            .select(&origin_selector)
            .next()
            .map(|e| e.text().collect::<String>().trim().to_string());

        if !name.is_empty() {
            coffees.push(Coffee {
                name,
                roaster: "Pact Coffee".to_string(),
                origin,
                region: None,
                tasting_notes: Vec::new(),
                price,
                url: url.to_string(),
                in_stock: true,
                scraped_at: Utc::now().to_rfc3339(),
            });
        }
    }

    Ok(coffees)
}

async fn scrape_origin_coffee() -> Result<Vec<Coffee>> {
    info!("Scraping Origin Coffee");
    let url = "https://www.origincoffee.co.uk/collections/coffee";
    let body = reqwest::get(url).await?.text().await?;
    let document = Html::parse_document(&body);

    let product_selector = Selector::parse(".product-item, .product-card").unwrap();
    let name_selector = Selector::parse(".product-title, h3").unwrap();
    let price_selector = Selector::parse(".price").unwrap();

    let mut coffees = Vec::new();

    for product in document.select(&product_selector) {
        let name = product
            .select(&name_selector)
            .next()
            .map(|e| e.text().collect::<String>())
            .unwrap_or_default()
            .trim()
            .to_string();

        let price = product
            .select(&price_selector)
            .next()
            .map(|e| e.text().collect::<String>());

        if !name.is_empty() {
            coffees.push(Coffee {
                name,
                roaster: "Origin Coffee".to_string(),
                origin: None,
                region: None,
                tasting_notes: Vec::new(),
                price,
                url: url.to_string(),
                in_stock: true,
                scraped_at: Utc::now().to_rfc3339(),
            });
        }
    }

    Ok(coffees)
}

async fn scrape_rave_coffee() -> Result<Vec<Coffee>> {
    info!("Scraping Rave Coffee");
    let url = "https://ravecoffee.co.uk/collections/coffee";
    let body = reqwest::get(url).await?.text().await?;
    let document = Html::parse_document(&body);

    let product_selector = Selector::parse(".product-item, .product").unwrap();
    let name_selector = Selector::parse(".product-title, h3").unwrap();
    let price_selector = Selector::parse(".price").unwrap();

    let mut coffees = Vec::new();

    for product in document.select(&product_selector) {
        let name = product
            .select(&name_selector)
            .next()
            .map(|e| e.text().collect::<String>())
            .unwrap_or_default()
            .trim()
            .to_string();

        let price = product
            .select(&price_selector)
            .next()
            .map(|e| e.text().collect::<String>());

        if !name.is_empty() {
            coffees.push(Coffee {
                name,
                roaster: "Rave Coffee".to_string(),
                origin: None,
                region: None,
                tasting_notes: Vec::new(),
                price,
                url: url.to_string(),
                in_stock: true,
                scraped_at: Utc::now().to_rfc3339(),
            });
        }
    }

    Ok(coffees)
}

async fn scrape_dark_arts() -> Result<Vec<Coffee>> {
    info!("Scraping Dark Arts Coffee");
    let url = "https://www.darkartscoffee.co.uk/collections/coffee";
    let body = reqwest::get(url).await?.text().await?;
    let document = Html::parse_document(&body);

    let product_selector = Selector::parse(".product-item").unwrap();
    let name_selector = Selector::parse(".product-title").unwrap();
    let price_selector = Selector::parse(".price").unwrap();

    let mut coffees = Vec::new();

    for product in document.select(&product_selector) {
        let name = product
            .select(&name_selector)
            .next()
            .map(|e| e.text().collect::<String>())
            .unwrap_or_default()
            .trim()
            .to_string();

        let price = product
            .select(&price_selector)
            .next()
            .map(|e| e.text().collect::<String>());

        if !name.is_empty() {
            coffees.push(Coffee {
                name,
                roaster: "Dark Arts Coffee".to_string(),
                origin: None,
                region: None,
                tasting_notes: Vec::new(),
                price,
                url: url.to_string(),
                in_stock: true,
                scraped_at: Utc::now().to_rfc3339(),
            });
        }
    }

    Ok(coffees)
}

async fn scrape_round_hill() -> Result<Vec<Coffee>> {
    info!("Scraping Round Hill Roastery");
    let url = "https://www.roundhillroastery.com/collections/coffee";
    let body = reqwest::get(url).await?.text().await?;
    let document = Html::parse_document(&body);

    let product_selector = Selector::parse(".product-item").unwrap();
    let name_selector = Selector::parse(".product-title").unwrap();
    let price_selector = Selector::parse(".price").unwrap();

    let mut coffees = Vec::new();

    for product in document.select(&product_selector) {
        let name = product
            .select(&name_selector)
            .next()
            .map(|e| e.text().collect::<String>())
            .unwrap_or_default()
            .trim()
            .to_string();

        let price = product
            .select(&price_selector)
            .next()
            .map(|e| e.text().collect::<String>());

        if !name.is_empty() {
            coffees.push(Coffee {
                name,
                roaster: "Round Hill Roastery".to_string(),
                origin: None,
                region: None,
                tasting_notes: Vec::new(),
                price,
                url: url.to_string(),
                in_stock: true,
                scraped_at: Utc::now().to_rfc3339(),
            });
        }
    }

    Ok(coffees)
}
