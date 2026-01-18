FROM rust:1.92.0 AS builder

WORKDIR /app

# Copy dependency manifests first to cache dependencies layer
COPY Cargo.toml Cargo.lock ./

# Create a dummy src/main.rs to build dependencies
RUN mkdir src && echo "fn main() {}" > src/main.rs

# Build dependencies (this layer will be cached)
RUN cargo build --release && rm -rf src

# Now copy the real source code
COPY src ./src

# Build the actual application (only this rebuilds when source changes)
RUN cargo build --release

FROM debian:trixie-slim

RUN apt-get update && apt-get install -y \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/target/release/coffee-scraper /usr/local/bin/coffee-scraper

EXPOSE 8080

CMD ["coffee-scraper"]
