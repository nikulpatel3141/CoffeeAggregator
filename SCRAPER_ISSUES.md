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

## Current Status: 8/8 Scrapers Active ✅

All active scrapers are working properly. The system focuses on reliable UK specialty coffee roasters.

### ✅ Active Scrapers

1. **Origin Coffee** - JSON API + HTML fallback
2. **Rave Coffee** - JSON API + HTML fallback
3. **Has Bean** - JSON API + HTML fallback
4. **Dark Arts** - JSON API + HTML fallback
5. **Round Hill** - JSON API + HTML fallback
6. **Volcano Coffee Works** - JSON API + HTML fallback
7. **Balance Coffee** - JSON API + HTML fallback
8. **Union Coffee Roasters** - JSON API + HTML fallback

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
- Attempted multiple URL variations (.co.uk, collections/coffee, collections/all, collections/beans)
- All endpoints returned 404

**Extract Coffee Roasters** - HTTP 404 errors
- Shopify store structure but collections endpoint not accessible

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

- ~~Rave Coffee - 0 products~~ → **Fixed**: JSON API + HTML fallback working
- ~~Has Bean - 0 products~~ → **Fixed**: JSON API working
- ~~Round Hill - 0 products~~ → **Fixed**: JSON API working
- ~~Origin Coffee selectors~~ → **Optimized**: JSON API primary
- ~~Dark Arts selectors~~ → **Optimized**: JSON API primary
- ~~Assembly - HTTP 404~~ → **Removed**: Persistent connection issues
- ~~Square Mile - HTTP 403~~ → **Removed**: Bot protection too aggressive
- ~~Pact Coffee - 0 products~~ → **Removed**: Non-Shopify architecture

## System Status

**8/8 scrapers operational** - All active scrapers use the dual-approach strategy (JSON API + HTML fallback) with verified URLs. Expanded from 5 to 8 roasters by adding Volcano Coffee Works, Balance Coffee, and Union Coffee Roasters with correct collection URLs discovered via web search.

## Testing After Updates

```bash
cd scraper
cargo run --bin test_scrapers
```

This will show which scrapers are currently working and which need attention.
