#!/bin/bash
set -e

echo "======================================================"
echo ">>> Uninstalling TLS Certificates & Root CA"
echo "======================================================"
echo ""

# 1. Uninstall the Root CA from the system trust store
if command -v mkcert &> /dev/null; then
    mkcert -uninstall
    echo "[OK] Successfully uninstalled Root CA from system trust store."
else
    echo "[WARNING] mkcert command not found. Could not run 'mkcert -uninstall'."
fi

# 2. Delete generated files from certs directory
CERTS_DIR="$(dirname "$0")/../certs"
if [ -d "$CERTS_DIR" ]; then
    echo "Cleaning certs directory..."
    rm -rf "$CERTS_DIR"/*
    echo "[OK] Removed all certificate files from $CERTS_DIR/"
fi

echo ""
echo "Uninstall completed successfully!"
echo "======================================================"
