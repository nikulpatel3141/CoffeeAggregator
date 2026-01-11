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

## Current Status: 6/6 Scrapers Active ✅

All active scrapers are working properly. The system has been streamlined to focus on reliable UK specialty coffee roasters.

### ✅ Active Scrapers

1. **Origin Coffee** - JSON API + HTML fallback
2. **Rave Coffee** - JSON API + HTML fallback
3. **Has Bean** - JSON API + HTML fallback
4. **Dark Arts** - JSON API + HTML fallback
5. **Round Hill** - JSON API + HTML fallback
6. **Redber Coffee** - JSON API + HTML fallback (newly added)

### Removed Scrapers

The following scrapers were removed due to persistent issues:

**Square Mile Coffee** - Aggressive bot protection (HTTP 403)
- Multiple strategies attempted (3 different endpoints, AJAX headers, delays)
- Bot protection too aggressive for standard HTTP clients

**Assembly Coffee** - Connection/endpoint issues
- JSON API returned empty results
- Suspected bot protection or incorrect endpoint

**Pact Coffee** - React SPA architecture
- Not a Shopify store
- Products loaded via JavaScript after initial page load
- Would require API endpoint discovery or headless browser

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

**6/6 scrapers operational** - All active scrapers use the dual-approach strategy (JSON API + HTML fallback) and are working reliably. Problematic scrapers have been removed to maintain system stability.

## Testing After Updates

```bash
cd scraper
cargo run --bin test_scrapers
```

This will show which scrapers are currently working and which need attention.
