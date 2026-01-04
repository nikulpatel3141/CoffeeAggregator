#!/bin/bash
set -e

PROJECT_ID=${1:-your-project-id}
IMAGE_NAME="gcr.io/${PROJECT_ID}/coffee-scraper:latest"

echo "Building Docker image..."
docker build -t ${IMAGE_NAME} .

echo "Pushing to Google Container Registry..."
docker push ${IMAGE_NAME}

echo "Build and push complete: ${IMAGE_NAME}"
