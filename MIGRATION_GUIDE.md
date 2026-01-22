# Migration Guide: PAT to GitHub Apps

This guide helps you migrate from the old Personal Access Token (PAT) setup to the new GitHub Apps authentication.

## What's Changed

### Old Architecture (PAT-based)
```
Cloud Scheduler (6 AM) → Scraper → Firestore
Cloud Scheduler (7 AM) → Builder → GitHub (main branch)
```
- Used GitHub Personal Access Token
- Two separate scheduled jobs with 1-hour delay
- Pushed directly to main branch
- PAT stored in Terraform variables

### New Architecture (GitHub Apps)
```
Cloud Scheduler (6 AM) → Cloud Workflows
                           ↓
                         Scraper → Firestore
                           ↓
                         Builder → GitHub (build branch)
```
- Uses GitHub App with short-lived tokens
- Single orchestrated pipeline
- Pushes to configurable branch (default: `build`)
- Credentials stored in GCP Secret Manager

## Benefits

1. **No PAT in Terraform**: Secrets stored securely in Secret Manager
2. **Atomic Pipeline**: Scraper and builder run sequentially without delays
3. **Branch Protection**: Can push to separate branch or repo
4. **Better Security**: Short-lived tokens (1 hour) vs permanent PAT
5. **Audit Trail**: All commits clearly identified as bot

## Migration Steps

### Step 1: Create GitHub App

Follow the instructions in [GITHUB_APP_SETUP.md](./GITHUB_APP_SETUP.md) to:
1. Create a GitHub App
2. Generate private key
3. Install the app on your repository
4. Note the App ID and Installation ID

### Step 2: Store Credentials in Secret Manager

```bash
# Set your GCP project
export PROJECT_ID="your-project-id"
gcloud config set project $PROJECT_ID

# Enable Secret Manager API
gcloud services enable secretmanager.googleapis.com

# Create secrets (replace with your actual values)
echo -n "123456" | gcloud secrets create github-app-id --data-file=-
echo -n "12345678" | gcloud secrets create github-app-installation-id --data-file=-
gcloud secrets create github-app-private-key --data-file=/path/to/your-app.private-key.pem
```

### Step 3: Create Build Branch (Optional)

If using the same repo with a separate build branch:

```bash
# Clone your repo
git clone https://github.com/nikulpatel3141/CoffeeAggregator.git
cd CoffeeAggregator

# Create and push build branch
git checkout -b build
git push -u origin build
```

**OR** create a separate repository called `CoffeeAggregatorWebsite` if you prefer complete separation.

### Step 4: Update Terraform Configuration

1. **Update `terraform.tfvars`**:
   ```hcl
   project_id    = "your-gcp-project-id"
   region        = "europe-west2"

   # Remove this line:
   # github_token  = "ghp_xxxx..."

   # Update these:
   repo_url      = "github.com/nikulpatel3141/CoffeeAggregator"
   target_branch = "build"  # or "main" if using separate repo
   ```

2. **Rebuild the builder Docker image** (includes new GitHub App code):
   ```bash
   cd builder
   ./build.sh
   ```

3. **Apply Terraform changes**:
   ```bash
   cd ../terraform

   # Review the changes
   terraform plan

   # Apply (will remove old scheduler jobs and create workflow)
   terraform apply
   ```

### Step 5: Clean Up Old Resources

After successful migration, you can:

1. **Revoke the old GitHub PAT**:
   - Go to https://github.com/settings/tokens
   - Find your old token
   - Click "Delete"

2. **Remove PAT from local Terraform state** (if concerned about secrets):
   ```bash
   # Terraform state is encrypted in GCS, but you can refresh it
   terraform refresh
   ```

## Testing the New Setup

### Manual Test

Trigger the workflow manually:

```bash
gcloud workflows run coffee-pipeline --location=europe-west2
```

### Check Execution

```bash
# List recent workflow executions
gcloud workflows executions list coffee-pipeline --location=europe-west2

# Get details of a specific execution
gcloud workflows executions describe EXECUTION_ID \
  --workflow=coffee-pipeline \
  --location=europe-west2

# View logs
gcloud logging read "resource.type=workflows.googleapis.com/Workflow" \
  --limit=50 \
  --format=json
```

### Verify GitHub Commits

Check your repository:
- Branch: `build` (or your configured target branch)
- Author: "Coffee Aggregator Bot"
- Files: `frontend/public/data/*.json`

## Troubleshooting

### "Secret not found" Error

```bash
# Verify secrets exist
gcloud secrets list

# Check secret values (be careful, this shows the secret!)
gcloud secrets versions access latest --secret=github-app-id
gcloud secrets versions access latest --secret=github-app-installation-id
```

### "Bad credentials" from GitHub

- Verify App ID is correct
- Check that the GitHub App is installed on the target repository
- Ensure private key is in PEM format
- Re-generate private key if needed

### Builder Can't Push to Branch

```bash
# Check GitHub App permissions
# Go to: https://github.com/settings/installations
# Ensure "Contents: Read and write" is enabled

# If using branch protection, ensure:
# - Build branch exists
# - GitHub App is allowed to push to it
```

### Workflow Fails

```bash
# Get detailed execution logs
gcloud workflows executions describe EXECUTION_ID \
  --workflow=coffee-pipeline \
  --location=europe-west2 \
  --format=json

# Check Cloud Run logs
gcloud logging read "resource.type=cloud_run_revision" \
  --limit=100 \
  --format=json
```

## Rollback Plan

If you need to rollback to PAT authentication:

1. **Revert Terraform changes**:
   ```bash
   cd terraform
   git checkout HEAD~1 main.tf variables.tf outputs.tf
   ```

2. **Update builder service**:
   ```bash
   cd ../builder
   git checkout HEAD~1 src/main.rs Cargo.toml
   ./build.sh
   ```

3. **Restore PAT variable**:
   ```bash
   cd ../terraform
   # Add back to terraform.tfvars:
   # github_token = "your-pat-token"

   terraform apply
   ```

## Cost Impact

The new setup uses these additional GCP services:

| Service | Usage | Cost |
|---------|-------|------|
| Cloud Workflows | 1 execution/day | **FREE** (Free tier: 5000 internal steps/month) |
| Secret Manager | 3 secrets | **FREE** (Free tier: 6 active secrets) |

**Total Additional Cost: $0** (well within free tier)

## Support

If you encounter issues:
1. Check logs with commands above
2. Review [GITHUB_APP_SETUP.md](./GITHUB_APP_SETUP.md)
3. Open an issue on GitHub

## Next Steps

After successful migration:
1. ✅ Delete your old GitHub PAT
2. ✅ Configure branch protection rules if desired
3. ✅ Set up Vercel to deploy from the `build` branch
4. ✅ Update your deployment documentation
