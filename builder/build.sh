#!/bin/bash
set -e

if [ -z "$1" ]; then
    echo "Usage: ./build.sh <GCP_PROJECT_ID>"
    exit 1
fi

PROJECT_ID=$1

echo "Building and pushing coffee-builder Docker image..."

# Build the Docker image
docker build -t gcr.io/${PROJECT_ID}/coffee-builder:latest .

# Push to Google Container Registry
docker push gcr.io/${PROJECT_ID}/coffee-builder:latest

echo "Build complete! Image: gcr.io/${PROJECT_ID}/coffee-builder:latest"
