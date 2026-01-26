use anyhow::Result;
use chrono::Utc;
use coffee_common::Coffee;
use firestore::FirestoreDb;
use scraper::{Html, Selector};
use tracing::info;

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize logging
    tracing_subscriber::fmt()
        .with_target(false)
        .with_thread_ids(false)
        .with_file(false)
        .init();

    info!("🚀 Coffee Scraper starting...");

    // Get GCP project ID
    let project_id = std::env::var("GCP_PROJECT_ID")
        .map_err(|_| anyhow::anyhow!("GCP_PROJECT_ID environment variable not set"))?;

    info!("📊 Using GCP project: {}", project_id);

    // Connect to Firestore
    info!("🔌 Connecting to Firestore...");
    let db = FirestoreDb::new(&project_id).await?;
    info!("✅ Connected to Firestore");

    // Run the scraper
    run_scraper(&db).await?;

    info!("✅ Scraping completed successfully");

    Ok(())
}

async fn run_scraper(db: &FirestoreDb) -> Result<()> {
    info!("Starting coffee scraper");

    let mut all_coffees = Vec::new();
    let mut successfully_scraped_roasters = std::collections::HashSet::new();

    // Run all UK specialty coffee roaster scrapers
    let scraper_results = vec![
        scrape_origin_coffee().await,
        scrape_rave_coffee().await,
        scrape_has_bean().await,
        scrape_dark_arts().await,
        scrape_round_hill().await,
        scrape_volcano().await,
        scrape_balance().await,
        scrape_union().await,
        scrape_hermanos().await,
        scrape_monmouth().await,
        scrape_gotham().await,
        scrape_coffee_compass().await,
    ];

    for result in scraper_results {
        match result {
            Ok(mut coffees) => {
                if !coffees.is_empty() {
                    // Track which roaster succeeded by getting the roaster name from first coffee
                    let roaster_name = coffees[0].roaster.clone();
                    successfully_scraped_roasters.insert(roaster_name.clone());
                    info!("✓ Successfully scraped {} products from {}", coffees.len(), roaster_name);
                    all_coffees.append(&mut coffees);
                } else {
                    tracing::warn!("Scraper returned 0 products (may have failed silently)");
                }
            }
            Err(e) => tracing::error!("✗ Scraper failed: {}", e),
        }
    }

    info!("Successfully scraped {} total roasters", successfully_scraped_roasters.len());
    info!("Roasters scraped: {:?}", successfully_scraped_roasters);

    // Filter out bundles, equipment, tasting sets, and other unwanted items
    all_coffees.retain(|coffee| {
        let name_lower = coffee.name.to_lowercase();

        // Filter out bundles and subscriptions
        if name_lower.contains("bundle") || name_lower.contains("subscription") {
            return false;
        }

        // Filter out samples and tasting sets
        if name_lower.contains("sample") || name_lower.contains("taster") || name_lower.contains("tasting set") {
            return false;
        }

        // Filter out equipment (V60, Chemex, filters, servers, etc.)
        if name_lower.contains("v60") || name_lower.contains("chemex") || name_lower.contains("filter")
            || name_lower.contains("paper") || name_lower.contains("server") || name_lower.contains("mug")
            || name_lower.contains("cup") || name_lower.contains("dripper") || name_lower.contains("brewer")
            || name_lower.contains("grinder") || name_lower.contains("kettle") || name_lower.contains("tamper")
            || name_lower.contains("jug") || name_lower.contains("carafe") || name_lower.contains("aeropress")
            || name_lower.contains("cafetiere") || name_lower.contains("french press") || name_lower.contains("moka pot")
            || name_lower.contains("scales") || name_lower.contains("scale") || name_lower.contains("thermometer")
            || name_lower.contains("pitcher") || name_lower.contains("bottle") || name_lower.contains("flask")
            || name_lower.contains("pour over set") || name_lower.contains("brewing") || name_lower.contains("equipment")
            || name_lower.contains("accessories") || name_lower.contains("storage") || name_lower.contains("canister")
            || name_lower.contains("spoon") || name_lower.contains("scoop") || name_lower.contains("cloth")
            || name_lower.contains("towel") || name_lower.contains("mat") || name_lower.contains("tray") {
            return false;
        }

        // Filter out coffee pods
        if name_lower.contains(" pod") || name_lower.contains("pods") || name_lower.contains("capsule") {
            return false;
        }

        // Filter out blends (conservatively - only if explicitly labeled)
        // We check for "blend" in name but NOT if it's part of another word like "blended"
        if name_lower.contains(" blend") || name_lower.starts_with("blend") || name_lower.ends_with("blend") {
            return false;
        }

        // Filter out gift items and merchandise
        if name_lower.contains("gift card") || name_lower.contains("gift box") || name_lower.contains("voucher")
            || name_lower.contains("merchandise") || name_lower.contains("t-shirt") || name_lower.contains("tote") {
            return false;
        }

        true
    });

    info!("After filtering unwanted items: {} coffees", all_coffees.len());

    // Filter coffees by price (max £50)
    all_coffees.retain(|coffee| {
        if let Some(price_str) = &coffee.price {
            // Extract numeric price from string like "£12.50"
            let numeric_price = price_str
                .trim_start_matches('£')
                .trim()
                .parse::<f64>()
                .unwrap_or(0.0);
            numeric_price > 0.0 && numeric_price <= 50.0
        } else {
            false // Filter out coffees without prices
        }
    });

    info!("After price filtering: {} coffees under £50", all_coffees.len());

    if all_coffees.is_empty() {
        tracing::error!("No coffees scraped! Aborting to preserve existing data");
        anyhow::bail!("No coffees scraped - not overwriting existing data");
    }

    // Step 1: Write all coffees to staging collection
    // Note: Using .update() will overwrite any existing staging data
    info!("Writing {} coffees to staging collection", all_coffees.len());
    let mut insert_errors = 0;

    for (index, coffee) in all_coffees.iter().enumerate() {
        // Create simple, clean document ID
        let doc_id = format!(
            "{}__{}",
            coffee.roaster
                .replace(" ", "_")
                .replace("/", "_")
                .replace(".", "_")
                .to_lowercase(),
            coffee.name
                .replace(" ", "_")
                .replace("/", "_")
                .replace(".", "_")
                .to_lowercase()
        );

        if let Err(e) = db.fluent()
            .update()
            .in_col("coffees_staging")
            .document_id(&doc_id)
            .object(coffee)
            .execute::<()>()
            .await
        {
            tracing::warn!("Failed to write coffee to staging {}: {}", doc_id, e);
            insert_errors += 1;
        }

        if (index + 1) % 50 == 0 {
            info!("Staged {}/{} coffees", index + 1, all_coffees.len());
        }
    }

    if insert_errors > 0 {
        tracing::error!("{} errors inserting to staging - aborting", insert_errors);
        anyhow::bail!("Failed to insert all coffees to staging");
    }

    info!("Successfully staged all {} coffees", all_coffees.len());

    // Step 2: Delete old production data (only for successfully scraped roasters)
    info!("Clearing production coffee data for successfully scraped roasters");

    // Get all coffee objects from production (we don't need the document IDs for deletion)
    let prod_coffees: Vec<Coffee> = match db
        .fluent()
        .select()
        .from("coffees")
        .obj()
        .query()
        .await
    {
        Ok(coffees) => coffees,
        Err(e) => {
            info!("No existing production data to clear ({})", e);
            Vec::new()
        }
    };

    if !prod_coffees.is_empty() {
        // Filter to only delete products from roasters that were successfully scraped
        let coffees_to_delete: Vec<&Coffee> = prod_coffees
            .iter()
            .filter(|c| successfully_scraped_roasters.contains(&c.roaster))
            .collect();

        info!("Deleting {} old production documents from {} successfully scraped roasters",
            coffees_to_delete.len(), successfully_scraped_roasters.len());

        // Log which roasters are being preserved
        let preserved_roasters: std::collections::HashSet<_> = prod_coffees
            .iter()
            .filter(|c| !successfully_scraped_roasters.contains(&c.roaster))
            .map(|c| &c.roaster)
            .collect();

        if !preserved_roasters.is_empty() {
            info!("Preserving {} products from {} roasters that weren't scraped this run: {:?}",
                prod_coffees.len() - coffees_to_delete.len(),
                preserved_roasters.len(),
                preserved_roasters);
        }

        // Delete only the filtered documents by recreating deterministic IDs
        for coffee in coffees_to_delete {
            let doc_id = format!(
                "{}__{}",
                coffee.roaster
                    .replace(" ", "_")
                    .replace("/", "_")
                    .replace(".", "_")
                    .to_lowercase(),
                coffee.name
                    .replace(" ", "_")
                    .replace("/", "_")
                    .replace(".", "_")
                    .to_lowercase()
            );

            if let Err(e) = db.fluent()
                .delete()
                .from("coffees")
                .document_id(&doc_id)
                .execute()
                .await
            {
                tracing::warn!("Failed to delete production document {}: {}", doc_id, e);
            }
        }
        info!("Cleared production collection for successfully scraped roasters");
    } else {
        info!("No production data to clear");
    }

    // Step 3: Copy staging to production
    info!("Copying staging to production");
    let staging_coffees: Vec<Coffee> = db
        .fluent()
        .select()
        .from("coffees_staging")
        .obj()
        .query()
        .await?;

    let mut copy_errors = 0;
    for (index, coffee) in staging_coffees.iter().enumerate() {
        // Recreate the deterministic document ID
        let doc_id = format!(
            "{}__{}",
            coffee.roaster
                .replace(" ", "_")
                .replace("/", "_")
                .replace(".", "_")
                .to_lowercase(),
            coffee.name
                .replace(" ", "_")
                .replace("/", "_")
                .replace(".", "_")
                .to_lowercase()
        );

        if let Err(e) = db.fluent()
            .insert()
            .into("coffees")
            .document_id(&doc_id)
            .object(coffee)
            .execute::<()>()
            .await
        {
            tracing::error!("Failed to copy coffee to production {}: {}", doc_id, e);
            copy_errors += 1;
        }

        if (index + 1) % 50 == 0 {
            info!("Copied {}/{} coffees to production", index + 1, staging_coffees.len());
        }
    }

    if copy_errors > 0 {
        tracing::error!("{} errors copying to production!", copy_errors);
        anyhow::bail!("Failed to copy all coffees to production - data may be in staging");
    }

    info!("Successfully copied {} coffees to production", staging_coffees.len());

    // Step 4: Clear staging collection
    info!("Clearing staging collection");
    for coffee in &staging_coffees {
        let doc_id = format!(
            "{}__{}",
            coffee.roaster
                .replace(" ", "_")
                .replace("/", "_")
                .replace(".", "_")
                .to_lowercase(),
            coffee.name
                .replace(" ", "_")
                .replace("/", "_")
                .replace(".", "_")
                .to_lowercase()
        );

        if let Err(e) = db.fluent()
            .delete()
            .from("coffees_staging")
            .document_id(&doc_id)
            .execute()
            .await
        {
            tracing::warn!("Failed to delete staging document {}: {}", doc_id, e);
        }
    }

    info!("Successfully updated production with {} new coffees from {} roasters",
        staging_coffees.len(), successfully_scraped_roasters.len());

    info!("Scraping completed");
    Ok(())
}

