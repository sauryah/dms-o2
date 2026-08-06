$certsDir = Join-Path $PSScriptRoot "..\certs"
if (-not (Test-Path $certsDir)) { New-Item -ItemType Directory -Path $certsDir -Force | Out-Null }

$opensslBin = Get-Command openssl -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source
if (-not $opensslBin) {
    if (Test-Path "C:\Program Files\Git\usr\bin\openssl.exe") { $opensslBin = "C:\Program Files\Git\usr\bin\openssl.exe" }
    elseif (Test-Path "C:\Program Files (x86)\Git\usr\bin\openssl.exe") { $opensslBin = "C:\Program Files (x86)\Git\usr\bin\openssl.exe" }
}

if (-not $opensslBin) {
    Write-Error "ERROR: OpenSSL binary not found."
    exit 1
}

$certsLanIp = Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
    $_.IPAddress -notlike "127.*" -and
    $_.IPAddress -notlike "169.254.*" -and
    $_.InterfaceAlias -notmatch "Loopback|vEthernet|docker|WSL|Hyper"
} | Select-Object -First 1 -ExpandProperty IPAddress

if (-not $certsLanIp) { $certsLanIp = "127.0.0.1" }

$rootCaPem = Join-Path $certsDir "rootCA.pem"
$rootCaKey = Join-Path $certsDir "rootCA.key"
$rootCaCer = Join-Path $certsDir "rootCA.cer"
$keyPem    = Join-Path $certsDir "key.pem"
$certPem   = Join-Path $certsDir "cert.pem"
$sanCnf    = Join-Path $certsDir "san.cnf"
$serverCsr = Join-Path $certsDir "server.csr"

if (-not (Test-Path $rootCaPem)) {
    & $opensslBin req -x509 -new -nodes -keyout $rootCaKey -sha256 -days 3650 -out $rootCaPem -subj "/CN=DMS Local Root CA" 2>$null
}

$sanContent = @"
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
CN = localhost

[v3_req]
keyUsage = keyEncipherment, dataEncipherment, digitalSignature
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
IP.1 = 127.0.0.1
IP.2 = $certsLanIp
IP.3 = ::1
"@
[System.IO.File]::WriteAllText($sanCnf, $sanContent)

& $opensslBin genrsa -out $keyPem 2048 2>$null
& $opensslBin req -new -key $keyPem -out $serverCsr -config $sanCnf 2>$null
& $opensslBin x509 -req -in $serverCsr -CA $rootCaPem -CAkey $rootCaKey -CAcreateserial -out $certPem -days 825 -sha256 -extfile $sanCnf -extensions v3_req 2>$null

Copy-Item $rootCaPem $rootCaCer -Force
if (Test-Path $sanCnf) { Remove-Item $sanCnf -Force }
if (Test-Path $serverCsr) { Remove-Item $serverCsr -Force }
$srlFile = Join-Path $certsDir "rootCA.srl"
if (Test-Path $srlFile) { Remove-Item $srlFile -Force }

Write-Host ">>> OpenSSL certificates generated successfully in certs/!" -ForegroundColor Green
Get-ChildItem $certsDir | Select-Object Name, Length
