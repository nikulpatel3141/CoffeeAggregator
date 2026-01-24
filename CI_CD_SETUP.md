# Coffee Aggregator Setup Guide

This guide explains how to set up the Coffee Aggregator application with automated daily scraping and deployment.

## Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│              GitHub Actions                           │
│                                                       │
│  Daily at 6 AM UK (or manual trigger)                │
│                                                       │
│  Job 1: Scrape  ──────────▶  Job 2: Build           │
│  - Run scraper Rust code    - Run builder Rust code  │
│  - Write to Firestore       - Read from Firestore    │
│                             - Push to website repo    │
└───────────────────────┬───────────────────────────────┘
                        │
                        ▼
              ┌──────────────────┐
              │  GCP Firestore   │  (Database)
              └──────────────────┘
                        │
                        ▼
          ┌─────────────────────────┐
          │  CoffeeAggregatorWebsite │  (GitHub Repo)
          └────────────┬─────────────┘
                       │
                       ▼
                ┌─────────────┐
                │   Vercel    │  (Hosting)
                └─────────────┘
```

## Quick Start

### Step 1: Set Up GCP Infrastructure

```bash
export PROJECT_ID="coffee-aggregator-project"  # Replace with your project ID

# Navigate to terraform directory
cd terraform

# Initialize Terraform
terraform init

# Review the plan
terraform plan -var="project_id=$PROJECT_ID"

# Apply the configuration (creates Firestore + service account)
terraform apply -var="project_id=$PROJECT_ID"
```

This creates:
- Firestore database (for storing coffee data)
- Service account `github-actions-coffee@PROJECT_ID.iam.gserviceaccount.com` with Firestore access

### Step 2: Create Service Account Key

```bash
# Create and download service account key for GitHub Actions
gcloud iam service-accounts keys create github-actions-key.json \
  --iam-account=github-actions-coffee@${PROJECT_ID}.iam.gserviceaccount.com

# Display the key (you'll need this for GitHub Secrets)
cat github-actions-key.json
```

### Step 3: Create GitHub Personal Access Token

**Option A: Fine-grained token (Recommended - Most Secure)**

1. Go to https://github.com/settings/personal-access-tokens/new
2. Configure:
   - **Token name**: `coffee-aggregator-builder`
   - **Expiration**: 90 days (or custom)
   - **Repository access**: Only select repositories → `CoffeeAggregatorWebsite`
   - **Repository permissions**:
     - Contents: **Read and write** (for pushing commits)
3. Click **Generate token**
4. Copy the token (starts with `github_pat_...`)

**Option B: Classic token (Simpler)**

1. Go to https://github.com/settings/tokens/new
2. Select scopes:
   - ✅ `public_repo` (if CoffeeAggregatorWebsite is public)
   - ✅ OR `repo` (if CoffeeAggregatorWebsite is private)
3. Click **Generate token**
4. Copy the token (starts with `ghp_...`)

**Note**: Fine-grained tokens are more secure as they limit access to just the website repo.

### Step 4: Add GitHub Repository Secrets

1. Go to your GitHub repository: https://github.com/nikulpatel3141/CoffeeAggregator
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add these three secrets:

**Secret 1: GCP_PROJECT_ID**
- Name: `GCP_PROJECT_ID`
- Value: `coffee-aggregator-project` (your actual project ID)

**Secret 2: GCP_SA_KEY**
- Name: `GCP_SA_KEY`
- Value: The entire contents of `github-actions-key.json` (copy everything including braces)

**Secret 3: GITHUB_PAT**
- Name: `GITHUB_PAT`
- Value: Your GitHub Personal Access Token from Step 3

### Step 5: Test the Workflow

**Manual Test:**
1. Go to **Actions** tab in your GitHub repository
2. Click **Coffee Scraper & Builder Pipeline**
3. Click **Run workflow** → **Run workflow**
4. Watch the workflow run (takes ~5-10 minutes)

**Verify:**
- Job 1 (Scrape) should complete successfully
- Job 2 (Build) should run after scrape completes
- Check https://github.com/nikulpatel3141/CoffeeAggregatorWebsite for new commits
- Check https://coffee-aggregator-website.vercel.app/ for updated coffees

### Step 6: Schedule Runs Automatically

The workflow is already configured to run daily at 6 AM UK time. No additional setup needed!

The schedule is defined in `.github/workflows/scraper-builder-pipeline.yml`:
```yaml
on:
  schedule:
    - cron: '0 6 * * *'  # 6 AM UTC (6 AM UK in winter, 5 AM UK in summer)
```

## How It Works

### Daily Workflow

1. **6 AM UK Time**: GitHub Actions automatically triggers the workflow
2. **Scrape Job**:
   - Checks out code
   - Installs Rust
   - Runs scraper (`cargo run --release` in `scraper/`)
   - Scraper fetches coffee data from roaster websites
   - Writes data to Firestore (using staging collection pattern for safety)
3. **Build Job** (runs after scrape):
   - Checks out code
   - Installs Rust
   - Runs builder (`cargo run --release` in `builder/`)
   - Reads coffee data from Firestore
   - Generates JSON files
   - Commits and pushes to CoffeeAggregatorWebsite repo
4. **Vercel Deployment**:
   - Detects new commit in website repo
   - Automatically builds and deploys the frontend
   - Site updates with fresh coffee data

### What Gets Scraped

Currently configured roasters:
- **HasBean Coffee** - Specialty coffee from Stafford
- **Square Mile Coffee** - London-based specialty roaster
- **Curve Roasters** - Margate specialty roaster
- **Origin Coffee** - Cornwall specialty roaster

Filters applied:
- ✅ Maximum price: £50
- ✅ Excludes: bundles, subscriptions, samples, tasters
- ✅ Only in-stock items

### Data Safety

The scraper uses a **staging collection pattern**:
1. Scrapes all coffee data
2. Writes to `coffees_staging` collection
3. Only if successful: deletes `coffees` collection
4. Copies staging → production
5. Clears staging

This ensures you always have data even if scraping fails mid-way.

## Manual Operations

### Run Scraper Manually

```bash
cd scraper