// Helper function to select the best variant (prefer 250g, otherwise smallest weight)
fn select_best_variant(variants: &Vec<serde_json::Value>) -> (Option<String>, Option<String>) {
    if variants.is_empty() {
        return (None, None);
    }

    #[derive(Debug)]
    struct VariantInfo {
        price: String,
        weight: String,
        weight_grams: i32,
    }

    let mut variant_infos = Vec::new();

    for variant in variants {
        let price = variant.get("price")
            .and_then(|p| p.as_str())
            .map(|p| format!("£{}", p));

        // Extract weight from title, option1, option2, or option3
        let weight_str = variant.get("title")
            .and_then(|t| t.as_str())
            .or_else(|| variant.get("option1").and_then(|o| o.as_str()))
            .or_else(|| variant.get("option2").and_then(|o| o.as_str()))
            .or_else(|| variant.get("option3").and_then(|o| o.as_str()))
            .unwrap_or("");

        // Parse weight in grams
        let weight_grams = extract_weight_in_grams(weight_str);

        if let Some(p) = price {
            variant_infos.push(VariantInfo {
                price: p,
                weight: weight_str.to_string(),
                weight_grams,
            });
        }
    }

    if variant_infos.is_empty() {
        return (None, None);
    }

    // Prefer 250g variant
    if let Some(preferred) = variant_infos.iter().find(|v| v.weight_grams == 250) {
        return (Some(preferred.price.clone()), Some(normalize_weight(&preferred.weight)));
    }

    // Otherwise, select smallest weight
    variant_infos.sort_by_key(|v| v.weight_grams);
    let smallest = &variant_infos[0];
    (Some(smallest.price.clone()), Some(normalize_weight(&smallest.weight)))
}

