use anyhow::Result;
use axum::{routing::post, Router};
use chrono::Utc;
use firestore::FirestoreDb;
use scraper::{Html, Selector};
use serde::{Deserialize, Serialize};
use std::{net::SocketAddr, sync::Arc};
use tracing::info;

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Coffee {
    name: String,
    roaster: String,
    origin: Option<String>,
    region: Option<String>,
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

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();

    let project_id = std::env::var("GCP_PROJECT_ID")?;
    let db = Arc::new(FirestoreDb::new(&project_id).await?);

    let state = AppState { db };

    let app = Router::new()
        .route("/", post(scrape_handler))
        .with_state(state);

    let addr = SocketAddr::from(([0, 0, 0, 0], 8080));
    info!("Starting server on {}", addr);

    axum::Server::bind(&addr)
        .serve(app.into_make_service())
        .await?;

    Ok(())
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
    scrape_shopify_store(url, "Square Mile Coffee", "https://shop.squaremilecoffee.com").await
}

async fn scrape_has_bean() -> Result<Vec<Coffee>> {
    info!("Scraping Has Bean Coffee");
    let url = "https://www.hasbean.co.uk/collections/coffee";
    scrape_shopify_store(url, "Has Bean Coffee", "https://www.hasbean.co.uk").await
}

async fn scrape_assembly() -> Result<Vec<Coffee>> {
    info!("Scraping Assembly Coffee");
    let url = "https://www.assemblycoffee.co.uk/collections/coffee";
    scrape_shopify_store(url, "Assembly Coffee", "https://www.assemblycoffee.co.uk").await
}

async fn scrape_pact_coffee() -> Result<Vec<Coffee>> {
    info!("Scraping Pact Coffee");
    let url = "https://www.pactcoffee.com/coffees";

    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        .build()?;

    let body = client.get(url).send().await?.text().await?;
    let document = Html::parse_document(&body);

    // Pact Coffee uses React, try multiple selectors
    let product_selectors = vec![
        ".product-card",
        "[data-component='ProductCard']",
        "article",
        "div[class*='product']",
    ];

    let mut coffees = Vec::new();

    for selector_str in product_selectors {
        if let Ok(product_selector) = Selector::parse(selector_str) {
            for product in document.select(&product_selector) {
                // Try multiple name selectors
                let name = ["h3", "h2", ".product-title", ".product__title", "[class*='title']"]
                    .iter()
                    .find_map(|sel| {
                        Selector::parse(sel).ok().and_then(|s| {
                            product.select(&s).next().map(|e| {
                                e.text().collect::<String>().trim().to_string()
                            })
                        })
                    })
                    .unwrap_or_default();

                if name.is_empty() || coffees.iter().any(|c: &Coffee| c.name == name) {
                    continue;
                }

                let price = [".price", "[class*='price']", ".money"]
                    .iter()
                    .find_map(|sel| {
                        Selector::parse(sel).ok().and_then(|s| {
                            product.select(&s).next().map(|e| {
                                e.text().collect::<String>().trim().to_string()
                            })
                        })
                    });

                let product_url = ["a"]
                    .iter()
                    .find_map(|sel| {
                        Selector::parse(sel).ok().and_then(|s| {
                            product.select(&s).next().and_then(|e| e.value().attr("href"))
                        })
                    })
                    .map(|href| {
                        if href.starts_with("http") {
                            href.to_string()
                        } else {
                            format!("https://www.pactcoffee.com{}", href)
                        }
                    })
                    .unwrap_or_else(|| url.to_string());

                // Extract region/origin from name (common pattern: "Ethiopia Guji")
                let (origin, region) = extract_origin_from_name(&name);

                coffees.push(Coffee {
                    name,
                    roaster: "Pact Coffee".to_string(),
                    origin,
                    region,
                    tasting_notes: Vec::new(),
                    price,
                    url: product_url,
                    in_stock: true,
                    scraped_at: Utc::now().to_rfc3339(),
                });
            }

            if !coffees.is_empty() {
                break;
            }
        }
    }

    Ok(coffees)
}

