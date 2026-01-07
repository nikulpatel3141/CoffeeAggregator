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

# Firestore database
resource "google_firestore_database" "coffee_db" {
  name        = "(default)"
  location_id = var.region
  type        = "FIRESTORE_NATIVE"
}

# Cloud Storage bucket for scraper deployment
resource "google_storage_bucket" "scraper_bucket" {
  name     = "${var.project_id}-coffee-scraper"
  location = var.region
}

# Cloud Run service for scraper and API
resource "google_cloud_run_service" "scraper" {
  name     = "coffee-scraper"
  location = var.region

  template {
    spec {
      containers {
        image = "gcr.io/${var.project_id}/coffee-scraper:latest"

        env {
          name  = "GCP_PROJECT_ID"
          value = var.project_id
        }

        ports {
          container_port = 8080
        }
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }

  metadata {
    annotations = {
      "run.googleapis.com/ingress" = "all"
    }
  }
}

# Allow unauthenticated access to the API endpoints
resource "google_cloud_run_service_iam_member" "public_access" {
  service  = google_cloud_run_service.scraper.name
  location = google_cloud_run_service.scraper.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# Cloud Scheduler job to trigger scraper daily
resource "google_cloud_scheduler_job" "daily_scrape" {
  name             = "daily-coffee-scrape"
  schedule         = "0 6 * * *"
  time_zone        = "Europe/London"
  attempt_deadline = "320s"

  http_target {
    http_method = "POST"
    uri         = google_cloud_run_service.scraper.status[0].url

    oidc_token {
      service_account_email = google_service_account.scheduler.email
    }
  }
}

# Service account for Cloud Scheduler
resource "google_service_account" "scheduler" {
  account_id   = "coffee-scheduler"
  display_name = "Coffee Scraper Scheduler"
}

# IAM binding for scheduler to invoke Cloud Run
resource "google_cloud_run_service_iam_member" "scheduler_invoker" {
  service  = google_cloud_run_service.scraper.name
  location = google_cloud_run_service.scraper.location
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.scheduler.email}"
}

# Storage bucket for Next.js static site
resource "google_storage_bucket" "frontend" {
  name     = "${var.project_id}-coffee-frontend"
  location = var.region

  website {
    main_page_suffix = "index.html"
    not_found_page   = "404.html"
  }
}

# Make frontend bucket publicly readable
resource "google_storage_bucket_iam_member" "frontend_public" {
  bucket = google_storage_bucket.frontend.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}
