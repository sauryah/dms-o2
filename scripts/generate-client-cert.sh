#!/bin/bash
set -e

if [ -z "$1" ]; then
    echo "Usage: ./generate-client-cert.sh [client_name]"
    echo "Example: ./generate-client-cert.sh john-laptop"
    exit 1
fi

CLIENT_NAME="$1"
CERTS_DIR="$(dirname "$0")/../certs"

# Verify mkcert is installed and this is the server
if ! command -v mkcert &> /dev/null; then
    echo ""
    echo "ERROR: mkcert command was not found."
    echo "This script must be run on the main DMS server where mkcert is installed."
    echo ""
    exit 1
fi

CAROOT=$(mkcert -CAROOT)

echo "Generating client certificate for $CLIENT_NAME..."
mkcert -client -cert-file "$CERTS_DIR/client-$CLIENT_NAME.pem" -key-file "$CERTS_DIR/client-$CLIENT_NAME-key.pem" localhost 127.0.0.1 ::1

echo "Exporting certificate to PKCS#12 format (.p12)..."
if command -v openssl &> /dev/null; then
    openssl pkcs12 -export -out "$CERTS_DIR/client-$CLIENT_NAME.p12" -inkey "$CERTS_DIR/client-$CLIENT_NAME-key.pem" -in "$CERTS_DIR/client-$CLIENT_NAME.pem" -certfile "$CAROOT/rootCA.pem" -passout pass:
    
    # Generate companion instruction file using template
    sed "s/{{CLIENT_NAME}}/$CLIENT_NAME/g" "$CERTS_DIR/../scripts/client-instructions-template.txt" > "$CERTS_DIR/client-$CLIENT_NAME-INSTRUCTIONS.txt"

    echo ""
    echo "Client certificate successfully generated!"
    echo "Deliver these files securely to the client device:"
    echo "  $CERTS_DIR/client-$CLIENT_NAME.p12"
    echo "  $CERTS_DIR/client-$CLIENT_NAME-INSTRUCTIONS.txt"
    echo ""
else
    echo ""
    echo "WARNING: openssl command not found."
    echo "Please install OpenSSL to export to .p12 format."
    echo "The PEM files (client-$CLIENT_NAME.pem and client-$CLIENT_NAME-key.pem) were created in:"
    echo "  $CERTS_DIR/"
    echo ""
fi
