terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# Enable required APIs
resource "google_project_service" "firestore" {
  service            = "firestore.googleapis.com"
  disable_on_destroy = false
}

# Firestore database
resource "google_firestore_database" "coffee_db" {
  name        = "(default)"
  location_id = var.region
  type        = "FIRESTORE_NATIVE"

  depends_on = [google_project_service.firestore]
}

# Service account for GitHub Actions
# This service account is used by GitHub Actions to run scraper and builder jobs
resource "google_service_account" "github_actions" {
  account_id   = "github-actions-coffee"
  display_name = "GitHub Actions - Coffee Aggregator"
}

# Grant GitHub Actions service account Firestore access
resource "google_project_iam_member" "github_actions_datastore" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.github_actions.email}"
}

# Outputs for reference
output "firestore_database" {
  value       = google_firestore_database.coffee_db.name
  description = "Firestore database name"
}

output "github_actions_service_account" {
  value       = google_service_account.github_actions.email
  description = "Service account email for GitHub Actions"
}
