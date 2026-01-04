use anyhow::Result;
use axum::{routing::post, Router};
use chrono::Utc;
use firestore::FirestoreDb;
use scraper::{Html, Selector};
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use tracing::info;

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Coffee {
    name: String,
    roaster: String,
    origin: Option<String>,
    tasting_notes: Vec<String>,
    price: Option<String>,
    url: String,
    scraped_at: String,
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();

    let app = Router::new().route("/", post(scrape_handler));

    let addr = SocketAddr::from(([0, 0, 0, 0], 8080));
    info!("Starting server on {}", addr);

    axum::Server::bind(&addr)
        .serve(app.into_make_service())
        .await?;

    Ok(())
}

async fn scrape_handler() -> &'static str {
    match run_scraper().await {
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

async fn run_scraper() -> Result<()> {
    info!("Starting coffee scraper");

    let project_id = std::env::var("GCP_PROJECT_ID")?;
    let db = FirestoreDb::new(&project_id).await?;

    // List of UK specialty coffee roasters to scrape
    let scrapers = vec![
        scrape_square_mile,
        scrape_has_bean,
        scrape_assembly,
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
                tasting_notes: Vec::new(),
                price,
                url: url.to_string(),
                scraped_at: Utc::now().to_rfc3339(),
            });
        }
    }

    Ok(coffees)
}

async fn scrape_has_bean() -> Result<Vec<Coffee>> {
    info!("Scraping Has Bean Coffee");
    // Placeholder implementation
    Ok(Vec::new())
}

async fn scrape_assembly() -> Result<Vec<Coffee>> {
    info!("Scraping Assembly Coffee");
    // Placeholder implementation
    Ok(Vec::new())
}
