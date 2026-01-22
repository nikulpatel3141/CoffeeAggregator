# Deployment Guide

## Architecture Overview

The Coffee Aggregator uses a static site architecture with automated data pipeline:

```
┌────────────────┐
│ Cloud Scheduler│  Daily 6 AM UK
└───────┬────────┘
        │
        ▼
┌─────────────────┐
│ Cloud Workflows │  Orchestrates pipeline
└───────┬─────────┘
        │
        ├──▶ ┌──────────────┐     ┌────────────┐
        │    │   Scraper    │────▶│ Firestore  │
        │    │  (Cloud Run) │     │  Database  │
        │    └──────────────┘     └─────┬──────┘
        │                               │
        └──▶ ┌──────────────┐          │
             │   Builder    │◀─────────┘
             │  (Cloud Run) │
             └──────┬───────┘
                    │ GitHub App Auth
                    ▼
              ┌──────────┐
              │  GitHub  │  (build branch)
              └─────┬────┘
                    │ Auto-deploy
                    ▼
              ┌──────────┐
              │  Vercel  │
              │ (Static) │
              └──────────┘
```

## Components

1. **Cloud Workflows** (Orchestration)
   - Triggered daily at 6 AM UK time
   - Runs scraper → builder as atomic pipeline
   - Built-in error handling and retries
   - Free tier: 5000 internal steps/month

2. **Scraper** (GCP Cloud Run)
   - Scrapes 10 UK coffee roasters
   - Stores data in Firestore
   - Triggered by workflow

3. **Builder** (GCP Cloud Run)
   - Reads data from Firestore
   - Exports to JSON files
   - Uses GitHub App for authentication
   - Commits to `build` branch (configurable)
   - Triggered by workflow after scraper

4. **Frontend** (Vercel)
   - Static Next.js site
   - Reads from `/data/coffees.json`
   - Auto-deploys from `build` branch
   - Displays interactive coffee catalog

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
  cloudbuild.googleapis.com \
  workflows.googleapis.com \
  secretmanager.googleapis.com

# Authenticate Docker with GCR
gcloud auth configure-docker
```

### 2. GitHub App Setup

Instead of using a Personal Access Token, we use GitHub Apps for better security:

1. **Create a GitHub App** - Follow detailed instructions in [GITHUB_APP_SETUP.md](./GITHUB_APP_SETUP.md)
   - Go to https://github.com/settings/apps/new
   - Name: "CoffeeAggregator Builder"
   - Permissions: Contents (Read and write)
   - Generate and download private key

2. **Store credentials in Secret Manager**:
   ```bash
   # App ID (e.g., 123456)
   echo -n "YOUR_APP_ID" | gcloud secrets create github-app-id --data-file=-

   # Installation ID (e.g., 12345678)
   echo -n "YOUR_INSTALLATION_ID" | gcloud secrets create github-app-installation-id --data-file=-

   # Private key
   gcloud secrets create github-app-private-key --data-file=/path/to/your-app.private-key.pem
   ```

3. **Create target branch** (if using same repo):
   ```bash
   git checkout -b build
   git push -u origin build
   ```

### 3. Build and Push Docker Images

**IMPORTANT**: Build and push Docker images BEFORE running Terraform!

You have two options:

#### Option A: Manual Build (Quickest)

```bash
# Authenticate Docker with GCR
gcloud auth configure-docker

# Build and push scraper image
cd scraper
./build.sh $PROJECT_ID

# Build and push builder image
cd ../builder
./build.sh $PROJECT_ID
```

#### Option B: Set up CI/CD First (Recommended for ongoing development)

Set up GitHub Actions to automatically build images on every push to main.
See [CI_CD_SETUP.md](./CI_CD_SETUP.md) for detailed instructions.

**Quick version:**
1. Create GCP service account with storage.admin role
2. Add `GCP_PROJECT_ID` and `GCP_SA_KEY` to GitHub repository secrets
3. Manual build once (as shown in Option A)
4. Future pushes to `main` will auto-build images

After CI/CD setup, any code changes trigger automatic rebuilds!

### 4. Terraform Infrastructure

Now that the Docker images exist in GCR, we can create the infrastructure:

```bash
cd ../terraform

# Copy and configure variables
cp terraform.tfvars.example terraform.tfvars

# Edit terraform.tfvars with your values:
# - project_id: Your GCP project ID
# - repo_url: github.com/yourusername/CoffeeAggregator (or CoffeeAggregatorWebsite)
# - target_branch: build (or main if using separate repo)
# Note: No github_token needed! GitHub App handles authentication.

# Initialize Terraform
terraform init

# Review the plan
terraform plan

# Apply (creates all infrastructure)
terraform apply
```

This creates:
- Firestore database
- Cloud Run services for scraper and builder (using your Docker images)
- Cloud Workflows pipeline (orchestrates scraper → builder)
- Cloud Scheduler job (triggers workflow at 6 AM UK time)
- Service accounts and IAM permissions
- Secret Manager IAM bindings

### 5. Deploy Frontend to Vercel

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

### 6. Configure Auto-Deployment

Vercel automatically redeploys when you push to GitHub. The workflow:

1. **Daily 6 AM UK**: Cloud Workflows triggers → Scraper runs → updates Firestore
2. **Immediately after**: Builder runs → exports to JSON → commits to GitHub
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