# Set environment variable
export GCP_PROJECT_ID="coffee-aggregator-project"

# Run the scraper
cargo run --release
```

### Run Builder Manually

```bash
cd builder

# Set environment variables
export GCP_PROJECT_ID="coffee-aggregator-project"
export REPO_URL="github.com/nikulpatel3141/CoffeeAggregatorWebsite"
export TARGET_BRANCH="main"
export GITHUB_TOKEN="your-github-pat"

# Run the builder
cargo run --release
```

### View Firestore Data

```bash
# List collections
gcloud firestore collections list --project=$PROJECT_ID

# Export data (requires Cloud Storage bucket)
gcloud firestore export gs://BUCKET_NAME --project=$PROJECT_ID
```

## Troubleshooting

### Workflow fails with "GCP_PROJECT_ID not set"

**Problem**: GitHub secret not configured correctly

**Solution**:
1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Verify `GCP_PROJECT_ID` exists and has correct value
3. Re-run workflow

### Workflow fails with "Permission denied" accessing Firestore

**Problem**: Service account lacks Firestore permissions

**Solution**:
```bash
# Grant Firestore access
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions-coffee@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/datastore.user"
```

### Build job fails to push to website repo

**Problem**: GitHub PAT is invalid or lacks permissions

**Solution**:
1. Create a new Personal Access Token with `repo` scope
2. Update `GITHUB_PAT` secret in repository settings
3. Re-run workflow

### No coffees appearing on website

**Problem**: Data in `coffees_staging` but not in `coffees` collection

**Solution**:
```bash
# Check Firestore collections
gcloud firestore collections list --project=$PROJECT_ID

# If only staging exists, manually trigger workflow to retry
# Or manually copy data using Firestore console
```

### Workflow uses too many GitHub Actions minutes

**Problem**: Workflow runs longer than expected

**Current Usage**: ~10-15 minutes per run = ~300-450 minutes/month (well within 2000 free minutes)

**If needed**:
- Reduce frequency: Change cron to weekly (`0 6 * * 1` = Mondays only)
- Use caching (already enabled via `Swatinem/rust-cache@v2`)

## Cost Breakdown

| Service | Usage | Cost |
|---------|-------|------|
| **GitHub Actions** | ~300-450 min/month | **Free** (2000/month free tier) |
| **GCP Firestore** | <1GB, <1M reads/month | **Free** (free tier) |
| **Vercel** | 100 deployments/month | **Free** (hobby plan) |

**Total: $0/month** 🎉

## Modifying the Schedule

Edit `.github/workflows/scraper-builder-pipeline.yml`:

```yaml
on:
  schedule:
    # Examples:
    - cron: '0 6 * * *'     # Daily at 6 AM UTC
    - cron: '0 6 * * 1'     # Mondays only at 6 AM UTC
    - cron: '0 6 * * 1,4'   # Mondays and Thursdays at 6 AM UTC
    - cron: '0 */6 * * *'   # Every 6 hours
```

Commit and push changes to activate the new schedule.

## Adding New Roasters

1. Edit `scraper/src/main.rs`
2. Add new scraper function (follow existing patterns like `scrape_hasbean`)
3. Add to `all_coffees` vector in `scrape_all` function
4. Test locally:
   ```bash
   cd scraper
   cargo run --release
   ```
5. Commit and push - workflow will auto-deploy

## Security Notes

- ✅ Service account has minimal permissions (Firestore access only)
- ✅ GitHub secrets are encrypted at rest
- ✅ Personal Access Token scoped to `repo` only
- ✅ All resources are private (no public endpoints)
- ✅ Firestore has security rules (configure via console if needed)

**Best Practices**:
- Rotate GitHub PAT every 90 days
- Rotate service account key annually
- Never commit `github-actions-key.json` to git (in `.gitignore`)
- Review Firestore data periodically

## Cleanup

To tear down the infrastructure:

```bash
# Delete Terraform-managed resources
cd terraform
terraform destroy -var="project_id=$PROJECT_ID"

# Delete service account key
rm github-actions-key.json

# Revoke GitHub Personal Access Token
# Go to https://github.com/settings/tokens and click "Delete"
```

## Support

- View workflow logs: **Actions** tab in GitHub repository
- View Firestore data: https://console.cloud.google.com/firestore
- Check website: https://coffee-aggregator-website.vercel.app/
- Check Vercel deployments: https://vercel.com/dashboard

## Migration from Cloud Run Architecture

If you're migrating from the previous Cloud Run + Cloud Workflows architecture:

1. **Terraform will destroy old resources**: Cloud Run services, Cloud Workflows, Cloud Scheduler, storage buckets, and 4 service accounts
2. **Run `terraform plan` first** to review what will be deleted
3. **Backup data if needed**:
   ```bash
   gcloud firestore export gs://backup-bucket --project=$PROJECT_ID
   ```
4. **Apply new configuration**:
   ```bash
   terraform apply -var="project_id=$PROJECT_ID"
   ```
5. **Old GitHub Actions workflow** (`.github/workflows/build-images.yml`) is no longer used and can be deleted

The new architecture is **70% simpler** with only 1 GCP service (Firestore) instead of 6.
