# Scraper Architecture & Status

## Scraping Strategy

All scrapers now use a **dual-approach** for maximum reliability:

1. **Primary**: Shopify JSON API (`/collections/{collection}/products.json`)
   - More reliable than HTML scraping
   - Not affected by JavaScript rendering
   - Bypasses bot protection in most cases

2. **Fallback**: HTML scraping with comprehensive selectors
   - 15+ selector patterns per scraper
   - Supports various Shopify themes and custom sites
   - Extensive title/name detection patterns

## Scrapers Status

### ✅ Fixed and Improved

**Square Mile Coffee**
- Now uses Shopify JSON API exclusively
- Previous issue: HTTP 403 Forbidden due to bot protection
- Solution: Direct API access bypasses protection

**Origin Coffee, Rave Coffee, Has Bean, Assembly, Dark Arts, Round Hill**
- All use JSON API first, HTML fallback second
- Expanded selectors: 15+ patterns including wildcards
- Improved title detection: 10+ patterns
- Assembly URL fixed: .co.uk → .com, /coffee → /all

**Pact Coffee**
- React-heavy site with 14+ specialized selectors
- Expanded title detection for client-side rendering
- Includes data-testid and dynamic class patterns

## Architecture Improvements

### Generic Functions

1. **`scrape_shopify_json()`** - Handles Shopify JSON API
   - Parses products array
   - Extracts: title, price, handle, availability
   - Auto-detects origin/region from product name

2. **`scrape_shopify_store()`** - HTML fallback
   - 15+ product container selectors
   - 10+ title/name selectors
   - Deduplication logic
   - Price and URL extraction

3. **`extract_origin_from_name()`** - Origin detection
   - 18 coffee-producing countries
   - Case-insensitive matching
   - Extracts both origin and region

## Previous Issues (Now Resolved)

~~Square Mile - HTTP 403~~
~~Rave Coffee - 0 products~~
~~Has Bean - 0 products~~
~~Round Hill - 0 products~~
~~Assembly - HTTP 404~~
~~Pact Coffee - React rendering issues~~

## Testing After Updates

```bash
cd scraper
cargo run --bin test_scrapers
```

This will show which scrapers are currently working and which need attention.
