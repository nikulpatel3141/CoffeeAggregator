# UK Coffee Aggregator

Aggregates specialty coffee offerings from UK roasters, visualized on an interactive map. Built entirely with [Claude Code](https://github.com/anthropics/claude-code).

**Live site**: [View the aggregator](https://github.com/nikulpatel3141/CoffeeAggregator)

## Features

- **Interactive Map**: Coffees grouped by origin region on an interactive world map
- **Advanced Filtering**: Filter by roaster, region, price range, tasting notes
- **Daily Auto-Updates**: Fresh data every day via automated GitHub Actions pipeline
- **Mobile Responsive**: Collapsible map, hamburger menu, optimized for all devices
- **Dark Mode**: System preference detection with manual toggle
- **14 UK Roasters**:
  - Origin Coffee
  - Rave Coffee
  - Ozone Coffee
  - Dark Arts Coffee
  - Round Hill Roastery
  - Volcano Coffee Works
  - Balance Coffee
  - Union Coffee Roasters
  - Hermanos Coffee
  - Monmouth Coffee
  - Gotham Coffee
  - Coffee Compass
  - UE Coffee Roasters
  - Kiss the Hippo

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         GitHub Actions Pipeline                          │
│  ┌──────────┐     ┌───────────┐     ┌─────────┐     ┌────────────────┐  │
│  │ Scraper  │────▶│ Firestore │────▶│ Builder │────▶│ Website Repo   │  │
│  │  (Rust)  │     │           │     │  (Rust) │     │ (Auto-commit)  │  │
│  └──────────┘     └───────────┘     └─────────┘     └────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                                              │
                                                              ▼
                                                        ┌──────────┐
                                                        │  Vercel  │
                                                        │ (Deploy) │
                                                        └──────────┘
```

1. **GitHub Actions**: Runs daily at 6 AM UK, triggers scraping and building
2. **Scraper**: Scrapes 14 roasters using Shopify JSON API + HTML fallback → saves to Firestore
3. **Builder**: Exports Firestore data to JSON → commits to website repository
4. **Vercel**: Auto-deploys on GitHub push → serves static site globally

## Tech Stack

- **Scraper**: Rust + reqwest + scraper (HTML parsing)
- **Builder**: Rust + Firestore SDK + Git automation
- **Frontend**: Next.js 14 + React + TypeScript + Tailwind CSS
- **Maps**: Pigeon Maps (OpenStreetMap)
- **Database**: Firestore (temporary storage between scrape and build)
- **CI/CD**: GitHub Actions
- **Hosting**: Vercel (frontend CDN)

## Quick Start

### Run Scraper Locally

```bash
cd scraper
cargo run --bin test_scrapers
# Results saved to scraped_coffees.json
```

### Run Frontend Locally

```bash
cd frontend
npm install
npm run dev
# Visit http://localhost:3000
```

### Full Pipeline

The full pipeline runs via GitHub Actions. See [CI_CD_SETUP.md](CI_CD_SETUP.md) for details.

## Project Structure

```
.
├── scraper/              # Rust coffee scraper
│   ├── src/main.rs       # Main scraper with 14 roaster functions
│   └── src/bin/          # Test binaries
├── builder/              # Rust build service
│   └── src/main.rs       # Firestore → JSON → Git commit
├── frontend/             # Next.js static site
│   ├── app/              # Next.js app router
│   ├── components/       # React components
│   └── public/data/      # Generated JSON files
├── .github/workflows/    # GitHub Actions pipeline
├── terraform/            # GCP infrastructure (Firestore)
└── common/               # Shared Rust types
```

## Documentation

- [CI_CD_SETUP.md](CI_CD_SETUP.md) - Pipeline and deployment setup
- [DEPLOYMENT.md](DEPLOYMENT.md) - Full deployment guide
- [SCRAPER_INFO.md](SCRAPER_INFO.md) - Scraper implementation details
- [SCRAPER_ISSUES.md](SCRAPER_ISSUES.md) - Known issues and removed scrapers
- [TEST_GUIDE.md](TEST_GUIDE.md) - Testing guide

## Contributing

To add new roasters:

1. Add scraper function in `scraper/src/main.rs`
2. Most UK roasters use Shopify - use `scrape_shopify_json()` with HTML fallback
3. Add to the scraper results vector in `run_scraper()`
4. Test with `cargo run --bin test_scrapers`
5. Update roaster list in `frontend/components/ReadmeTab.tsx`

## License

MIT
