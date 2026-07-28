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
openssl x509 -inform PEM -in "$CERTS_DIR/rootCA.pem" -outform DER -out "$CERTS_DIR/rootCA.cer" 2>/dev/null || true

# Automatically generate client certificate if mTLS is active
DYNAMIC_YML="$(dirname "$0")/../dynamic.yml"
if [ -f "$DYNAMIC_YML" ] && grep -q "clientAuth:" "$DYNAMIC_YML"; then
    echo "Generating client certificate (lihas.dms)..."
    CLIENT_NAME="lihas.dms"
    mkcert -client -cert-file "$CERTS_DIR/client-$CLIENT_NAME.pem" -key-file "$CERTS_DIR/client-$CLIENT_NAME-key.pem" localhost 127.0.0.1 ::1
    
    if command -v openssl &> /dev/null; then
        openssl pkcs12 -export -out "$CERTS_DIR/client-$CLIENT_NAME.p12" -inkey "$CERTS_DIR/client-$CLIENT_NAME-key.pem" -in "$CERTS_DIR/client-$CLIENT_NAME.pem" -certfile "$CERTS_DIR/rootCA.pem" -passout pass:
        
        SCRIPTS_DIR="$(dirname "$0")"
        if [ -f "$SCRIPTS_DIR/client-install-template.bat" ]; then
            sed -e "s/{{CLIENT_NAME}}/$CLIENT_NAME/g" -e "s/{{LAN_IP}}/$LAN_IP/g" "$SCRIPTS_DIR/client-install-template.bat" > "$CERTS_DIR/client-$CLIENT_NAME-install.bat"
        fi
        if [ -f "$SCRIPTS_DIR/client-install-template.sh" ]; then
            sed -e "s/{{CLIENT_NAME}}/$CLIENT_NAME/g" -e "s/{{LAN_IP}}/$LAN_IP/g" "$SCRIPTS_DIR/client-install-template.sh" > "$CERTS_DIR/client-$CLIENT_NAME-install.sh"
            chmod +x "$CERTS_DIR/client-$CLIENT_NAME-install.sh"
        fi
        if [ -f "$SCRIPTS_DIR/client-instructions-template.txt" ]; then
            sed -e "s/{{CLIENT_NAME}}/$CLIENT_NAME/g" -e "s/{{LAN_IP}}/$LAN_IP/g" "$SCRIPTS_DIR/client-instructions-template.txt" > "$CERTS_DIR/client-$CLIENT_NAME-INSTRUCTIONS.txt"
        fi
    fi
fi

echo ""
echo "Certificates generated in $CERTS_DIR/"
echo "  cert.pem  - server certificate (valid for $LAN_IP)"
echo "  key.pem   - private key"
echo "  rootCA.pem - root CA (install on other machines for trusted access)"
echo ""
echo "Access your app at: https://$LAN_IP"
