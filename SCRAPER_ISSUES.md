# Scraper Architecture & Status

## Scraping Strategy

All scrapers use a **dual-approach** for maximum reliability:

1. **Primary**: Shopify JSON API (`/collections/{collection}/products.json`)
   - More reliable than HTML scraping
   - Not affected by JavaScript rendering
   - Bypasses bot protection in most cases

2. **Fallback**: HTML scraping with comprehensive selectors
   - 15+ selector patterns per scraper
   - Supports various Shopify themes and custom sites
   - Extensive title/name detection patterns

3. **Custom**: For non-Shopify platforms (WooCommerce, etc.)

## Current Status: 14/14 Scrapers Active

### Active Scrapers

| # | Roaster | Strategy | Notes |
|---|---------|----------|-------|
| 1 | Origin Coffee | JSON + HTML | Shopify |
| 2 | Rave Coffee | JSON + HTML | Shopify |
| 3 | Ozone Coffee | JSON + HTML | Shopify (renamed from Has Bean) |
| 4 | Dark Arts Coffee | JSON + HTML | Shopify |
| 5 | Round Hill Roastery | JSON + HTML | Shopify |
| 6 | Volcano Coffee Works | JSON + HTML | Shopify |
| 7 | Balance Coffee | JSON + HTML | Shopify |
| 8 | Union Coffee Roasters | JSON + HTML | Shopify |
| 9 | Hermanos Coffee | HTML only | Shopify (Colombian specialty) |
| 10 | Monmouth Coffee | Custom | WooCommerce - fetches product pages |
| 11 | Gotham Coffee | HTML only | Shopify |
| 12 | Coffee Compass | HTML only | Shopify |
| 13 | UE Coffee Roasters | JSON + HTML | Shopify |
| 14 | Kiss the Hippo | JSON + HTML | Shopify |

### Removed Scrapers

The following scrapers were removed due to persistent issues:

**Square Mile Coffee** - Aggressive bot protection (HTTP 403)
- Multiple strategies attempted (3 different endpoints, AJAX headers, delays)
- Bot protection too aggressive for standard HTTP clients

**Assembly Coffee** - Unreliable
- JSON API and HTML scraping both fail intermittently
- Returns 0 products or connection errors

**Pact Coffee** - React SPA architecture
- Not a Shopify store
- Products loaded via JavaScript after initial page load
- Would require API endpoint discovery or headless browser

**Redber Coffee** - HTTP 404 errors
- Attempted multiple URL variations
- All endpoints returned 404

**Extract Coffee Roasters** - HTTP 404 errors
- Shopify store structure but collections endpoint not accessible

## Architecture

### Generic Functions

1. **`scrape_shopify_json()`** - Handles Shopify JSON API
   - Parses products array
   - Extracts: title, price, handle, availability, tasting notes from tags
   - Auto-detects origin/region from product name

2. **`scrape_shopify_store()`** - HTML fallback
   - 15+ product container selectors
   - 10+ title/name selectors
   - Deduplication logic
   - Price and URL extraction

3. **`extract_origin_from_name()`** - Origin detection
   - 25+ coffee-producing countries
   - Case-insensitive matching
   - Extracts both origin and region

### Custom Scrapers

**Monmouth Coffee (WooCommerce)**
- `scrape_monmouth()` + `scrape_monmouth_product()`
- Fetches individual product pages for detailed info
- Extracts country/origin from page text
- Parses tasting notes from descriptions
- Normalizes prices to per 250g

## Testing

```bash
cd scraper
cargo run --bin test_scrapers
# Results saved to scraped_coffees.json
```

## Known Issues

- **Monmouth**: May return limited results if site blocks requests
- **Hermanos/Gotham/Coffee Compass**: No JSON API, rely on HTML selectors
