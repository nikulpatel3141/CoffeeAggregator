#!/bin/bash
# Quick test to see if containers start and respond within Cloud Run's timeout

set -e

echo "Testing builder startup time and responsiveness..."
echo "================================================"
echo ""

cd builder

echo "1. Building image..."
docker build -q -t coffee-builder-test . > /dev/null

echo "2. Starting container in background..."
CONTAINER_ID=$(docker run -d -p 8082:8080 -e PORT=8080 -e GCP_PROJECT_ID=test coffee-builder-test)

echo "3. Waiting for container to be ready..."
START_TIME=$(date +%s)

# Try to connect for up to 30 seconds
for i in {1..30}; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8082/health 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" = "200" ]; then
        END_TIME=$(date +%s)
        ELAPSED=$((END_TIME - START_TIME))
        echo ""
        echo "✅ Container responded after ${ELAPSED} seconds"
        echo ""
        echo "Logs from container:"
        echo "-------------------"
        docker logs $CONTAINER_ID
        echo "-------------------"
        docker rm -f $CONTAINER_ID > /dev/null
        echo ""
        echo "✅ Test passed! Container starts and responds correctly."
        exit 0
    fi

    # Check if container is still running
    if ! docker ps -q --filter "id=$CONTAINER_ID" | grep -q .; then
        echo ""
        echo "❌ Container exited unexpectedly!"
        echo ""
        echo "Logs from container:"
        echo "-------------------"
        docker logs $CONTAINER_ID
        echo "-------------------"
        docker rm -f $CONTAINER_ID > /dev/null 2>&1 || true
        exit 1
    fi

    sleep 1
    echo -n "."
done

echo ""
echo "❌ Container didn't respond within 30 seconds (Cloud Run timeout is ~240s)"
echo ""
echo "Logs from container:"
echo "-------------------"
docker logs $CONTAINER_ID
echo "-------------------"
docker rm -f $CONTAINER_ID > /dev/null

exit 1