// Extract weight in grams from variant title/option
fn extract_weight_in_grams(text: &str) -> i32 {
    let text_lower = text.to_lowercase();

    // Look for weight patterns like "250g", "250 g", "1kg", "1 kg"
    let words: Vec<&str> = text_lower.split_whitespace().collect();

    for word in words {
        // Try to find a number followed by g or kg
        if let Some(pos) = word.find("kg") {
            if let Ok(num) = word[..pos].parse::<f32>() {
                return (num * 1000.0) as i32;
            }
        } else if let Some(pos) = word.find('g') {
            if let Ok(num) = word[..pos].parse::<f32>() {
                return num as i32;
            }
        }
    }

    // Default to a large value so it's not preferred
    999999
}

// Normalize weight display (e.g., "250 grams" -> "250g", "1 kilogram" -> "1kg")
fn normalize_weight(text: &str) -> String {
    let text_lower = text.to_lowercase();
    let words: Vec<&str> = text_lower.split_whitespace().collect();

    for i in 0..words.len() {
        let word = words[i];

        // Check if this word is a number
        if let Ok(num) = word.parse::<f32>() {
            // Check the next word for unit
            if i + 1 < words.len() {
                let next = words[i + 1];
                if next.starts_with("kg") || next.starts_with("kilo") {
                    return format!("{}kg", num);
                } else if next.starts_with("g") || next.starts_with("gram") {
                    return format!("{}g", num);
                }
            }
        }

        // Check if number and unit are in same word (e.g., "250g")
        if let Some(pos) = word.find("kg") {
            if let Ok(num) = word[..pos].parse::<f32>() {
                return format!("{}kg", num);
            }
        } else if let Some(pos) = word.find('g') {
            if let Ok(num) = word[..pos].parse::<f32>() {
                return format!("{}g", num);
            }
        }
    }

    text.to_string()
}

