#!/bin/bash

# Test script for coffee scrapers
# This tests all scrapers against real websites and outputs results

set -e

echo "================================"
echo "Coffee Scraper Real Site Tester"
echo "================================"
echo ""

cd "$(dirname "$0")/scraper"

echo "Building test binary..."
cargo build --bin test_scrapers --release 2>&1 | grep -E "(Compiling|Finished)" || true
echo ""

echo "Running scrapers against real sites..."
echo "This will take ~30 seconds..."
echo ""

# Run the test with timeout
if cargo run --bin test_scrapers --release 2>&1; then
    echo ""
    echo "✅ Test completed successfully!"
else
    echo ""
    echo "❌ Test failed - check errors above"
    exit 1
fi

echo ""
echo "================================"
echo "Summary:"
echo "- Check output above for product counts"
echo "- Verify each roaster returned coffee products"
echo "- If selectors fail, update them in src/main.rs"
echo "================================"
