# Deployment Guide

## Architecture Overview

The CoffeeTracker uses a static site architecture with automated data updates:

```
┌──────────────┐     ┌────────────┐     ┌──────────┐     ┌────────┐
│   Scraper    │────▶│ Firestore  │────▶│ Builder  │────▶│ GitHub │
│  (Cloud Run) │     │            │     │(Cloud Run)│     │        │
└──────────────┘     └────────────┘     └──────────┘     └────────┘
   Daily 6 AM UK         Database         Daily 7 AM UK        │
                                                                │
                                                                ▼
                                                          ┌──────────┐
                                                          │  Vercel  │
                                                          │ (Static) │
                                                          └──────────┘
```

## Components

1. **Scraper** (GCP Cloud Run)
   - Runs daily at 6 AM UK time
   - Scrapes 8 UK coffee roasters
   - Stores data in Firestore

2. **Builder** (GCP Cloud Run)
   - Runs daily at 7 AM UK time (after scraping)
   - Reads data from Firestore
   - Exports to JSON files
   - Commits to GitHub (`frontend/public/data/`)

3. **Frontend** (Vercel)
   - Static Next.js site
   - Reads from `/data/coffees.json`
   - Auto-deploys when GitHub updates
   - Displays interactive map

## Setup Instructions

### 1. GCP Setup

```bash
# Set your project ID
export PROJECT_ID="your-gcp-project-id"

# Set the project
gcloud config set project $PROJECT_ID

# Enable required APIs
gcloud services enable \
  run.googleapis.com \
  firestore.googleapis.com \
  cloudscheduler.googleapis.com \
  cloudbuild.googleapis.com

# Authenticate Docker with GCR
gcloud auth configure-docker
```

### 2. GitHub Personal Access Token

Create a GitHub Personal Access Token with `repo` permissions:

1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Generate new token (classic)
3. Select scope: `repo` (Full control of private repositories)
4. Copy the token (you won't see it again!)

### 3. Terraform Infrastructure

```bash
cd terraform

# Copy and configure variables
cp terraform.tfvars.example terraform.tfvars

# Edit terraform.tfvars with your values:
# - project_id: Your GCP project ID
# - github_token: Your GitHub Personal Access Token
# - repo_url: github.com/yourusername/CoffeeTracker

# Initialize Terraform
terraform init

# Review the plan
terraform plan

# Apply (creates all infrastructure)
terraform apply
```

This creates:
- Firestore database
- Cloud Run service for scraper
- Cloud Run service for builder
- Cloud Scheduler jobs (scraper at 6 AM, builder at 7 AM UK time)
- Service accounts and IAM permissions

### 4. Build and Deploy Scraper

```bash
cd ../scraper

# Build and push Docker image
./build.sh $PROJECT_ID

# The Cloud Run service will automatically use the latest image
# Cloud Scheduler will trigger it daily at 6 AM UK time
```

### 5. Build and Deploy Builder

```bash
cd ../builder

# Build and push Docker image
./build.sh $PROJECT_ID

# The Cloud Run service will automatically use the latest image
# Cloud Scheduler will trigger it daily at 7 AM UK time
```

### 6. Deploy Frontend to Vercel

#### Option A: Vercel Dashboard (Recommended)

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New Project"
3. Import your GitHub repository
4. Vercel auto-detects Next.js
5. Set Root Directory to `frontend`
6. Click "Deploy"

#### Option B: Vercel CLI

```bash
cd frontend

# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

### 7. Configure Auto-Deployment

Vercel automatically redeploys when you push to GitHub. The workflow:

1. **Daily 6 AM UK**: Scraper runs → updates Firestore
2. **Daily 7 AM UK**: Builder runs → exports to JSON → commits to GitHub
3. **Automatic**: GitHub commit → triggers Vercel deployment
4. **~2 minutes later**: New data live on your site!

## Manual Triggers

### Trigger Scraper Manually

```bash
# Get scraper URL from Terraform outputs
SCRAPER_URL=$(cd terraform && terraform output -raw scraper_url)

# Trigger scrape
curl -X POST $SCRAPER_URL
```

### Trigger Builder Manually

```bash
# Get builder URL from Terraform outputs
BUILDER_URL=$(cd terraform && terraform output -raw builder_url)

# Trigger build
curl -X POST $BUILDER_URL
```

This will:
1. Read from Firestore
2. Export to `frontend/public/data/coffees.json`
3. Commit and push to GitHub
4. Trigger Vercel deployment automatically

## Development

### Local Scraper Development

```bash
cd scraper
cargo run
```

### Local Builder Development

```bash
cd builder

# Set environment variables
export GCP_PROJECT_ID="your-project-id"
export GITHUB_TOKEN="your-token"
export REPO_URL="github.com/username/CoffeeTracker"

cargo run
```

### Local Frontend Development

```bash
cd frontend
npm install
npm run dev
# Visit http://localhost:3000
```

## Data Structure

### Generated Files

The builder creates these files in `frontend/public/data/`:

1. **coffees.json** - All coffees from all roasters
2. **metadata.json** - Build metadata (timestamp, counts)
3. **[roaster-name].json** - Individual roaster files (optional)

### Sample Coffee Object

```json
{
  "name": "Ethiopia Guji Hambela",
  "roaster": "Pact Coffee",
  "origin": "Ethiopia",
  "region": "Ethiopia",
  "tasting_notes": ["Blueberry", "Jasmine", "Stone fruit"],
  "price": "£9.00",
  "url": "https://www.pactcoffee.com/coffees/...",
  "in_stock": true,
  "scraped_at": "2026-01-09T06:00:00Z"
}
```

## Monitoring

### Check Scraper Logs

```bash
gcloud run logs read coffee-scraper --region europe-west2
```

### Check Builder Logs

```bash
gcloud run logs read coffee-builder --region europe-west2
```

### Check Scheduler Status

```bash
gcloud scheduler jobs list
gcloud scheduler jobs describe daily-coffee-scrape
gcloud scheduler jobs describe daily-coffee-build
```

### View Firestore Data

```bash
# Via gcloud
gcloud firestore documents list coffees

# Via Firebase Console
# Go to console.firebase.google.com → Firestore Database
```

## Cost Estimates

Using GCP Free Tier:

- **Firestore**: Free tier includes 1 GB storage, 50K reads/day
- **Cloud Run**: 2 million requests/month free, 360K GB-seconds memory free
- **Cloud Scheduler**: 3 jobs free per month
- **Storage**: 5 GB free (not used anymore, only for build artifacts)

**Estimated monthly cost**: $0-5 (well within free tier for daily scraping)

**Vercel**: Free tier includes unlimited deployments and bandwidth

## Troubleshooting

### Builder not committing to GitHub

1. Check GitHub token has `repo` permissions
2. Verify token is not expired
3. Check builder logs: `gcloud run logs read coffee-builder`
4. Verify repo_url format: `github.com/username/repo` (no https://)

### Frontend not showing new data

1. Check if data file exists: `frontend/public/data/coffees.json`
2. Verify Vercel deployment succeeded
3. Check if GitHub commit triggered deployment
4. Hard refresh browser (Ctrl+Shift+R)

### Scraper failing

1. Check scraper logs
2. Verify website selectors haven't changed
3. Test scraper locally
4. Check Firestore permissions

## Security

- GitHub token stored as Terraform sensitive variable
- Builder Cloud Run service has internal-only ingress (only Cloud Scheduler can trigger)
- Scraper allows public API access for health checks
- Firestore rules should be configured for production use
