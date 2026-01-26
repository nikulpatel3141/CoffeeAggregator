use anyhow::Result;
use chrono::Utc;
use coffee_common::Coffee;
use scraper::{Html, Selector};
use serde_json;

#[tokio::main]
async fn main() -> Result<()> {
    println!("\n🔍 Testing Coffee Scrapers - Scraping Real Data\n");
    println!("═══════════════════════════════════════════════\n");

    let mut all_coffees: Vec<Coffee> = Vec::new();
    let mut successful_scrapers = 0;
    let mut failed_scrapers = Vec::new();

    // Test all 12 roasters
    let roasters = vec![
        ("Origin Coffee", "https://www.origincoffee.co.uk/collections/coffee", "https://www.origincoffee.co.uk"),
        ("Rave Coffee", "https://ravecoffee.co.uk/collections/coffee", "https://ravecoffee.co.uk"),
        ("Has Bean", "https://www.hasbean.co.uk/collections/coffee", "https://www.hasbean.co.uk"),
        ("Dark Arts", "https://www.darkartscoffee.co.uk/collections/coffee", "https://www.darkartscoffee.co.uk"),
        ("Round Hill", "https://www.roundhillroastery.com/collections/coffee", "https://www.roundhillroastery.com"),
        ("Volcano Coffee", "https://volcanocoffeeworks.com/collections/all-coffee", "https://volcanocoffeeworks.com"),
        ("Balance Coffee", "https://balancecoffee.co.uk/collections/speciality-coffee", "https://balancecoffee.co.uk"),
        ("Union Coffee", "https://unionroasted.com/collections/single-origins", "https://unionroasted.com"),
        ("Hermanos Coffee", "https://hermanoscoffeeroasters.com/collections/all", "https://hermanoscoffeeroasters.com"),
        ("Monmouth Coffee", "https://www.monmouthcoffee.co.uk/product-category/our-coffee/beans/", "https://www.monmouthcoffee.co.uk"),
        ("Gotham Coffee", "https://gothamcoffee.com/collections/arabica-origin-coffee", "https://gothamcoffee.com"),
        ("Coffee Compass", "https://www.coffeecompass.co.uk/collections/roasted-origin-coffee", "https://www.coffeecompass.co.uk"),
    ];

    for (name, url, base_url) in &roasters {
        print!("Scraping {:15} ... ", name);

        match scrape_roaster(name, url, base_url).await {
            Ok(coffees) => {
                let count = coffees.len();
                if count > 0 {
                    println!("✅ {} coffees scraped", count);
                    all_coffees.extend(coffees);
                    successful_scrapers += 1;
                } else {
                    println!("⚠️  0 coffees found");
                    failed_scrapers.push(*name);
                }
            }
            Err(e) => {
                println!("❌ {}", e);
                failed_scrapers.push(*name);
            }
        }
    }

    // Apply filtering (same as main scraper)
    let before_filter = all_coffees.len();
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

        // Filter out equipment
        if name_lower.contains("v60") || name_lower.contains("chemex")
            || name_lower.contains("filter paper") || name_lower.contains("paper filter")
            || name_lower.contains("server") || name_lower.contains("mug")
            || name_lower.contains("cup") || name_lower.contains("dripper") || name_lower.contains("brewer")
            || name_lower.contains("grinder") || name_lower.contains("kettle") || name_lower.contains("tamper")
            || name_lower.contains("jug") || name_lower.contains("carafe") || name_lower.contains("aeropress")
            || name_lower.contains("cafetiere") || name_lower.contains("french press") || name_lower.contains("moka pot")
            || name_lower.contains("scales") || name_lower.contains("scale") || name_lower.contains("thermometer")
            || name_lower.contains("pitcher") || name_lower.contains("bottle") || name_lower.contains("flask")
            || name_lower.contains("pour over set") || name_lower.contains("brewing kit") || name_lower.contains("equipment")
            || name_lower.contains("accessories") || name_lower.contains("storage") || name_lower.contains("canister")
            || name_lower.contains("spoon") || name_lower.contains("scoop") || name_lower.contains("cloth")
            || name_lower.contains("towel") || name_lower.contains("mat") || name_lower.contains("tray")
            || name_lower.contains("hario") || name_lower.contains("kalita") || name_lower.contains("origami")
            || name_lower.contains("clever") || name_lower.contains("portafilter") {
            return false;
        }

        // Filter out coffee pods
        if name_lower.contains(" pod") || name_lower.contains("pods") || name_lower.contains("capsule") {
            return false;
        }

        // Filter out blends
        if name_lower.contains(" blend") || name_lower.starts_with("blend") || name_lower.ends_with("blend") {
            return false;
        }

        // Filter out gift items
        if name_lower.contains("gift card") || name_lower.contains("gift box") || name_lower.contains("voucher")
            || name_lower.contains("merchandise") || name_lower.contains("t-shirt") || name_lower.contains("tote") {
            return false;
        }

        true
    });

    // Filter by price
    all_coffees.retain(|coffee| {
        if let Some(price_str) = &coffee.price {
            let numeric_price = price_str
                .trim_start_matches('£')
                .trim()
                .parse::<f64>()
                .unwrap_or(0.0);
            numeric_price > 0.0 && numeric_price <= 50.0
        } else {
            false
        }
    });

    println!("\n═══════════════════════════════════════════════");
    println!("📊 Results Summary:");
    println!("  ✅ Successful: {}/12 roasters", successful_scrapers);
    println!("  📦 Raw products: {}", before_filter);
    println!("  ☕ After filtering: {} coffees", all_coffees.len());
    println!("  📈 Average: {:.1} coffees/roaster", all_coffees.len() as f32 / successful_scrapers.max(1) as f32);

    // Count coffees with tasting notes
    let with_notes = all_coffees.iter().filter(|c| !c.tasting_notes.is_empty()).count();
    let with_origin = all_coffees.iter().filter(|c| c.origin.is_some()).count();
    println!("  🏷️  With tasting notes: {}", with_notes);
    println!("  🌍 With origin: {}", with_origin);

    if !failed_scrapers.is_empty() {
        println!("\n  ❌ Failed: {}", failed_scrapers.join(", "));
    } else {
        println!("\n🎉 All scrapers working perfectly!");
    }

    println!("═══════════════════════════════════════════════\n");

    // Write full coffee data to JSON file
    let output_path = "scraped_coffees.json";
    if let Err(e) = std::fs::write(output_path, serde_json::to_string_pretty(&all_coffees)?) {
        println!("⚠️  Failed to write data to {}: {}", output_path, e);
    } else {
        println!("💾 Coffee data saved to {}", output_path);
    }

    // Also write summary
    let summary = serde_json::json!({
        "total_coffees": all_coffees.len(),
        "raw_products": before_filter,
        "successful_scrapers": successful_scrapers,
        "failed_scrapers": failed_scrapers,
        "with_tasting_notes": with_notes,
        "with_origin": with_origin,
        "scraped_at": Utc::now().to_rfc3339()
    });

    let summary_path = "scrape_summary.json";
    if let Err(e) = std::fs::write(summary_path, serde_json::to_string_pretty(&summary)?) {
        println!("⚠️  Failed to write summary to {}: {}", summary_path, e);
    } else {
        println!("💾 Summary saved to {}\n", summary_path);
    }

    if successful_scrapers == 0 {
        anyhow::bail!("All scrapers failed - check network connection");
    }

    Ok(())
}

