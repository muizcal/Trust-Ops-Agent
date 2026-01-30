Write-Host "🚀 Deploying Trust Ops Agent to Sui Mainnet" -ForegroundColor Green
Write-Host ""

# Switch to mainnet
Write-Host "Switching to Sui Mainnet..." -ForegroundColor Cyan
sui client switch --env mainnet

# Build
Write-Host "Building Move package..." -ForegroundColor Cyan
sui move build

# Publish
Write-Host "Publishing to Sui Mainnet..." -ForegroundColor Cyan
sui client publish --gas-budget 500000000

Write-Host ""
Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host "Save the Package ID and Registry ID from above" -ForegroundColor Yellow