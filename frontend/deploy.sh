#!/bin/bash
set -e

PROJECT_ID=${1:-your-project-id}
BUCKET_NAME="${PROJECT_ID}-coffee-frontend"

echo "Building Next.js application..."
npm run build

echo "Uploading to Google Cloud Storage..."
gsutil -m rsync -r -d out/ gs://${BUCKET_NAME}/

echo "Setting cache control..."
gsutil -m setmeta -h "Cache-Control:public, max-age=3600" gs://${BUCKET_NAME}/**

echo "Deployment complete: https://storage.googleapis.com/${BUCKET_NAME}/index.html"