async fn scrape_roaster(name: &str, url: &str, base_url: &str) -> Result<Vec<Coffee>> {
    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        .timeout(std::time::Duration::from_secs(15))
        .build()?;

    // First try JSON API if it's a Shopify store
    if url.contains("/collections/") {
        let json_url = format!("{}/products.json?limit=250", url);
        if let Ok(response) = client.get(&json_url).send().await {
            if response.status().is_success() {
                if let Ok(json) = response.json::<serde_json::Value>().await {
                    if let Some(products) = json.get("products").and_then(|p| p.as_array()) {
                        if !products.is_empty() {
                            return Ok(parse_shopify_json(products, name, base_url));
                        }
                    }
                }
            }
        }
    }

    // Fallback to HTML scraping
    let response = client.get(url).send().await?;

    if !response.status().is_success() {
        anyhow::bail!("HTTP {}", response.status());
    }

    let body = response.text().await?;
    Ok(parse_html(&body, name, base_url, url))
}

fn parse_shopify_json(products: &Vec<serde_json::Value>, roaster_name: &str, base_url: &str) -> Vec<Coffee> {
    let mut coffees = Vec::new();

    for product in products {
        let name = product.get("title")
            .and_then(|t| t.as_str())
            .unwrap_or("")
            .to_string();

        if name.is_empty() {
            continue;
        }

        // Extract best variant (prefer 250g)
        let (price, weight) = if let Some(variants) = product.get("variants").and_then(|v| v.as_array()) {
            select_best_variant(variants)
        } else {
            (None, None)
        };

        let product_url = product.get("handle")
            .and_then(|h| h.as_str())
            .map(|h| format!("{}/products/{}", base_url, h))
            .unwrap_or_else(|| base_url.to_string());

        let (origin, region) = extract_origin_from_name(&name);
        let tasting_notes = extract_tasting_notes(product);

        coffees.push(Coffee {
            name,
            roaster: roaster_name.to_string(),
            origin,
            region,
            tasting_notes,
            price,
            weight,
            url: product_url,
            in_stock: true,
            scraped_at: Utc::now().to_rfc3339(),
        });
    }

    coffees
}

