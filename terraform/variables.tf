variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "europe-west2"
}

variable "github_token" {
  description = "GitHub Personal Access Token with repo write permissions"
  type        = string
  sensitive   = true
}

variable "repo_url" {
  description = "GitHub repository URL (format: github.com/username/repo)"
  type        = string
  default     = "github.com/nikulpatel3141/CoffeeTracker"
}