// Generic Shopify JSON API scraper - more reliable than HTML scraping
async fn scrape_shopify_json(
    json_url: &str,
    roaster_name: &str,
    base_url: &str,
) -> Result<Vec<Coffee>> {
    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .timeout(std::time::Duration::from_secs(30))
        .build()?;

    // Add limit parameter to get more products
    let url_with_limit = if json_url.contains('?') {
        format!("{}&limit=250", json_url)
    } else {
        format!("{}?limit=250", json_url)
    };

    let response = client
        .get(&url_with_limit)
        .header("Accept", "application/json")
        .header("Accept-Language", "en-GB,en;q=0.9")
        .header("Referer", base_url)
        .send()
        .await?;

    if !response.status().is_success() {
        anyhow::bail!("Failed to fetch {} products: HTTP {}", roaster_name, response.status());
    }

    let json: serde_json::Value = response.json().await?;
    let mut coffees = Vec::new();

    if let Some(products) = json.get("products").and_then(|p| p.as_array()) {
        for product in products {
            let name = product.get("title")
                .and_then(|t| t.as_str())
                .unwrap_or("")
                .to_string();

            if name.is_empty() {
                continue;
            }

            // Extract best variant (prefer 250g, otherwise smallest weight)
            let (price, weight) = if let Some(variants) = product.get("variants").and_then(|v| v.as_array()) {
                select_best_variant(variants)
            } else {
                (None, None)
            };

            let product_url = product.get("handle")
                .and_then(|h| h.as_str())
                .map(|h| {
                    if h.starts_with("http") {
                        h.to_string()
                    } else {
                        format!("{}/products/{}", base_url, h)
                    }
                })
                .unwrap_or_else(|| base_url.to_string());

            let (origin, region) = extract_origin_from_name(&name);

            coffees.push(Coffee {
                name,
                roaster: roaster_name.to_string(),
                origin,
                region,
                tasting_notes: Vec::new(),
                price,
                weight,
                url: product_url,
                in_stock: true,
                scraped_at: Utc::now().to_rfc3339(),
            });
        }
    }

    Ok(coffees)
}

