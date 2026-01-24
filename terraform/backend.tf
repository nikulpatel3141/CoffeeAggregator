# Terraform backend configuration for remote state storage
# This allows CI/CD and team collaboration

terraform {
  backend "gcs" {
    bucket = "coffee-aggregator-terraform-state"
    prefix = "terraform/state"
  }
}