fn parse_html(body: &str, roaster_name: &str, base_url: &str, collection_url: &str) -> Vec<Coffee> {
    let document = Html::parse_document(body);
    let mut coffees = Vec::new();

    let product_selectors = vec![
        ".grid__item",
        ".product-item",
        ".product-card",
        ".product-grid-item",
        "div[class*='ProductItem']",
        "article[class*='product']",
        "li[class*='product']",
        ".card-wrapper",
        "[data-product]",
    ];

    for selector_str in product_selectors {
        if let Ok(product_selector) = Selector::parse(selector_str) {
            for product in document.select(&product_selector) {
                let name = ["h3", "h2", "h4", ".product-title", ".product__title", ".card__title", "a[href*='/products/']"]
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

                let product_url = Selector::parse("a").ok()
                    .and_then(|s| product.select(&s).next())
                    .and_then(|e| e.value().attr("href"))
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
                    weight: None,
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

    coffees
}

fn select_best_variant(variants: &Vec<serde_json::Value>) -> (Option<String>, Option<String>) {
    if variants.is_empty() {
        return (None, None);
    }

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

        let weight_str = variant.get("title")
            .and_then(|t| t.as_str())
            .or_else(|| variant.get("option1").and_then(|o| o.as_str()))
            .unwrap_or("");

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

fn extract_weight_in_grams(text: &str) -> i32 {
    let text_lower = text.to_lowercase();

    for word in text_lower.split_whitespace() {
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

    999999
}

fn normalize_weight(text: &str) -> String {
    let text_lower = text.to_lowercase();

    for word in text_lower.split_whitespace() {
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

fn extract_origin_from_name(name: &str) -> (Option<String>, Option<String>) {
    let origins = vec![
        "Ethiopia", "Kenya", "Colombia", "Brazil", "Guatemala", "Rwanda",
        "Burundi", "Peru", "Honduras", "Costa Rica", "El Salvador", "Nicaragua",
        "Panama", "Mexico", "Indonesia", "Yemen", "Tanzania", "Uganda",
    ];

    for origin in origins {
        if name.to_lowercase().contains(&origin.to_lowercase()) {
            return (Some(origin.to_string()), Some(origin.to_string()));
        }
    }

    (None, None)
}

fn extract_tasting_notes(product: &serde_json::Value) -> Vec<String> {
    let mut notes = Vec::new();

    let tasting_keywords = vec![
        "chocolate", "cocoa", "caramel", "toffee", "honey", "vanilla", "sugar", "molasses",
        "berry", "berries", "blueberry", "strawberry", "raspberry", "blackberry", "cherry",
        "citrus", "lemon", "lime", "orange", "grapefruit", "tangerine", "bergamot",
        "tropical", "mango", "pineapple", "papaya", "passion fruit", "guava", "coconut",
        "stone fruit", "peach", "apricot", "plum", "nectarine",
        "apple", "pear", "grape", "melon",
        "floral", "jasmine", "rose", "lavender", "hibiscus", "elderflower",
        "nutty", "almond", "hazelnut", "walnut", "peanut", "cashew",
        "spicy", "cinnamon", "clove", "cardamom", "ginger", "pepper", "nutmeg",
        "herbal", "tea", "black tea", "green tea", "chamomile",
        "wine", "winey", "red wine", "port",
        "butter", "cream", "creamy", "milk chocolate", "dark chocolate",
        "brown sugar", "maple", "syrup", "candy", "sweet",
        "bright", "crisp", "clean", "smooth", "balanced", "complex", "rich",
        "fruity", "juicy", "tangy", "zesty",
    ];

    // Extract from tags
    if let Some(tags) = product.get("tags").and_then(|t| t.as_str()) {
        for tag in tags.split(',').map(|s| s.trim()) {
            let tag_lower = tag.to_lowercase();
            for keyword in &tasting_keywords {
                if tag_lower.contains(keyword) {
                    let note = tag.trim().to_string();
                    if !note.is_empty() && note.len() < 30 && !notes.iter().any(|n: &String| n.to_lowercase() == note.to_lowercase()) {
                        notes.push(capitalize_words(&note));
                    }
                    break;
                }
            }
        }
    }

    // Extract from body_html if tags didn't yield results
    if notes.is_empty() {
        if let Some(body) = product.get("body_html").and_then(|b| b.as_str()) {
            // Simple HTML tag removal
            let mut plain_text = String::new();
            let mut in_tag = false;
            for c in body.chars() {
                if c == '<' {
                    in_tag = true;
                } else if c == '>' {
                    in_tag = false;
                } else if !in_tag {
                    plain_text.push(c);
                }
            }

            let text_lower = plain_text.to_lowercase();
            let note_patterns = ["tasting notes", "taste notes", "flavor notes", "flavour notes", "notes:"];

            for pattern in note_patterns {
                if let Some(pos) = text_lower.find(pattern) {
                    let after = &plain_text[pos + pattern.len()..];
                    let end_pos = after.find(|c| c == '.' || c == '\n').unwrap_or(after.len().min(200));
                    let note_section = &after[..end_pos];

                    for note in note_section.split(|c| c == ',' || c == '/' || c == '|' || c == '&') {
                        let note = note.trim().trim_matches(':').trim();
                        let note_lower = note.to_lowercase();

                        for keyword in &tasting_keywords {
                            if note_lower.contains(keyword) && note.len() < 30 && note.len() > 2 {
                                if !notes.iter().any(|n: &String| n.to_lowercase() == note_lower) {
                                    notes.push(capitalize_words(note));
                                }
                                break;
                            }
                        }
                    }

                    if !notes.is_empty() {
                        break;
                    }
                }
            }
        }
    }

    notes.truncate(5);
    notes
}

fn capitalize_words(s: &str) -> String {
    s.split_whitespace()
        .map(|word| {
            let mut chars = word.chars();
            match chars.next() {
                None => String::new(),
                Some(first) => first.to_uppercase().collect::<String>() + chars.as_str().to_lowercase().as_str(),
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}
