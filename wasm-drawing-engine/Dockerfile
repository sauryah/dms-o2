FROM rust:alpine

RUN apk add --no-cache curl tar bash musl-dev

# Install wasm32 compilation target
RUN rustup target add wasm32-unknown-unknown

# Install pre-built wasm-pack binary
RUN curl -sSL https://github.com/rustwasm/wasm-pack/releases/download/v0.13.1/wasm-pack-v0.13.1-x86_64-unknown-linux-musl.tar.gz \
    | tar -xz -C /usr/local/bin --strip-components=1

WORKDIR /workspace

CMD ["wasm-pack", "build", "--target", "web", "--out-dir", "/out"]
