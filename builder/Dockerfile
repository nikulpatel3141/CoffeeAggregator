FROM rust:1.92.0 AS builder

WORKDIR /app
COPY Cargo.toml Cargo.lock* ./
COPY src ./src

RUN cargo build --release

FROM debian:bookworm-slim

# Install git for repository operations
RUN apt-get update && \
    apt-get install -y git ca-certificates && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/target/release/coffee-builder /app/coffee-builder

ENV PORT=8080

CMD ["/app/coffee-builder"]
