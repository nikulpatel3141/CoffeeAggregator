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

## Current Status: 5/8 Scrapers Working ✅

### ✅ Working Scrapers (234 total products)

1. **Origin Coffee** - 9 products (JSON API)
2. **Rave Coffee** - 174 products (HTML: `div[class*='card']`)
3. **Has Bean** - 25 products (JSON API)
4. **Dark Arts** - 14 products (JSON API)
5. **Round Hill** - 12 products (JSON API)

### ⚠️ Scrapers with Issues (3)

**1. Square Mile Coffee - HTTP 403 Forbidden**
- Issue: Aggressive bot protection blocks both HTML and JSON API requests
- Attempted fixes: Enhanced headers (Chrome UA, Referer, Accept-Language), 30s timeout, limit=250
- Status: Bot protection is too aggressive for standard HTTP client
- Options:
  - Residential proxy rotation
  - Manual API key (if available)
  - Exponential backoff retry
  - Exclude from scraping temporarily

**2. Assembly Coffee - 0 Products**
- Issue: JSON API returns empty or connection blocked
- URL: Fixed from `.co.uk` → `.com`, `/coffee` → `/collections/all`
- Attempted: JSON API with headers, limit parameter
- Status: May be experiencing similar bot protection or wrong endpoint
- Next steps: Manual inspection of actual product API endpoint

**3. Pact Coffee - 0 Products**
- Issue: React SPA with client-side rendering - products loaded via JavaScript
- Attempted: 14+ selectors including `data-testid`, dynamic classes, generic patterns
- Status: Initial HTML contains no products, needs JS execution
- Note: Not a Shopify store
- Options:
  - Discover their API endpoint (GraphQL/REST)
  - Alternative data source
  - Consider lower priority due to custom architecture

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

## Resolved Issues ✅

- ~~Rave Coffee - 0 products~~ → **Fixed**: 174 products via HTML (`div[class*='card']`)
- ~~Has Bean - 0 products~~ → **Fixed**: 25 products via JSON API
- ~~Round Hill - 0 products~~ → **Fixed**: 12 products via JSON API
- ~~Assembly - HTTP 404~~ → **Partial**: URL fixed but still 0 products (bot protection suspected)
- ~~Origin Coffee selectors~~ → **Optimized**: Now uses JSON API (9 products)
- ~~Dark Arts selectors~~ → **Optimized**: Now uses JSON API (14 products)

## Remaining Challenges

The 3 failing scrapers (Square Mile, Assembly, Pact) represent edge cases:
- **Bot protection** (Square Mile, possibly Assembly)
- **Non-Shopify architecture** (Pact Coffee)

With 5/8 scrapers working and 234 products, the system is functional for MVP. The remaining scrapers can be addressed with more advanced techniques or excluded if necessary.

## Testing After Updates

```bash
cd scraper
cargo run --bin test_scrapers
```

This will show which scrapers are currently working and which need attention.
