# Debugging Docker Containers Locally

This guide explains how to debug the scraper and builder containers locally before deploying to Cloud Run.

## Quick Start

### Option 1: Debug Individual Services

**Debug the builder:**
```bash
chmod +x debug-builder.sh
./debug-builder.sh
```

**Debug the scraper:**
```bash
chmod +x debug-scraper.sh
./debug-scraper.sh
```

### Option 2: Use Docker Compose

```bash
# Start both services
docker-compose -f docker-compose.debug.yml up

# Or start one service
docker-compose -f docker-compose.debug.yml up scraper
docker-compose -f docker-compose.debug.yml up builder

# View logs
docker-compose -f docker-compose.debug.yml logs -f

# Stop services
docker-compose -f docker-compose.debug.yml down
```

## Testing Locally

Once the container is running, test the HTTP endpoint:

**Test scraper:**
```bash
# Trigger a scrape
curl -X POST http://localhost:8080/

# Check if it's responding
curl -v http://localhost:8080/
```

**Test builder:**
```bash
# Trigger a build
curl -X POST http://localhost:8081/

# Check if it's responding
curl -v http://localhost:8081/
```

## Common Issues

### Container exits immediately

**Symptoms:** Container starts and exits without error
**Likely cause:** Application crashes during startup
**Debug:**
```bash
# Run with shell to inspect
docker run -it --rm coffee-builder-debug /bin/bash

# Or check what happens when running the binary directly
docker run -it --rm coffee-builder-debug sh -c "ls -la /app && /app/coffee-builder"
```

### Container doesn't respond to requests

**Symptoms:** Container running but curl hangs or times out
**Likely causes:**
- Not listening on the correct port
- Not binding to 0.0.0.0 (binding to 127.0.0.1 won't work in Docker)
**Debug:**
```bash
# Check what ports are listening inside container
docker run -it --rm coffee-builder-debug sh -c "apt-get update && apt-get install -y net-tools && netstat -tlnp"
```

### Missing environment variables

**Symptoms:** Application errors about missing config
**Solution:** Add environment variables to the docker run command:
```bash
docker run -it --rm \
  -p 8080:8080 \
  -e PORT=8080 \
  -e GCP_PROJECT_ID=your-project \
  -e GITHUB_TOKEN=ghp_xxx \
  coffee-builder-debug
```

### GLIBC errors

**Symptoms:** `/lib/x86_64-linux-gnu/libc.so.6: version 'GLIBC_X.XX' not found`
**Solution:** Check the base image has the required GLIBC version:
```bash
# Check GLIBC version in container
docker run -it --rm ubuntu:24.04 sh -c "ldd --version"
```

## Viewing Build Logs

To see detailed build output:

```bash
cd builder  # or scraper
docker build --progress=plain --no-cache -t test .
```

## Cloud Run Simulation

To simulate Cloud Run's health check behavior:

```bash
# Run container
docker run -d --name test-container -p 8080:8080 coffee-builder-debug

# Wait 10 seconds
sleep 10

# Send health check (Cloud Run expects HTTP 200 on any request)
curl -v http://localhost:8080/

# Check logs
docker logs test-container

# Clean up
docker rm -f test-container
```

## Checking Container Startup Time

Cloud Run has a default startup timeout. Check how long your container takes:

```bash
time docker run --rm coffee-builder-debug sh -c "timeout 5 /app/coffee-builder || echo 'Still running after 5s'"
```

If it takes more than 4-5 seconds to start listening, you may need to:
1. Optimize dependencies
2. Reduce binary size
3. Increase Cloud Run startup timeout in Terraform

## Inspecting the Built Image

```bash
# See image size
docker images | grep coffee

# Inspect layers
docker history coffee-builder-debug

# Run shell in container
docker run -it --rm coffee-builder-debug /bin/bash

# List files
docker run -it --rm coffee-builder-debug find /app
```

## Port Binding Issues

If you see "bind: address already in use":

```bash
# Find what's using the port
sudo lsof -i :8080

# Or use a different port
docker run -p 9090:8080 ...
```
