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
resource "google_project_service" "logging" {
  service            = "logging.googleapis.com"
  disable_on_destroy = false
}

# Firestore database
resource "google_firestore_database" "coffee_db" {
  name        = "(default)"
  location_id = var.region
  type        = "FIRESTORE_NATIVE"
}

# Cloud Storage bucket for scraper deployment
resource "google_storage_bucket" "scraper_bucket" {
  name                        = "${var.project_id}-coffee-scraper"
  location                    = var.region
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"
}

# Service account for scraper
resource "google_service_account" "scraper" {
  account_id   = "coffee-scraper"
  display_name = "Coffee Scraper Service"
}

# Grant scraper service account Firestore access
resource "google_project_iam_member" "scraper_datastore" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.scraper.email}"
}

# Cloud Run service for scraper and API
resource "google_cloud_run_service" "scraper" {
  name     = "coffee-scraper"
  location = var.region

  template {
    metadata {
      annotations = {
        "autoscaling.knative.dev/maxScale" = "10"
        "run.googleapis.com/client-name"   = "terraform"
        # Change this value to force a new deployment
        "deployment-version" = "v8"
      }
    }

    spec {
      service_account_name = google_service_account.scraper.email

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
      "run.googleapis.com/ingress" = "internal"
    }
  }
}

# Service account for Cloud Scheduler
resource "google_service_account" "scheduler" {
  account_id   = "coffee-scheduler"
  display_name = "Coffee Pipeline Scheduler"
}

# Secret Manager secrets for GitHub App
# Note: Secrets must be created manually with gcloud or via console
# This just references them for IAM binding
data "google_secret_manager_secret" "github_app_id" {
  secret_id = "github-app-id"
}

data "google_secret_manager_secret" "github_app_installation_id" {
  secret_id = "github-app-installation-id"
}

data "google_secret_manager_secret" "github_app_private_key" {
  secret_id = "github-app-private-key"
}

# Service account for builder
resource "google_service_account" "builder" {
  account_id   = "coffee-builder"
  display_name = "Coffee Builder Service"
}

# Grant builder service account Firestore access
resource "google_project_iam_member" "builder_datastore" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.builder.email}"
}

# Grant builder service account access to secrets
resource "google_secret_manager_secret_iam_member" "builder_app_id" {
  secret_id = data.google_secret_manager_secret.github_app_id.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.builder.email}"
}

resource "google_secret_manager_secret_iam_member" "builder_installation_id" {
  secret_id = data.google_secret_manager_secret.github_app_installation_id.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.builder.email}"
}

resource "google_secret_manager_secret_iam_member" "builder_private_key" {
  secret_id = data.google_secret_manager_secret.github_app_private_key.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.builder.email}"
}

# Cloud Run service for builder (exports Firestore to JSON and commits to GitHub)
resource "google_cloud_run_service" "builder" {
  name     = "coffee-builder"
  location = var.region

  template {
    metadata {
      annotations = {
        "autoscaling.knative.dev/maxScale" = "10"
        "run.googleapis.com/client-name"   = "terraform"
        # Change this value to force a new deployment
        "deployment-version" = "v8"
      }
    }

    spec {
      service_account_name = google_service_account.builder.email

      containers {
        image = "gcr.io/${var.project_id}/coffee-builder:latest"

        env {
          name  = "GCP_PROJECT_ID"
          value = var.project_id
        }

        env {
          name  = "REPO_URL"
          value = var.repo_url
        }

        env {
          name  = "TARGET_BRANCH"
          value = var.target_branch
        }

        # GitHub App credentials from Secret Manager
        env {
          name = "GITHUB_APP_ID"
          value_from {
            secret_key_ref {
              name = data.google_secret_manager_secret.github_app_id.secret_id
              key  = "latest"
            }
          }
        }

        env {
          name = "GITHUB_APP_INSTALLATION_ID"
          value_from {
            secret_key_ref {
              name = data.google_secret_manager_secret.github_app_installation_id.secret_id
              key  = "latest"
            }
          }
        }

        env {
          name = "GITHUB_APP_PRIVATE_KEY"
          value_from {
            secret_key_ref {
              name = data.google_secret_manager_secret.github_app_private_key.secret_id
              key  = "latest"
            }
          }
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
      "run.googleapis.com/ingress" = "internal"
    }
  }

  depends_on = [
    google_secret_manager_secret_iam_member.builder_app_id,
    google_secret_manager_secret_iam_member.builder_installation_id,
    google_secret_manager_secret_iam_member.builder_private_key,
  ]
}

# Service account for Cloud Workflows
resource "google_service_account" "workflow" {
  account_id   = "coffee-workflow"
  display_name = "Coffee Pipeline Workflow"
}

# Grant workflow permission to invoke Cloud Run services
resource "google_cloud_run_service_iam_member" "workflow_scraper_invoker" {
  service  = google_cloud_run_service.scraper.name
  location = google_cloud_run_service.scraper.location
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.workflow.email}"
}

resource "google_cloud_run_service_iam_member" "workflow_builder_invoker" {
  service  = google_cloud_run_service.builder.name
  location = google_cloud_run_service.builder.location
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.workflow.email}"
}

# Grant workflow service account logging permissions
resource "google_project_iam_member" "workflow_logging" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.workflow.email}"
}

# Cloud Workflows - Orchestrates scraper -> builder pipeline
resource "google_workflows_workflow" "coffee_pipeline" {
  name            = "coffee-pipeline"
  region          = var.region
  service_account = google_service_account.workflow.email

  source_contents = templatefile("${path.module}/workflows/coffee-pipeline.yaml", {
    scraper_url = google_cloud_run_service.scraper.status[0].url
    builder_url = google_cloud_run_service.builder.status[0].url
  })
}

# Cloud Scheduler job to trigger the workflow daily
resource "google_cloud_scheduler_job" "daily_pipeline" {
  name             = "daily-coffee-pipeline"
  schedule         = "0 6 * * *"  # 6 AM UK time
  time_zone        = "Europe/London"
  attempt_deadline = "1800s"  # 30 minutes for the entire pipeline

  http_target {
    http_method = "POST"
    uri         = "https://workflowexecutions.googleapis.com/v1/projects/${var.project_id}/locations/${var.region}/workflows/${google_workflows_workflow.coffee_pipeline.name}/executions"

    oauth_token {
      service_account_email = google_service_account.scheduler.email
    }
  }
}

# Grant scheduler permission to execute workflows
resource "google_project_iam_member" "scheduler_workflows_invoker" {
  project = var.project_id
  role    = "roles/workflows.invoker"
  member  = "serviceAccount:${google_service_account.scheduler.email}"
}
