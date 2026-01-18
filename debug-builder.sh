#!/bin/bash
set -e

echo "🔨 Building builder Docker image..."
cd builder
docker build -t coffee-builder-debug .

echo ""
echo "🚀 Running builder container locally..."
echo "   Container will listen on http://localhost:8081"
echo "   Press Ctrl+C to stop"
echo ""

# Run with environment variables
docker run -it --rm \
  -p 8081:8080 \
  -e PORT=8080 \
  -e GCP_PROJECT_ID=coffee-aggregator-project \
  -e REPO_URL=github.com/your-user/CoffeeAggregator \
  -e TARGET_BRANCH=gh-pages \
  coffee-builder-debug

# To test the endpoint:
# curl -X POST http://localhost:8081/
