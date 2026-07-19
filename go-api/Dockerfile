# Build Stage
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o server cmd/server/main.go

# Production Stage
FROM alpine:3.20
RUN apk --no-cache add ca-certificates
WORKDIR /app
COPY --from=builder /app/server .

# Create a non-root system user and group
RUN addgroup -g 1000 dmsgroup && \
    adduser -u 1000 -G dmsgroup -D -s /bin/sh dmsuser

# Set ownership
RUN chown -R dmsuser:dmsgroup /app

# Switch to non-root user
USER dmsuser

EXPOSE 8080
CMD ["./server"]
