# GitHub Actions Setup for Automatic Docker Builds

This workflow automatically builds and pushes Docker images to Google Container Registry (GCR) when you push to the main branch.

## Prerequisites

You need to set up authentication between GitHub Actions and Google Cloud Platform.

## Option A: Service Account Key (Simpler, Less Secure)

### 1. Create a Service Account

```bash
# Set your project ID
export PROJECT_ID="your-gcp-project-id"

# Create service account
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions"

# Grant permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

# Create and download key
gcloud iam service-accounts keys create key.json \
  --iam-account=github-actions@${PROJECT_ID}.iam.gserviceaccount.com
```

### 2. Add GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions → New repository secret

Add these secrets:
- `GCP_PROJECT_ID`: Your GCP project ID (e.g., `coffee-aggregator-project`)
- `GCP_SA_KEY`: The entire contents of the `key.json` file

### 3. Update Workflow File

Replace `.github/workflows/build-images.yml` with this simpler version:

```yaml
name: Build and Push Docker Images

on:
  push:
    branches:
      - main
    paths:
      - 'scraper/**'
      - 'builder/**'
      - '.github/workflows/build-images.yml'

env:
  PROJECT_ID: ${{ secrets.GCP_PROJECT_ID }}

jobs:
  build-and-push:
    name: Build and Push Images
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v2

      - name: Configure Docker
        run: gcloud auth configure-docker

      - name: Build and push scraper
        run: |
          docker build -t gcr.io/$PROJECT_ID/coffee-scraper:latest ./scraper
          docker push gcr.io/$PROJECT_ID/coffee-scraper:latest

      - name: Build and push builder
        run: |
          docker build -t gcr.io/$PROJECT_ID/coffee-builder:latest ./builder
          docker push gcr.io/$PROJECT_ID/coffee-builder:latest
```

## Option B: Workload Identity Federation (More Secure, Recommended)

See [Google's official guide](https://github.com/google-github-actions/auth#setting-up-workload-identity-federation) for setting up Workload Identity Federation.

## Manual First Build

Before the workflow can run automatically, you need to build the images manually once:

```bash
cd scraper
./build.sh $PROJECT_ID

cd ../builder
./build.sh $PROJECT_ID
```

After this, future pushes to `main` will automatically rebuild the images.

## Triggering the Workflow

The workflow runs automatically when you push changes to:
- `scraper/**` (any file in the scraper directory)
- `builder/**` (any file in the builder directory)
- `.github/workflows/build-images.yml` (the workflow file itself)

You can also trigger it manually from the Actions tab in GitHub.

## Verification

After pushing to main:
1. Go to your repository → Actions tab
2. Click on the latest workflow run
3. Check that both "Build Scraper Image" and "Build Builder Image" jobs succeeded
4. Verify images in GCR:
   ```bash
   gcloud container images list --repository=gcr.io/$PROJECT_ID
   ```
