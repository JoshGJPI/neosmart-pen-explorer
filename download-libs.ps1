# Download Fabric.js library
Write-Host "Downloading Fabric.js library..." -ForegroundColor Green

# Ensure the directory exists
$fabricDir = ".\libs\fabric"
if (-not (Test-Path $fabricDir)) {
    New-Item -ItemType Directory -Path $fabricDir -Force | Out-Null
}

# Download the file
try {
    Invoke-WebRequest -Uri "https://unpkg.com/fabric@5.3.1/dist/fabric.min.js" -OutFile "$fabricDir\fabric.min.js"
    Write-Host "Fabric.js downloaded successfully to $fabricDir\fabric.min.js" -ForegroundColor Green
} catch {
    Write-Host "Error downloading Fabric.js: $_" -ForegroundColor Red
}

Write-Host "Done! Libraries downloaded and ready to use." -ForegroundColor Green
