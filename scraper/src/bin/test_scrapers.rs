use anyhow::Result;
use scraper::{Html, Selector};

#[tokio::main]
async fn main() -> Result<()> {
    println!("Testing UK Coffee Scrapers\n");

    test_pact_coffee().await?;
    test_origin_coffee().await?;
    test_rave_coffee().await?;

    Ok(())
}

async fn test_pact_coffee() -> Result<()> {
    println!("=== PACT COFFEE ===");
    let url = "https://www.pactcoffee.com/coffees";
    let body = reqwest::get(url).await?.text().await?;
    let document = Html::parse_document(&body);

    // Try different selectors
    let selectors = vec![
        ".product-card",
        "[data-testid='product-card']",
        ".product",
        "article",
        "div[class*='product']",
    ];

    for selector_str in selectors {
        if let Ok(selector) = Selector::parse(selector_str) {
            let count = document.select(&selector).count();
            if count > 0 {
                println!("  Selector '{}': {} products found", selector_str, count);

                // Try to get first product name
                let first = document.select(&selector).next();
                if let Some(product) = first {
                    let html = product.html();
                    println!("  First product HTML (first 500 chars):\n{}\n", &html[..html.len().min(500)]);
                }
            }
        }
    }
    println!();
    Ok(())
}

async fn test_origin_coffee() -> Result<()> {
    println!("=== ORIGIN COFFEE ===");
    let url = "https://www.origincoffee.co.uk/collections/coffee";
    let body = reqwest::get(url).await?.text().await?;
    let document = Html::parse_document(&body);

    let selectors = vec![
        ".product-item",
        ".product-card",
        ".product",
        "div[class*='product']",
    ];

    for selector_str in selectors {
        if let Ok(selector) = Selector::parse(selector_str) {
            let count = document.select(&selector).count();
            if count > 0 {
                println!("  Selector '{}': {} products found", selector_str, count);

                let first = document.select(&selector).next();
                if let Some(product) = first {
                    let html = product.html();
                    println!("  First product HTML (first 500 chars):\n{}\n", &html[..html.len().min(500)]);
                }
            }
        }
    }
    println!();
    Ok(())
}

async fn test_rave_coffee() -> Result<()> {
    println!("=== RAVE COFFEE ===");
    let url = "https://ravecoffee.co.uk/collections/coffee";
    let body = reqwest::get(url).await?.text().await?;
    let document = Html::parse_document(&body);

    let selectors = vec![
        ".product-item",
        ".product",
        "div[class*='product']",
        ".grid-item",
    ];

    for selector_str in selectors {
        if let Ok(selector) = Selector::parse(selector_str) {
            let count = document.select(&selector).count();
            if count > 0 {
                println!("  Selector '{}': {} products found", selector_str, count);

                let first = document.select(&selector).next();
                if let Some(product) = first {
                    let html = product.html();
                    println!("  First product HTML (first 500 chars):\n{}\n", &html[..html.len().min(500)]);
                }
            }
        }
    }
    println!();
    Ok(())
}
