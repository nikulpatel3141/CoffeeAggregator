# Testing the Coffee Scrapers

This guide explains how to test the scrapers against real UK coffee roaster websites.

## Quick Test

Run the automated test script:

```bash
./test-scrapers.sh
```

This will:
1. Build the test binary
2. Test all 8 roasters
3. Show results with product counts
4. Report any failures

## Expected Output

```
🔍 Testing Coffee Scrapers Against Real Sites

═══════════════════════════════════════════════

Testing Pact Coffee     ... ✅ 12 products (selector: .grid__item)
Testing Origin Coffee   ... ✅ 18 products (selector: .product-item)
Testing Rave Coffee     ... ✅ 24 products (selector: .product-item)
Testing Square Mile     ... ✅ 15 products (selector: .grid__item)
Testing Has Bean        ... ✅ 20 products (selector: .product-item)
Testing Assembly        ... ✅ 8 products (selector: .product-item)
Testing Dark Arts       ... ✅ 14 products (selector: .product-item)
Testing Round Hill      ... ✅ 10 products (selector: .product-item)

═══════════════════════════════════════════════
📊 Results Summary:
  ✅ Successful: 8/8 roasters
  📦 Total products: 121
  📈 Average: 15.1 products/roaster

🎉 All scrapers working perfectly!
═══════════════════════════════════════════════
```

## Manual Testing

To test individual roasters or debug issues:

```bash
cd scraper

# Test all scrapers
cargo run --bin test_scrapers

# Or run with verbose output
RUST_LOG=debug cargo run --bin test_scrapers
```

## Troubleshooting

### 🔴 Scraper Returns 0 Products

**Cause**: Website HTML structure changed
**Fix**: Update selectors in `scraper/src/main.rs`

1. Visit the roaster's website
2. Inspect a product element (right-click → Inspect)
3. Find the CSS class for product items
4. Update the selector in the scraper function

Example fix for Origin Coffee:
```rust
// Old selector
let product_selector = Selector::parse(".product-item").unwrap();

// New selector (if they changed their theme)
let product_selector = Selector::parse(".product-card-wrapper").unwrap();
```

### 🟡 Network Timeout

**Cause**: Slow connection or rate limiting
**Fix**:
- Increase timeout in test script
- Add delay between requests
- Check internet connection

### 🟠 HTTP Error (403, 429, etc.)

**Cause**: Website blocking or rate limiting
**Fix**:
- User agent is already set to appear as a browser
- Add delays between requests
- Some sites may require different approaches

## Understanding Selectors

All 8 roasters use Shopify, which has standard CSS classes:

Common selectors:
- `.grid__item` - Newer Shopify themes
- `.product-item` - Older themes
- `.product-card` - Some custom themes
- `.product-grid-item` - Alternative name

The scraper tries multiple selectors automatically.

## Testing After Changes

After updating scraper code:

```bash
# 1. Test locally
./test-scrapers.sh

# 2. If tests pass, deploy
cd scraper
./build.sh $PROJECT_ID

# 3. Test in production
curl -X POST $(cd ../terraform && terraform output -raw scraper_url)

# 4. Check Firestore
gcloud firestore documents list coffees --limit 10
```

## Performance

- Each roaster test takes ~2-5 seconds
- Total test time: ~30 seconds for all 8
- Tests run in sequence to avoid rate limiting

## What Gets Tested

✅ Website accessibility
✅ Product detection with selectors
✅ Product count validation
✅ Title element verification

❌ Full scraper logic (price parsing, origin detection)
❌ Firestore writes

For complete end-to-end testing, deploy to GCP and trigger the scraper.
