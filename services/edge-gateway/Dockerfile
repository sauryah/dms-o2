# Multi-stage production Dockerfile for DMS Edge Gateway
FROM alpine:3.20 AS builder

RUN apk add --no-cache \
    gcc \
    make \
    cmake \
    musl-dev \
    libmodbus-dev \
    hiredis-dev \
    cjson-dev \
    pkgconf

WORKDIR /app
COPY . .

RUN mkdir -p build && cd build && \
    cmake -DCMAKE_BUILD_TYPE=Release .. && \
    make -j$(nproc)

# Runtime Stage
FROM alpine:3.20

RUN apk add --no-cache \
    libmodbus \
    hiredis \
    cjson

# Security Rule: Run as non-root user dmsuser (UID 1001)
RUN adduser -D -u 1001 dmsuser

WORKDIR /app
COPY --from=builder /app/build/edge_gateway /app/edge_gateway
COPY --from=builder /app/build/plc_simulator /app/plc_simulator

USER dmsuser

ENV PLC_HOST=127.0.0.1 \
    PLC_PORT=1502 \
    REDIS_HOST=127.0.0.1 \
    REDIS_PORT=6379 \
    REDIS_CHANNEL=dms:events:broadcast \
    MACHINE_ID=EN-01 \
    POLL_INTERVAL_MS=500

ENTRYPOINT ["/app/edge_gateway"]
