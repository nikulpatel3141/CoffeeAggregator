# Force Cloud Run Redeployment

## The Problem

When you push a new Docker image to GCR with the same tag (`:latest`), Cloud Run won't automatically pick it up because Terraform doesn't detect any configuration changes.

## Quick Solution

1. Edit `terraform/main.tf`
2. Find the `deployment-version` annotation in both services (scraper and builder)
3. Increment the version number:
   ```hcl
   "deployment-version" = "v3"  # was v2
   ```
4. Run `terraform apply`
5. Cloud Run will create a new revision with the latest image

## Locations to Update

### Scraper Service
```hcl
resource "google_cloud_run_service" "scraper" {
  template {
    metadata {
      annotations = {
        "deployment-version" = "vX"  # <-- Change this
      }
    }
  }
}
```

### Builder Service
```hcl
resource "google_cloud_run_service" "builder" {
  template {
    metadata {
      annotations = {
        "deployment-version" = "vX"  # <-- Change this
      }
    }
  }
}
```

## Alternative: Use Image Digest

Instead of `:latest`, you can use the image digest in your Terraform:

```hcl
image = "gcr.io/${var.project_id}/coffee-scraper@sha256:abcdef..."
```

Get the digest with:
```bash
gcloud container images describe gcr.io/PROJECT_ID/coffee-scraper:latest --format='get(image_summary.digest)'
```

## Alternative: Manual Deployment

Force a new deployment without Terraform:

```bash
# Force new revision for scraper
gcloud run services update coffee-scraper \
  --region europe-west2 \
  --image gcr.io/PROJECT_ID/coffee-scraper:latest

# Force new revision for builder
gcloud run services update coffee-builder \
  --region europe-west2 \
  --image gcr.io/PROJECT_ID/coffee-builder:latest
```

## Why This Happens

Cloud Run services cache the image by tag. When you push a new image with the same tag, Cloud Run doesn't know about it unless you:
- Create a new revision (what the annotation does)
- Manually trigger an update
- Use image digests instead of tags
