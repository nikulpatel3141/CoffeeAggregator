# GitHub App Setup Guide

This guide explains how to set up GitHub App authentication instead of using Personal Access Tokens.

## Why GitHub Apps?

- **No PAT in Terraform**: Credentials stored securely in GCP Secret Manager
- **Fine-grained permissions**: Only repository contents write access
- **Branch-level protection**: Can restrict to specific branches
- **Audit trail**: All commits show as "bot" with clear identity

## Step 1: Create a GitHub App

1. Go to https://github.com/settings/apps/new

2. Fill in the following:
   - **GitHub App name**: `CoffeeAggregator Builder`
   - **Homepage URL**: Your repo URL or `https://github.com/nikulpatel3141/CoffeeAggregator`
   - **Webhook**: Uncheck "Active" (we don't need webhooks)

3. **Repository permissions**:
   - Contents: **Read and write**
   - Metadata: **Read-only** (automatically selected)

4. **Where can this GitHub App be installed?**
   - Select "Only on this account"

5. Click **Create GitHub App**

6. **Generate a private key**:
   - Scroll down to "Private keys"
   - Click "Generate a private key"
   - Save the downloaded `.pem` file securely

7. **Note the App ID**: You'll see it at the top of the settings page (e.g., `123456`)

## Step 2: Install the GitHub App

### Option A: Same Repo with Build Branch (Recommended)

1. In your GitHub App settings, click **Install App** (left sidebar)
2. Choose your account
3. Select **Only select repositories**
4. Choose: `CoffeeAggregator`
5. Click **Install**
6. **Note the Installation ID** from the URL (e.g., `https://github.com/settings/installations/12345678`)

### Option B: Separate Website Repo

1. Create a new repository: `CoffeeAggregatorWebsite`
2. Install the GitHub App on this repo following the same steps above

## Step 3: Configure GCP Secret Manager

Store the GitHub App credentials in GCP Secret Manager:

```bash
# Store the App ID
echo -n "123456" | gcloud secrets create github-app-id --data-file=-

# Store the Installation ID
echo -n "12345678" | gcloud secrets create github-app-installation-id --data-file=-

# Store the Private Key (replace with your actual .pem file)
gcloud secrets create github-app-private-key --data-file=/path/to/your-app.private-key.pem
```

## Step 4: Update Terraform Variables

Edit `terraform/terraform.tfvars` (or create it from the example):

```hcl
project_id = "your-gcp-project-id"
region     = "europe-west2"

# For Option A (build branch in same repo)
repo_url = "github.com/nikulpatel3141/CoffeeAggregator"
target_branch = "build"

# For Option B (separate repo)
# repo_url = "github.com/nikulpatel3141/CoffeeAggregatorWebsite"
# target_branch = "main"
```

**Note**: You no longer need `github_token` variable!

## Step 5: Apply Terraform

```bash
cd terraform
terraform init
terraform apply
```

## Step 6: Configure Branch Protection (Optional)

To prevent direct pushes to your main branch:

1. Go to your repo → Settings → Branches
2. Add rule for `main`:
   - Require pull request reviews
   - Require status checks
3. The `build` branch can remain unprotected for automated pushes

## Verification

Test the setup:

```bash
# Trigger the workflow manually
gcloud workflows run coffee-pipeline --location=europe-west2

# Check logs
gcloud workflows executions list coffee-pipeline --location=europe-west2
gcloud logging read "resource.type=cloud_run_revision" --limit=50
```

## Security Notes

- Private keys are stored encrypted in GCP Secret Manager
- Installation tokens are short-lived (1 hour)
- No credentials in source code or Terraform state
- Builder service account needs `secretmanager.secretAccessor` role

## Troubleshooting

### "Bad credentials" error
- Verify App ID and Installation ID are correct
- Check private key format (should be PEM)
- Ensure the app is installed on the target repository

### "Resource not accessible by integration"
- Verify the GitHub App has "Contents: Read and write" permission
- Reinstall the app if you changed permissions

### Builder fails to push
- Check the target branch exists (create `build` branch if needed)
- Verify repo URL format: `github.com/user/repo` (no `https://`)
