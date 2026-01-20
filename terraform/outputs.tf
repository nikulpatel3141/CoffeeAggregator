output "scraper_url" {
  description = "URL of the Cloud Run scraper service"
  value       = google_cloud_run_service.scraper.status[0].url
}

output "builder_url" {
  description = "URL of the Cloud Run builder service"
  value       = google_cloud_run_service.builder.status[0].url
}

output "workflow_name" {
  description = "Name of the Cloud Workflows pipeline"
  value       = google_workflows_workflow.coffee_pipeline.name
}

output "firestore_database" {
  description = "Firestore database name"
  value       = google_firestore_database.coffee_db.name
}

output "deployment_info" {
  description = "Deployment information"
  value = <<-EOT
    Pipeline runs daily at 6 AM UK time via Cloud Workflows
    Workflow: coffee-pipeline (Scraper -> Builder)
    Build output: ${var.repo_url} (branch: ${var.target_branch})

    GitHub App authentication (no PAT required!)
    Secrets stored in Secret Manager:
    - github-app-id
    - github-app-installation-id
    - github-app-private-key

    Manual trigger:
    gcloud workflows run coffee-pipeline --location=${var.region}

    Check logs:
    gcloud workflows executions list coffee-pipeline --location=${var.region}
  EOT
}
