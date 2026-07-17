#!/bin/bash
set -e

CERTS_DIR="$(dirname "$0")/../certs"
mkdir -p "$CERTS_DIR"

# Detect LAN IP (works on Linux/macOS)
LAN_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
if [ -z "$LAN_IP" ]; then
    LAN_IP=$(ip -4 addr show | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | grep -v '127.0.0.1' | head -1)
fi
if [ -z "$LAN_IP" ]; then
    LAN_IP=$(ifconfig 2>/dev/null | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | grep -v '127.0.0.1' | head -1)
fi

if [ -z "$LAN_IP" ]; then
    echo "ERROR: Could not detect LAN IP. Set manually: mkcert -cert-file cert.pem -key-file key.pem localhost 127.0.0.1 YOUR_IP ::1"
    exit 1
fi

echo "Detected LAN IP: $LAN_IP"
echo "Generating TLS certificates..."

mkcert -install 2>/dev/null || true
mkcert -cert-file "$CERTS_DIR/cert.pem" -key-file "$CERTS_DIR/key.pem" \
    localhost 127.0.0.1 "$LAN_IP" ::1

# Copy root CA for distribution to other machines
cp "$(mkcert -CAROOT)/rootCA.pem" "$CERTS_DIR/rootCA.pem" 2>/dev/null || true

echo ""
echo "Certificates generated in $CERTS_DIR/"
echo "  cert.pem  - server certificate (valid for $LAN_IP)"
echo "  key.pem   - private key"
echo "  rootCA.pem - root CA (install on other machines for trusted access)"
echo ""
echo "Access your app at: https://$LAN_IP"
