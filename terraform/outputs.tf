output "api_url" {
  description = "URL of the Coffee API (use this in NEXT_PUBLIC_API_URL)"
  value       = google_cloud_run_service.scraper.status[0].url
}

output "scraper_url" {
  description = "URL of the Cloud Run scraper service"
  value       = google_cloud_run_service.scraper.status[0].url
}

output "frontend_url" {
  description = "URL of the frontend website"
  value       = "https://storage.googleapis.com/${google_storage_bucket.frontend.name}/index.html"
}

output "frontend_bucket" {
  description = "Frontend bucket name"
  value       = google_storage_bucket.frontend.name
}

output "firestore_database" {
  description = "Firestore database name"
  value       = google_firestore_database.coffee_db.name
}
