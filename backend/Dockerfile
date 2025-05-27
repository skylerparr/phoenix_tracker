FROM rust:1.82.0 as builder

WORKDIR /usr/src/app
COPY . .

RUN cargo update --aggressive && \
    rm -f Cargo.lock && \
    cargo generate-lockfile && \
    RUSTFLAGS="-C opt-level=3" cargo build --release

FROM debian:bookworm-slim

RUN apt-get update && \
    apt-get install -y openssl libssl3 ca-certificates && \
    rm -rf /var/lib/apt/lists/*

RUN groupadd -r appuser && useradd -r -g appuser appuser

WORKDIR /usr/local/bin

COPY --from=builder /usr/src/app/target/release/tracker ./tracker
RUN chown appuser:appuser tracker

USER appuser

CMD ["./tracker"]
