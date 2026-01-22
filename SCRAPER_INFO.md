# Coffee Scraper Information

## Overview

The scraper has been optimized to work with UK specialty coffee roasters. Most of these roasters use Shopify, so the scraper uses a generic Shopify scraper function that tries multiple common selectors.

## Implemented Scrapers

### 1. **Pact Coffee** (https://www.pactcoffee.com/coffees)
- Custom scraper with React-specific selectors
- Extracts: name, price, origin from product name
- Example data:
  ```json
  {
    "name": "Ethiopia Guji Hambela",
    "roaster": "Pact Coffee",
    "origin": "Ethiopia",
    "region": "Ethiopia",
    "price": "£9.00",
    "url": "https://www.pactcoffee.com/coffees/ethiopia-guji-hambela"
  }
  ```

### 2. **Origin Coffee** (https://www.origincoffee.co.uk/collections/coffee)
- Uses generic Shopify scraper
- Shopify-based store
- Example data:
  ```json
  {
    "name": "Kenya Kiambu",
    "roaster": "Origin Coffee",
    "origin": "Kenya",
    "region": "Kenya",
    "price": "£11.50",
    "url": "https://www.origincoffee.co.uk/products/kenya-kiambu"
  }
  ```

### 3. **Rave Coffee** (https://ravecoffee.co.uk/collections/coffee)
- Uses generic Shopify scraper
- Shopify-based store
- Example data:
  ```json
  {
    "name": "Ethiopia Sidamo",
    "roaster": "Rave Coffee",
    "origin": "Ethiopia",
    "region": "Ethiopia",
    "price": "£8.95",
    "url": "https://ravecoffee.co.uk/products/ethiopia-sidamo"
  }
  ```

### 4. **Square Mile Coffee** (https://shop.squaremilecoffee.com/collections/coffee)
- Uses generic Shopify scraper
- Shopify-based store
- Example data:
  ```json
  {
    "name": "Red Brick Seasonal Espresso",
    "roaster": "Square Mile Coffee",
    "origin": "Blend",
    "region": "Central America",
    "price": "£12.50",
    "url": "https://shop.squaremilecoffee.com/products/red-brick"
  }
  ```

### 5. **Has Bean Coffee** (https://www.hasbean.co.uk/collections/coffee)
- Uses generic Shopify scraper
- Shopify-based store
- Example data:
  ```json
  {
    "name": "Rwanda Ruli Mountain",
    "roaster": "Has Bean Coffee",
    "origin": "Rwanda",
    "region": "Rwanda",
    "price": "£9.50",
    "url": "https://www.hasbean.co.uk/products/rwanda-ruli-mountain"
  }
  ```

### 6. **Assembly Coffee** (https://www.assemblycoffee.co.uk/collections/coffee)
- Uses generic Shopify scraper
- Shopify-based store
- Example data:
  ```json
  {
    "name": "House Espresso",
    "roaster": "Assembly Coffee",
    "origin": "Blend",
    "region": "South America",
    "price": "£9.00",
    "url": "https://www.assemblycoffee.co.uk/products/house-espresso"
  }
  ```

### 7. **Dark Arts Coffee** (https://www.darkartscoffee.co.uk/collections/coffee)
- Uses generic Shopify scraper
- Shopify-based store
- Example data:
  ```json
  {
    "name": "Guatemala Los Alpes",
    "roaster": "Dark Arts Coffee",
    "origin": "Guatemala",
    "region": "Guatemala",
    "price": "£11.00",
    "url": "https://www.darkartscoffee.co.uk/products/guatemala-los-alpes"
  }
  ```

### 8. **Round Hill Roastery** (https://www.roundhillroastery.com/collections/coffee)
- Uses generic Shopify scraper
- Shopify-based store
- Example data:
  ```json
  {
    "name": "Peru Cajamarca",
    "roaster": "Round Hill Roastery",
    "origin": "Peru",
    "region": "Peru",
    "price": "£8.00",
    "url": "https://www.roundhillroastery.com/products/peru-cajamarca"
  }
  ```

## How the Scrapers Work

### Generic Shopify Scraper
Most UK coffee roasters use Shopify. The generic scraper:
1. Tries multiple product selectors (`.grid__item`, `.product-item`, `.product-card`, etc.)
2. Extracts product name from various heading selectors
3. Extracts price from `.price`, `.money`, or similar classes
4. Builds full product URLs
5. Automatically detects origin/region from product names

### Origin Detection
The scraper includes a smart origin detector that looks for country names in product titles:
- **Supported origins**: Ethiopia, Kenya, Colombia, Brazil, Guatemala, Rwanda, Burundi, Peru, Honduras, Costa Rica, El Salvador, Nicaragua, Panama, Mexico, Indonesia, Yemen, Tanzania, Uganda

When a product name contains "Ethiopia Guji", the scraper automatically sets:
- `origin: "Ethiopia"`
- `region: "Ethiopia"`

### Features
- **Deduplication**: Prevents duplicate products by checking names
- **User Agent**: Uses realistic browser user agent to avoid blocks
- **Flexible Selectors**: Tries multiple selector patterns to accommodate different Shopify themes
- **Full URLs**: Constructs complete product URLs for easy navigation
- **Error Handling**: Gracefully handles failures for individual scrapers

## Testing in Production

To test the scrapers:
1. Deploy to Cloud Run
2. Trigger manual scrape: `curl -X POST <cloud-run-url>/`
3. Check Firestore for results
4. Verify data via API: `curl <cloud-run-url>/api/coffees`

## Maintenance

When website structures change:
1. Check the `scrape_shopify_store` function in `main.rs`
2. Add new selectors to the `product_selectors`, name selector, or price selector arrays
3. For non-Shopify sites, create custom scraper functions (see `scrape_pact_coffee` as example)
4. Update `extract_origin_from_name` to add new coffee-producing regions

## Sample Data

Full sample data for all roasters is available in `sample_data.json`
