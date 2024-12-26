FROM rust:1.70 as builder

WORKDIR /usr/src/app
COPY . .

RUN cargo build --release

FROM debian:bullseye-slim

WORKDIR /usr/local/bin

COPY --from=builder /usr/src/app/target/release/rust-app ./rust-app

CMD ["./rust-app"]
