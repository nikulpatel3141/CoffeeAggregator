# Coffee Scraper Information

## Overview

The scraper aggregates coffee data from 14 UK specialty roasters. Most use Shopify, so the scraper uses a dual-approach strategy:
1. **Shopify JSON API** (`/products.json`) - Fast, structured data when available
2. **HTML Scraping** - Fallback with flexible selectors for compatibility

## Currently Tracking (14 Roasters)

| Roaster | Platform | Approach |
|---------|----------|----------|
| Origin Coffee | Shopify | JSON API + HTML fallback |
| Rave Coffee | Shopify | JSON API + HTML fallback |
| Ozone Coffee | Shopify | JSON API + HTML fallback |
| Dark Arts Coffee | Shopify | JSON API + HTML fallback |
| Round Hill Roastery | Shopify | JSON API + HTML fallback |
| Volcano Coffee Works | Shopify | JSON API + HTML fallback |
| Balance Coffee | Shopify | JSON API + HTML fallback |
| Union Coffee Roasters | Shopify | JSON API + HTML fallback |
| Hermanos Coffee | Shopify | HTML only |
| Monmouth Coffee | WooCommerce | Custom scraper (product pages) |
| Gotham Coffee | Shopify | HTML only |
| Coffee Compass | Shopify | HTML only |
| UE Coffee Roasters | Shopify | JSON API + HTML fallback |
| Kiss the Hippo | Shopify | JSON API + HTML fallback |

## How the Scrapers Work

### Shopify JSON API (Primary)

Most Shopify stores expose a JSON API at `/collections/{collection}/products.json`:

```rust
async fn scrape_shopify_json(json_url: &str, roaster_name: &str, base_url: &str) -> Result<Vec<Coffee>>
```

This extracts:
- Product name, price, URL
- Tasting notes from tags
- Origin/region from product name
- Weight from variant information

### HTML Scraping (Fallback)

When JSON API fails or isn't available:

```rust
async fn scrape_shopify_store(collection_url: &str, roaster_name: &str, base_url: &str) -> Result<Vec<Coffee>>
```

Uses multiple CSS selectors:
- Products: `.grid__item`, `.product-item`, `.product-card`, etc.
- Names: `h2`, `h3`, `.product-title`, `.card__title`, etc.
- Prices: `.price`, `.money`, `span[class*='price']`, etc.

### Custom Scrapers

Some sites need custom handling:

**Monmouth Coffee (WooCommerce)**
- Fetches individual product pages
- Extracts country/origin from page text
- Parses tasting notes from descriptions
- Normalizes prices to per 250g

## Origin Detection

The scraper automatically detects coffee origins from product names:

```
"Ethiopia Guji Hambela" → origin: "Ethiopia", region: "Ethiopia"
"Kenya Kiambu AA" → origin: "Kenya", region: "Kenya"
"Colombia Las Margaritas" → origin: "Colombia", region: "Colombia"
```

Supported origins: Ethiopia, Kenya, Colombia, Brazil, Guatemala, Rwanda, Burundi, Peru, Honduras, Costa Rica, El Salvador, Nicaragua, Panama, Mexico, Indonesia, Yemen, Tanzania, Uganda, India, Bolivia, Ecuador, Papua New Guinea, Malawi, Zambia, DR Congo

## Tasting Notes Extraction

For Shopify JSON, tasting notes are extracted from product tags:
- Tags like "chocolate", "citrus", "berry" are collected
- Maximum 5 notes per coffee

For HTML/custom scrapers, notes are parsed from product descriptions.

## Equipment Filtering

The scraper filters out non-coffee products using specific keywords:
- "grinder", "machine", "kettle", "scales"
- "paper filter", "filter paper", "v60 paper"
- "gift card", "subscription box", "merchandise"

Note: Generic "filter" was removed to avoid filtering legitimate "Filter Roast" coffees.

## Testing

Run the test scraper locally:

```bash
cd scraper
cargo run --bin test_scrapers
# Results saved to scraped_coffees.json
```

## Maintenance

When website structures change:
1. Check if JSON API is still available
2. Update CSS selectors in `scrape_shopify_store` if needed
3. For new roasters, add a function following the pattern in `main.rs`
4. Update `extract_origin_from_name` for new coffee regions
5. Test with `cargo run --bin test_scrapers`
