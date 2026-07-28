#!/bin/bash
set -e

echo "========================================================================"
echo "DMS-O2 Certificate Installer for macOS / Linux"
echo "========================================================================"
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLIENT_NAME="{{CLIENT_NAME}}"
CLIENT_PFX="$SCRIPT_DIR/client-$CLIENT_NAME.p12"
ROOT_CA_CER="$SCRIPT_DIR/rootCA.cer"
ROOT_CA_PEM="$SCRIPT_DIR/rootCA.pem"

echo "[*] Installing client certificate for: $CLIENT_NAME"

# 1. Install Client Certificate (.p12)
if [ -f "$CLIENT_PFX" ]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "[*] Importing client certificate to login keychain..."
        security import "$CLIENT_PFX" -k "$HOME/Library/Keychains/login.keychain-db" -P "" >/dev/null 2>&1
        echo "[OK] Client certificate installed successfully."
    else
        echo "[i] On Linux, client certificates (.p12) are typically managed directly within your browser settings."
        echo "    Open your browser settings -> Search for 'Certificates' -> Import under 'Your Certificates'."
    fi
else
    echo "[ERROR] Client certificate file not found: client-$CLIENT_NAME.p12"
fi

# 2. Install Root CA
if [ -f "$ROOT_CA_PEM" ] || [ -f "$ROOT_CA_CER" ]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "[*] Importing Root CA to System Keychain (requires administrator password)..."
        CA_FILE="${ROOT_CA_PEM:-$ROOT_CA_CER}"
        sudo security add-trusted-cert -d -r trustRoot -k "/Library/Keychains/System.keychain" "$CA_FILE"
        echo "[OK] Root CA certificate installed successfully."
    elif [ -d "/usr/local/share/ca-certificates" ]; then
        # Debian/Ubuntu
        echo "[*] Importing Root CA to system trust store (requires sudo)..."
        CA_FILE="${ROOT_CA_PEM:-$ROOT_CA_CER}"
        sudo cp "$CA_FILE" /usr/local/share/ca-certificates/dms-rootCA.crt
        sudo update-ca-certificates
        echo "[OK] Root CA certificate installed successfully."
    elif [ -d "/etc/pki/ca-trust/source/anchors" ]; then
        # RHEL/CentOS/Fedora
        echo "[*] Importing Root CA to system trust store (requires sudo)..."
        CA_FILE="${ROOT_CA_PEM:-$ROOT_CA_CER}"
        sudo cp "$CA_FILE" /etc/pki/ca-trust/source/anchors/dms-rootCA.crt
        sudo update-ca-trust extract
        echo "[OK] Root CA certificate installed successfully."
    else
        echo "[WARNING] Could not automatically determine Linux system trust store location."
        echo "          Please install rootCA.pem manually to your system / browser trust store."
    fi
else
    echo "[WARNING] Root CA file not found in this folder."
fi

# 3. Configure Browser Auto-Select Certificate Policies
echo ""
echo "[*] Configuring browser policies for automatic client certificate selection..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS Chrome
    defaults write com.google.Chrome AutoSelectCertificateForUrls -array '{"pattern":"https://localhost","filter":{}}' '{"pattern":"https://127.0.0.1","filter":{}}' '{"pattern":"https://{{LAN_IP}}","filter":{}}' 2>/dev/null || true
    echo "  [OK] Chrome auto-select policy configured."
    
    # macOS Edge
    defaults write com.microsoft.Edge AutoSelectCertificateForUrls -array '{"pattern":"https://localhost","filter":{}}' '{"pattern":"https://127.0.0.1","filter":{}}' '{"pattern":"https://{{LAN_IP}}","filter":{}}' 2>/dev/null || true
    echo "  [OK] Edge auto-select policy configured."
    
    # macOS Firefox
    sudo mkdir -p "/Library/Application Support/Mozilla" 2>/dev/null || true
    echo '{"policies": {"Preferences": {"security.default_personal_cert": "Select Automatically"}}}' | sudo tee "/Library/Application Support/Mozilla/policies.json" >/dev/null 2>&1 || true
    echo "  [OK] Firefox auto-select policy configured."
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux Chrome
    sudo mkdir -p /etc/opt/chrome/policies/managed 2>/dev/null || true
    echo '{"AutoSelectCertificateForUrls": ["{\"pattern\":\"https://localhost\",\"filter\":{}}", "{\"pattern\":\"https://127.0.0.1\",\"filter\":{}}", "{\"pattern\":\"https://{{LAN_IP}}\",\"filter\":{}}"]}' | sudo tee /etc/opt/chrome/policies/managed/autoselect_cert.json >/dev/null 2>&1 || true
    echo "  [OK] Chrome auto-select policy configured."
    
    # Linux Edge
    sudo mkdir -p /etc/opt/edge/policies/managed 2>/dev/null || true
    echo '{"AutoSelectCertificateForUrls": ["{\"pattern\":\"https://localhost\",\"filter\":{}}", "{\"pattern\":\"https://127.0.0.1\",\"filter\":{}}", "{\"pattern\":\"https://{{LAN_IP}}\",\"filter\":{}}"]}' | sudo tee /etc/opt/edge/policies/managed/autoselect_cert.json >/dev/null 2>&1 || true
    echo "  [OK] Edge auto-select policy configured."
    
    # Linux Firefox
    sudo mkdir -p /etc/firefox/policies 2>/dev/null || true
    echo '{"policies": {"Preferences": {"security.default_personal_cert": "Select Automatically"}}}' | sudo tee /etc/firefox/policies/policies.json >/dev/null 2>&1 || true
    echo "  [OK] Firefox auto-select policy configured."
fi

echo ""
echo "========================================================================"
echo "Installation complete!"
echo "IMPORTANT: Please restart your browser completely for the changes to take effect."
echo "Browsers should now automatically select the \"client-$CLIENT_NAME\" certificate."
echo "========================================================================"
echo ""
