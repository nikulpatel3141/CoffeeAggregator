variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "europe-west2"
}

variable "repo_url" {
  description = "GitHub repository URL (format: github.com/username/repo)"
  type        = string
  default     = "github.com/nikulpatel3141/CoffeeAggregatorWebsite"
}

variable "target_branch" {
  description = "Git branch to push build artifacts to"
  type        = string
  default     = "main"
}

# GitHub App credentials (stored in Secret Manager, not here!)
# To set up:
# 1. Create a GitHub App at https://github.com/settings/apps/new
# 2. Note the App ID and generate a private key
# 3. Install the app and note the Installation ID
# 4. Store in Secret Manager:
#    gcloud secrets create github-app-id --data-file=-
#    gcloud secrets create github-app-installation-id --data-file=-
#    gcloud secrets create github-app-private-key --data-file=/path/to/key.pem
