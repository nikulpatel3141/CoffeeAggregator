# CI/CD Setup Guide

This guide explains how to set up automatic Docker image builds using GitHub Actions.

## Quick Start

### Step 1: Create Terraform State Bucket

```bash
export PROJECT_ID="coffee-aggregator-project"  # Replace with your project ID

# Create bucket for Terraform state storage (required for CI/CD)
gsutil mb -p $PROJECT_ID -l europe-west2 gs://coffee-aggregator-terraform-state

# Enable versioning for state file safety
gsutil versioning set on gs://coffee-aggregator-terraform-state
```

### Step 2: Create GCP Service Account

```bash
# Create service account
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions CI/CD" \
  --project=$PROJECT_ID

# Grant necessary permissions for GCR and Terraform
# storage.objectCreator: Create new objects (push images)
# storage.objectViewer: View objects (check existing layers)
# run.admin: Manage Cloud Run services (for Terraform)
# iam.serviceAccountUser: Use service accounts (for Cloud Run)
# workflows.admin: Manage Cloud Workflows (for Terraform)
# cloudscheduler.admin: Manage Cloud Scheduler (for Terraform)
# secretmanager.viewer: View secrets (for Terraform state)

# Storage permissions (for Docker images)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/storage.objectCreator"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/storage.objectViewer"

# Artifact Registry permissions (for Docker images - newer GCP service)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

# Cloud Run permissions (for Terraform deployments)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/run.admin"

# IAM permissions (to assign service accounts to Cloud Run)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

# Workflows permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/workflows.admin"

# Cloud Scheduler permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/cloudscheduler.admin"

# Firestore permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/datastore.owner"

# Service Account Admin (to create/manage service accounts)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountAdmin"

# Secret Manager permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/secretmanager.viewer"

# Service Usage permissions (to enable APIs)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/serviceusage.serviceUsageAdmin"

# Create and download service account key
gcloud iam service-accounts keys create github-actions-key.json \
  --iam-account=github-actions@${PROJECT_ID}.iam.gserviceaccount.com
```

### Step 3: Add GitHub Repository Secrets

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add these two secrets:

**Secret 1:**
- Name: `GCP_PROJECT_ID`
- Value: `coffee-aggregator-project` (your actual project ID)

**Secret 2:**
- Name: `GCP_SA_KEY`
- Value: The entire contents of `github-actions-key.json`
  ```bash
  cat github-actions-key.json
  # Copy the entire output
  ```

### Step 4: Initialize Terraform with Remote State

```bash
cd terraform

# Initialize Terraform with the GCS backend
terraform init

# If you have existing local state, migrate it:
# terraform init -migrate-state
```

### Step 5: Initial Manual Build (Required!)

**IMPORTANT**: You must build the images manually once before Terraform can work:

```bash
# Authenticate with GCP
gcloud auth configure-docker

# Build and push scraper
cd scraper
./build.sh $PROJECT_ID

# Build and push builder
cd ../builder
./build.sh $PROJECT_ID
```

This creates the initial images in Google Container Registry.

### Step 6: Run Terraform

Now that the images exist, you can run Terraform:

```bash
cd terraform
terraform apply
```

### Step 7: Push to Main Branch

After the initial setup, pushing any changes to `main` branch will automatically:
1. Build updated Docker images
2. Push them to GCR
3. Automatically bump deployment versions in Terraform
4. Run `terraform apply` to deploy the new versions
5. Commit the version bump back to the repository

## How It Works

The GitHub Actions workflow (`.github/workflows/build-images.yml`) automatically runs when you:
- Push to the `main` branch
- Modify files in `scraper/**`, `builder/**`, or `terraform/**`
- Update the workflow file itself

The workflow:
1. Checks out your code
2. Authenticates with GCP using the service account key
3. Builds both Docker images
4. Pushes them to Google Container Registry with the `latest` tag
5. **Automatically bumps deployment versions** (v8 → v9, etc.)
6. Runs `terraform init` and `terraform apply`
7. Commits the version bump back to main branch
8. Cloud Run picks up the new images with the bumped version

## Workflow Triggers

The workflow runs on:
```yaml
on:
  push:
    branches:
      - main
    paths:
      - 'scraper/**'
      - 'builder/**'
      - 'terraform/**'
      - '.github/workflows/build-images.yml'
```

This means:
- ✅ Changes to scraper code → triggers build and deploy
- ✅ Changes to builder code → triggers build and deploy
- ✅ Changes to terraform files → triggers deploy
- ✅ Changes to workflow → triggers build and deploy
- ❌ Changes only to frontend → does NOT trigger workflow
- ❌ Changes only to README files → does NOT trigger workflow

**Important**: When terraform files change without code changes, the workflow will:
- Skip building Docker images (they haven't changed)
- Still run `terraform apply` to deploy infrastructure changes

## Viewing Build Status

1. Go to your repository → **Actions** tab
2. Click on the latest workflow run
3. View the "Build and Push Images" job
4. Check logs for each step

## Manual Workflow Trigger

You can also trigger the workflow manually:
1. Go to **Actions** tab
2. Select "Build and Push Docker Images"
3. Click **Run workflow**
4. Select branch and click **Run workflow**

## Verifying Images in GCR

```bash
# List all images
gcloud container images list --repository=gcr.io/$PROJECT_ID

# Check image details
gcloud container images describe gcr.io/$PROJECT_ID/coffee-scraper:latest
gcloud container images describe gcr.io/$PROJECT_ID/coffee-builder:latest
```

## Troubleshooting

### Error: "Image not found" when running Terraform

**Problem**: Terraform tries to create Cloud Run services but the Docker images don't exist yet.

**Solution**: Build images manually first (Step 3 above), then run Terraform.

### Error: "Authentication failed" in GitHub Actions

**Problem**: GCP service account key is incorrect or missing permissions.

**Solution**:
1. Verify `GCP_SA_KEY` secret contains the full JSON
2. Check service account has `roles/storage.objectCreator` and `roles/storage.objectViewer`
3. Re-create the service account key if needed

### Error: "Permission denied" when pushing to GCR

**Problem**: Service account lacks permissions.

**Solution**:
```bash
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/storage.objectCreator"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/storage.objectViewer"
```

### Workflow doesn't trigger

**Problem**: Changes pushed to wrong branch or wrong directory.

**Solution**: Ensure:
- Pushing to `main` branch
- Modified files are in `scraper/`, `builder/`, or workflow file

## Security Notes

- The service account key grants access to push Docker images
- Keep `github-actions-key.json` secure and **never commit it to git**
- The key is stored as an encrypted GitHub secret
- Consider rotating the key periodically
- For production, use Workload Identity Federation instead (more secure but complex)

## Cleanup

To delete the service account:

```bash
# Delete the service account
gcloud iam service-accounts delete \
  github-actions@${PROJECT_ID}.iam.gserviceaccount.com \
  --project=$PROJECT_ID

# Delete local key file
rm github-actions-key.json
```
