output "scraper_url" {
  description = "URL of the Cloud Run scraper service"
  value       = google_cloud_run_service.scraper.status[0].url
}

output "builder_url" {
  description = "URL of the Cloud Run builder service"
  value       = google_cloud_run_service.builder.status[0].url
}

output "firestore_database" {
  description = "Firestore database name"
  value       = google_firestore_database.coffee_db.name
}

output "deployment_info" {
  description = "Deployment information"
  value = <<-EOT
    Scraper runs daily at 6 AM UK time
    Builder runs daily at 7 AM UK time
    Frontend should be deployed to Vercel
    Data files are committed to: frontend/public/data/
  EOT
}
