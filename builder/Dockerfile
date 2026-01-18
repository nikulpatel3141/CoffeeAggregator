FROM rust:1.92.0 AS builder

WORKDIR /app

# Copy dependency manifests first to cache dependencies layer
COPY Cargo.toml Cargo.lock* ./

# Create dummy source files to build dependencies
RUN mkdir -p src && \
    echo "fn main() {}" > src/main.rs && \
    mkdir -p src && \
    echo "pub fn get_github_token(app_id: &str, installation_id: &str, private_key_pem: &str) -> Result<String, Box<dyn std::error::Error>> { Ok(String::new()) }" > src/github_auth.rs

# Build dependencies (this layer will be cached)
RUN cargo build --release && rm -rf src

# Now copy the real source code
COPY src ./src

# Build the actual application (only this rebuilds when source changes)
RUN cargo build --release

FROM debian:trixie-slim

# Install git for repository operations
RUN apt-get update && \
    apt-get install -y git ca-certificates && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/target/release/coffee-builder /app/coffee-builder

ENV PORT=8080

CMD ["/app/coffee-builder"]