// Helper function to extract origin/region from product name
fn extract_origin_from_name(name: &str) -> (Option<String>, Option<String>) {
    let origins = vec![
        ("Ethiopia", "Ethiopia"),
        ("Kenya", "Kenya"),
        ("Colombia", "Colombia"),
        ("Brazil", "Brazil"),
        ("Guatemala", "Guatemala"),
        ("Rwanda", "Rwanda"),
        ("Burundi", "Burundi"),
        ("Peru", "Peru"),
        ("Honduras", "Honduras"),
        ("Costa Rica", "Costa Rica"),
        ("El Salvador", "El Salvador"),
        ("Nicaragua", "Nicaragua"),
        ("Panama", "Panama"),
        ("Mexico", "Mexico"),
        ("Indonesia", "Indonesia"),
        ("Yemen", "Yemen"),
        ("Tanzania", "Tanzania"),
        ("Uganda", "Uganda"),
    ];

    for (origin, region) in origins {
        if name.to_lowercase().contains(&origin.to_lowercase()) {
            return (Some(origin.to_string()), Some(region.to_string()));
        }
    }

    (None, None)
}

async fn scrape_origin_coffee() -> Result<Vec<Coffee>> {
    info!("Scraping Origin Coffee");
    let url = "https://www.origincoffee.co.uk/collections/coffee";

    let coffees = scrape_shopify_store(
        url,
        "Origin Coffee",
        "https://www.origincoffee.co.uk",
    )
    .await?;

    Ok(coffees)
}

// Generic Shopify scraper that works for most UK roasters
async fn scrape_shopify_store(
    collection_url: &str,
    roaster_name: &str,
    base_url: &str,
) -> Result<Vec<Coffee>> {
    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        .build()?;

    let body = client.get(collection_url).send().await?.text().await?;
    let document = Html::parse_document(&body);

    // Standard Shopify selectors
    let product_selectors = vec![
        ".grid__item",
        ".product-item",
        ".product-card",
        ".product-grid-item",
        "div[class*='product']",
    ];

    let mut coffees = Vec::new();

    for selector_str in product_selectors {
        if let Ok(product_selector) = Selector::parse(selector_str) {
            for product in document.select(&product_selector) {
                let name = [
                    "h3",
                    "h2",
                    ".product-title",
                    ".product__title",
                    ".card__title",
                    "a.full-unstyled-link",
                ]
                .iter()
                .find_map(|sel| {
                    Selector::parse(sel).ok().and_then(|s| {
                        product.select(&s).next().map(|e| {
                            e.text().collect::<String>().trim().to_string()
                        })
                    })
                })
                .unwrap_or_default();

                if name.is_empty() || coffees.iter().any(|c: &Coffee| c.name == name) {
                    continue;
                }

                let price = [".price", ".price__regular", ".money", "span[class*='price']"]
                    .iter()
                    .find_map(|sel| {
                        Selector::parse(sel).ok().and_then(|s| {
                            product.select(&s).next().map(|e| {
                                e.text().collect::<String>().trim().to_string()
                            })
                        })
                    });

                let product_url = ["a"]
                    .iter()
                    .find_map(|sel| {
                        Selector::parse(sel).ok().and_then(|s| {
                            product.select(&s).next().and_then(|e| e.value().attr("href"))
                        })
                    })
                    .map(|href| {
                        if href.starts_with("http") {
                            href.to_string()
                        } else {
                            format!("{}{}", base_url, href)
                        }
                    })
                    .unwrap_or_else(|| collection_url.to_string());

                let (origin, region) = extract_origin_from_name(&name);

                coffees.push(Coffee {
                    name,
                    roaster: roaster_name.to_string(),
                    origin,
                    region,
                    tasting_notes: Vec::new(),
                    price,
                    url: product_url,
                    in_stock: true,
                    scraped_at: Utc::now().to_rfc3339(),
                });
            }

            if !coffees.is_empty() {
                break;
            }
        }
    }

    Ok(coffees)
}

async fn scrape_rave_coffee() -> Result<Vec<Coffee>> {
    info!("Scraping Rave Coffee");
    let url = "https://ravecoffee.co.uk/collections/coffee";
    scrape_shopify_store(url, "Rave Coffee", "https://ravecoffee.co.uk").await
}

async fn scrape_dark_arts() -> Result<Vec<Coffee>> {
    info!("Scraping Dark Arts Coffee");
    let url = "https://www.darkartscoffee.co.uk/collections/coffee";
    scrape_shopify_store(url, "Dark Arts Coffee", "https://www.darkartscoffee.co.uk").await
}

async fn scrape_round_hill() -> Result<Vec<Coffee>> {
    info!("Scraping Round Hill Roastery");
    let url = "https://www.roundhillroastery.com/collections/coffee";
    scrape_shopify_store(url, "Round Hill Roastery", "https://www.roundhillroastery.com").await
}
