#!/bin/bash
set -e

echo "🔨 Building scraper Docker image..."
cd scraper
docker build -t coffee-scraper-debug .

echo ""
echo "🚀 Running scraper container locally..."
echo "   Container will listen on http://localhost:8080"
echo "   Press Ctrl+C to stop"
echo ""

# Run with environment variables
docker run -it --rm \
  -p 8080:8080 \
  -e PORT=8080 \
  -e GCP_PROJECT_ID=coffee-aggregator-project \
  coffee-scraper-debug

# To test the endpoint:
# curl -X POST http://localhost:8080/
