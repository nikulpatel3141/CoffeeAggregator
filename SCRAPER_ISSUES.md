# Known Scraper Issues

## Square Mile Coffee - HTTP 403 Forbidden

**Issue**: Square Mile's website returns 403 Forbidden errors, likely due to bot protection (Cloudflare or similar).

**Workarounds**:
1. Use their JSON product feed instead: `https://shop.squaremilecoffee.com/products.json`
2. Add retry logic with exponential backoff
3. Rotate user agents
4. Consider using a headless browser (Playwright/Puppeteer)

**Temporary Fix**: If consistently blocked, you may need to temporarily exclude Square Mile from scraping or switch to their API if available.

## Pact Coffee - React/JavaScript Heavy Site

**Issue**: Pact Coffee uses client-side rendering, products may not be in initial HTML.

**Current Status**: Testing improved selectors. If still failing, may need:
- Headless browser (Playwright)
- Wait for JavaScript to load
- Alternative API endpoint

## Rave Coffee - Selector Updates Needed

**Issue**: Returning 0 products, selectors likely need updating.

**Fix**: Check their current website structure and update selectors accordingly.

## Has Bean - Selector Updates Needed

**Issue**: Returning 0 products, selectors likely need updating.

**Fix**: Inspect current website HTML and adjust selectors.

## Round Hill - Selector Updates Needed

**Issue**: Returning 0 products, selectors likely need updating.

**Fix**: Inspect current website HTML and adjust selectors.

## Working Scrapers

✅ **Origin Coffee** - 10 products found (.grid__item selector)
✅ **Dark Arts** - 16 products found (.grid__item selector)
✅ **Assembly** - Fixed URL from .co.uk to .com

## Testing After Updates

```bash
cd scraper
cargo run --bin test_scrapers
```

This will show which scrapers are currently working and which need attention.