async fn scrape_has_bean() -> Result<Vec<Coffee>> {
    info!("Scraping Has Bean Coffee");

    // Try Shopify JSON API first
    let json_url = "https://www.hasbean.co.uk/collections/coffee/products.json";
    match scrape_shopify_json(json_url, "Has Bean Coffee", "https://www.hasbean.co.uk").await {
        Ok(coffees) if !coffees.is_empty() => return Ok(coffees),
        _ => {
            // Fallback to HTML scraping
            let url = "https://www.hasbean.co.uk/collections/coffee";
            scrape_shopify_store(url, "Has Bean Coffee", "https://www.hasbean.co.uk").await
        }
    }
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

    // Try Shopify JSON API first
    let json_url = "https://www.origincoffee.co.uk/collections/coffee/products.json";
    match scrape_shopify_json(json_url, "Origin Coffee", "https://www.origincoffee.co.uk").await {
        Ok(coffees) if !coffees.is_empty() => Ok(coffees),
        _ => {
            // Fallback to HTML scraping
            let url = "https://www.origincoffee.co.uk/collections/coffee";
            scrape_shopify_store(url, "Origin Coffee", "https://www.origincoffee.co.uk").await
        }
    }
}

// Generic Shopify scraper that works for most UK roasters
async fn scrape_shopify_store(
    collection_url: &str,
    roaster_name: &str,
    base_url: &str,
) -> Result<Vec<Coffee>> {
    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .timeout(std::time::Duration::from_secs(30))
        .build()?;

    let response = client
        .get(collection_url)
        .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
        .header("Accept-Language", "en-GB,en;q=0.9")
        .header("Referer", base_url)
        .send()
        .await?;

    let body = response.text().await?;
    let document = Html::parse_document(&body);

    // Standard Shopify and e-commerce selectors - comprehensive list
    let product_selectors = vec![
        ".grid__item",
        ".product-item",
        ".product-card",
        ".product-grid-item",
        "div[class*='ProductItem']",
        "div[class*='product-item']",
        "div[class*='product-card']",
        "article[class*='product']",
        "li[class*='product']",
        ".card-wrapper",
        ".card__inner",
        "[data-product]",
        "[data-product-id]",
        "div[class*='grid-item']",
        "div[class*='Card']",
    ];

    let mut coffees = Vec::new();

    for selector_str in product_selectors {
        if let Ok(product_selector) = Selector::parse(selector_str) {
            for product in document.select(&product_selector) {
                let name = [
                    "h3",
                    "h2",
                    "h4",
                    ".product-title",
                    ".product__title",
                    ".card__title",
                    ".card-title",
                    "a.full-unstyled-link",
                    "[class*='title']",
                    "[class*='Title']",
                    "a[href*='/products/']",
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
                    weight: None,  // HTML scraping doesn't extract weight reliably
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

    // Try Shopify JSON API first
    let json_url = "https://ravecoffee.co.uk/collections/coffee/products.json";
    match scrape_shopify_json(json_url, "Rave Coffee", "https://ravecoffee.co.uk").await {
        Ok(coffees) if !coffees.is_empty() => return Ok(coffees),
        _ => {
            // Fallback to HTML scraping
            let url = "https://ravecoffee.co.uk/collections/coffee";
            scrape_shopify_store(url, "Rave Coffee", "https://ravecoffee.co.uk").await
        }
    }
}

async fn scrape_dark_arts() -> Result<Vec<Coffee>> {
    info!("Scraping Dark Arts Coffee");

    // Try Shopify JSON API first
    let json_url = "https://www.darkartscoffee.co.uk/collections/coffee/products.json";
    match scrape_shopify_json(json_url, "Dark Arts Coffee", "https://www.darkartscoffee.co.uk").await {
        Ok(coffees) if !coffees.is_empty() => return Ok(coffees),
        _ => {
            // Fallback to HTML scraping
            let url = "https://www.darkartscoffee.co.uk/collections/coffee";
            scrape_shopify_store(url, "Dark Arts Coffee", "https://www.darkartscoffee.co.uk").await
        }
    }
}

async fn scrape_round_hill() -> Result<Vec<Coffee>> {
    info!("Scraping Round Hill Roastery");

    // Try Shopify JSON API first
    let json_url = "https://www.roundhillroastery.com/collections/coffee/products.json";
    match scrape_shopify_json(json_url, "Round Hill Roastery", "https://www.roundhillroastery.com").await {
        Ok(coffees) if !coffees.is_empty() => return Ok(coffees),
        _ => {
            // Fallback to HTML scraping
            let url = "https://www.roundhillroastery.com/collections/coffee";
            scrape_shopify_store(url, "Round Hill Roastery", "https://www.roundhillroastery.com").await
        }
    }
}

async fn scrape_volcano() -> Result<Vec<Coffee>> {
    info!("Scraping Volcano Coffee Works");

    // Try Shopify JSON API first
    let json_url = "https://volcanocoffeeworks.com/collections/all-coffee/products.json";
    match scrape_shopify_json(json_url, "Volcano Coffee Works", "https://volcanocoffeeworks.com").await {
        Ok(coffees) if !coffees.is_empty() => return Ok(coffees),
        _ => {
            // Fallback to HTML scraping
            let url = "https://volcanocoffeeworks.com/collections/all-coffee";
            scrape_shopify_store(url, "Volcano Coffee Works", "https://volcanocoffeeworks.com").await
        }
    }
}

async fn scrape_balance() -> Result<Vec<Coffee>> {
    info!("Scraping Balance Coffee");

    // Try Shopify JSON API first
    let json_url = "https://balancecoffee.co.uk/collections/speciality-coffee/products.json";
    match scrape_shopify_json(json_url, "Balance Coffee", "https://balancecoffee.co.uk").await {
        Ok(coffees) if !coffees.is_empty() => return Ok(coffees),
        _ => {
            // Fallback to HTML scraping
            let url = "https://balancecoffee.co.uk/collections/speciality-coffee";
            scrape_shopify_store(url, "Balance Coffee", "https://balancecoffee.co.uk").await
        }
    }
}

async fn scrape_union() -> Result<Vec<Coffee>> {
    info!("Scraping Union Coffee Roasters");

    // Try Shopify JSON API first
    let json_url = "https://unionroasted.com/collections/single-origins/products.json";
    match scrape_shopify_json(json_url, "Union Coffee Roasters", "https://unionroasted.com").await {
        Ok(coffees) if !coffees.is_empty() => return Ok(coffees),
        _ => {
            // Fallback to HTML scraping
            let url = "https://unionroasted.com/collections/single-origins";
            scrape_shopify_store(url, "Union Coffee Roasters", "https://unionroasted.com").await
        }
    }
}

async fn scrape_hermanos() -> Result<Vec<Coffee>> {
    info!("Scraping Hermanos Colombian Coffee Roasters");

    // Try Shopify JSON API first
    let json_url = "https://hermanoscoffeeroasters.com/collections/all/products.json";
    match scrape_shopify_json(json_url, "Hermanos Coffee", "https://hermanoscoffeeroasters.com").await {
        Ok(coffees) if !coffees.is_empty() => return Ok(coffees),
        _ => {
            // Fallback to HTML scraping
            let url = "https://hermanoscoffeeroasters.com/collections/all";
            scrape_shopify_store(url, "Hermanos Coffee", "https://hermanoscoffeeroasters.com").await
        }
    }
}

async fn scrape_monmouth() -> Result<Vec<Coffee>> {
    info!("Scraping Monmouth Coffee");

    // WooCommerce store - use generic scraper
    let url = "https://www.monmouthcoffee.co.uk/product-category/our-coffee/beans/";
    scrape_shopify_store(url, "Monmouth Coffee", "https://www.monmouthcoffee.co.uk").await
}

async fn scrape_gotham() -> Result<Vec<Coffee>> {
    info!("Scraping Gotham Coffee");

    let url = "https://gothamcoffee.com/collections/arabica-origin-coffee";
    scrape_shopify_store(url, "Gotham Coffee", "https://gothamcoffee.com").await
}

async fn scrape_coffee_compass() -> Result<Vec<Coffee>> {
    info!("Scraping Coffee Compass");

    let url = "https://www.coffeecompass.co.uk/collections/roasted-origin-coffee";
    scrape_shopify_store(url, "Coffee Compass", "https://www.coffeecompass.co.uk").await
}
