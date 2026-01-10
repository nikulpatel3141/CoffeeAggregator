use anyhow::Result;
use scraper::{Html, Selector};

#[tokio::main]
async fn main() -> Result<()> {
    println!("\n🔍 Testing Coffee Scrapers Against Real Sites\n");
    println!("═══════════════════════════════════════════════\n");

    let mut total_coffees = 0;
    let mut successful_scrapers = 0;
    let mut failed_scrapers = Vec::new();

    // Test all 8 roasters
    let roasters = vec![
        ("Pact Coffee", "https://www.pactcoffee.com/coffees"),
        ("Origin Coffee", "https://www.origincoffee.co.uk/collections/coffee"),
        ("Rave Coffee", "https://ravecoffee.co.uk/collections/coffee"),
        ("Square Mile", "https://shop.squaremilecoffee.com/collections/coffee"),
        ("Has Bean", "https://www.hasbean.co.uk/collections/coffee"),
        ("Assembly", "https://www.assemblycoffee.co.uk/collections/coffee"),
        ("Dark Arts", "https://www.darkartscoffee.co.uk/collections/coffee"),
        ("Round Hill", "https://www.roundhillroastery.com/collections/coffee"),
    ];

    for (name, url) in roasters {
        print!("Testing {:15} ... ", name);

        match test_roaster_website(url).await {
            Ok((count, selector_used)) => {
                if count > 0 {
                    println!("✅ {} products (selector: {})", count, selector_used);
                    total_coffees += count;
                    successful_scrapers += 1;
                } else {
                    println!("⚠️  0 products (selectors may need updating)");
                    failed_scrapers.push(name);
                }
            }
            Err(e) => {
                println!("❌ {}", e);
                failed_scrapers.push(name);
            }
        }
    }

    println!("\n═══════════════════════════════════════════════");
    println!("📊 Results Summary:");
    println!("  ✅ Successful: {}/8 roasters", successful_scrapers);
    println!("  📦 Total products: {}", total_coffees);
    println!("  📈 Average: {:.1} products/roaster", total_coffees as f32 / successful_scrapers.max(1) as f32);

    if !failed_scrapers.is_empty() {
        println!("\n  ❌ Failed: {}", failed_scrapers.join(", "));
        println!("\n⚠️  Possible issues:");
        println!("     • Website structure changed (update selectors)");
        println!("     • Network/timeout issues");
        println!("     • Rate limiting");
    } else {
        println!("\n🎉 All scrapers working perfectly!");
    }

    println!("═══════════════════════════════════════════════\n");

    if successful_scrapers == 0 {
        anyhow::bail!("All scrapers failed - check network connection");
    }

    if failed_scrapers.len() > 4 {
        anyhow::bail!("More than half of scrapers failed");
    }

    Ok(())
}

async fn test_roaster_website(url: &str) -> Result<(usize, &'static str)> {
    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        .timeout(std::time::Duration::from_secs(15))
        .build()?;

    let response = client.get(url).send().await?;

    if !response.status().is_success() {
        anyhow::bail!("HTTP {}", response.status());
    }

    let body = response.text().await?;
    let document = Html::parse_document(&body);

    // Try multiple common Shopify selectors
    let selectors = vec![
        ".grid__item",
        ".product-item",
        ".product-card",
        ".product-grid-item",
        "div[class*='ProductItem']",
        "article[class*='product']",
    ];

    for selector_str in selectors {
        if let Ok(selector) = Selector::parse(selector_str) {
            let products: Vec<_> = document.select(&selector).collect();
            if products.len() > 0 {
                // Verify these look like actual products (have a title)
                let title_selectors = vec!["h3", "h2", ".product-title", ".card__title"];
                let mut valid_count = 0;

                for product in &products {
                    for title_sel in &title_selectors {
                        if let Ok(ts) = Selector::parse(title_sel) {
                            if product.select(&ts).next().is_some() {
                                valid_count += 1;
                                break;
                            }
                        }
                    }
                }

                if valid_count > 0 {
                    return Ok((valid_count, selector_str));
                }
            }
        }
    }

    // If we got here, no products found
    Ok((0, "none"))
}
