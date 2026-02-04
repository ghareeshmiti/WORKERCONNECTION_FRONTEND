Write-Host "Starting FIDO Setup (HTTPS Safe Mode)..."

# Generate Certs if missing
if (-not (Test-Path "cert.pem") -or -not (Test-Path "key.pem")) {
    Write-Host "Certificates missing. Generating..."
    node generate_cert.js
}

# Start Server
Write-Host "Starting Server (HTTPS)..."
Start-Process -FilePath "node" -ArgumentList "index.js" -WorkingDirectory "server" -WindowStyle Minimized

# Start Client
Write-Host "Starting Client (HTTPS)..."
Start-Process -FilePath "npm.cmd" -ArgumentList "run dev" -WorkingDirectory "client" -WindowStyle Minimized

# Start Ngrok
Write-Host "Starting Ngrok (Tunneling to HTTPS Client)..."
try {
    # 2025-01-12 Fix: ADD --host-header=rewrite to prevent host mismatch errors
    Start-Process -FilePath "npx.cmd" -ArgumentList "ngrok http https://localhost:5173 --host-header=rewrite --log=stderr" -WindowStyle Minimized
}
catch {
    Write-Host "Failed to start ngrok."
}

Write-Host "Application startup initiated."
Write-Host "Server: https://localhost:3000"
Write-Host "Client: https://localhost:5173"
