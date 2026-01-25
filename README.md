# UK Coffee Tracker

Track specialty coffee offerings across UK specialty roasters' websites, visualized on an interactive map.

## Features

- **Interactive Map View**: Coffees grouped by origin region on an interactive world map
- **Advanced Filtering**: Filter by roaster, region, price, tasting notes
- **Daily Auto-Updates**: Fresh data every day via automated scraping
- **Static & Fast**: Globally distributed via Vercel CDN
- **8 UK Roasters**:
  - Pact Coffee
  - Origin Coffee
  - Rave Coffee
  - Square Mile Coffee
  - Has Bean Coffee
  - Assembly Coffee
  - Dark Arts Coffee
  - Round Hill Roastery

## Architecture

```
┌──────────┐     ┌───────────┐     ┌─────────┐     ┌────────┐     ┌────────┐
│ Scraper  │────▶│ Firestore │────▶│ Builder │────▶│ GitHub │────▶│ Vercel │
│(Cloud Run)│     │           │     │(Cloud Run)│     │        │     │(Static)│
└──────────┘     └───────────┘     └─────────┘     └────────┘     └────────┘
  6 AM UK          Database           7 AM UK        Auto-commit    Auto-deploy
```

1. **Scraper**: Runs daily at 6 AM UK, scrapes 8 roasters → Firestore
2. **Builder**: Runs daily at 7 AM UK, exports JSON → commits to GitHub
3. **Vercel**: Auto-deploys on GitHub push → serves static site globally

## Tech Stack

- **Scraper**: Rust + Shopify scraper (Cloud Run)
- **Builder**: Rust + Git automation (Cloud Run)
- **Frontend**: Next.js + Leaflet maps + Tailwind CSS
- **Database**: Firestore (temporary storage)
- **Infrastructure**: Terraform (GCP)
- **Hosting**: Vercel (frontend CDN)
- **Automation**: Cloud Scheduler

## Quick Start

```bash
# 1. Deploy GCP infrastructure
cd terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values
terraform init && terraform apply

# 2. Build and deploy services
cd ../scraper && ./build.sh $PROJECT_ID
cd ../builder && ./build.sh $PROJECT_ID

# 3. Deploy frontend to Vercel
cd ../frontend
vercel --prod
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

## Project Structure

```
.
├── scraper/              # Rust coffee scraper service
│   ├── src/main.rs      # Scraper with Shopify support
│   ├── Dockerfile       # Container config
│   └── build.sh         # Build script
├── builder/              # Rust build service
│   ├── src/main.rs      # Firestore → JSON → GitHub
│   ├── Dockerfile       # Container config
│   └── build.sh         # Build script
├── frontend/             # Next.js static site
│   ├── app/             # Next.js app router
│   ├── components/      # React components (Map, Filters)
│   ├── public/data/     # Generated JSON files
│   └── vercel.json      # Vercel config
├── terraform/            # Infrastructure as code
│   ├── main.tf          # GCP resources
│   ├── variables.tf     # Configuration
│   └── outputs.tf       # Deployment info
├── DEPLOYMENT.md         # Full deployment guide
├── SCRAPER_INFO.md       # Scraper documentation
└── README.md             # This file
```

## Data Flow

```
1. Daily 6 AM UK:  Scraper scrapes UK roasters → saves to Firestore
2. Daily 7 AM UK:  Builder exports Firestore → JSON files
3. Automatic:      Builder commits JSON to GitHub
4. Automatic:      GitHub push triggers Vercel deployment
5. ~2 min later:   Fresh data live on site!
```

## Development

### Local Scraper

```bash
cd scraper
cargo run
```

### Local Builder

```bash
cd builder
export GCP_PROJECT_ID="your-project"
export GITHUB_TOKEN="your-token"
export REPO_URL="github.com/user/repo"
cargo run
```

### Local Frontend

```bash
cd frontend
npm install
npm run dev
# Visit http://localhost:3000
```

### Google Analytics (Optional)

To enable Google Analytics tracking:

1. Create a Google Analytics 4 property at https://analytics.google.com
2. Get your Measurement ID (format: `G-XXXXXXXXXX`)
3. Create a `.env.local` file in the `frontend/` directory:
   ```bash
   NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
   ```
4. For Vercel deployment, add the environment variable in your Vercel project settings

The site will work without Google Analytics - it's completely optional.

## Documentation

- [DEPLOYMENT.md](DEPLOYMENT.md) - Complete deployment guide
- [SCRAPER_INFO.md](SCRAPER_INFO.md) - Scraper implementation details
- [SETUP.md](SETUP.md) - Original setup notes

## Contributing

Contributions welcome! To add new roasters:

1. Add scraper function in `scraper/src/main.rs`
2. Most UK roasters use Shopify - use `scrape_shopify_store()` helper
3. Update `SCRAPER_INFO.md` with new roaster details
4. Test locally with `cargo run`

## License

MIT
