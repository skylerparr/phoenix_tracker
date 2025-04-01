# Set environment variables for Docker Compose
Write-Host "Setting environment variables..."

# Set the variables in current PowerShell environment too
$Env:COMPOSE_PROFILES="dev"
$Env:DATABASE_URL="postgresql://postgres:postgres@10.0.0.111:5432/phoenix_tracker"
$Env:FRONTEND_URL="http://10.0.0.101:4000"
$Env:REACT_APP_API_BASE_URL="http://10.0.0.101:3001"

# Print environment variables for debugging
Write-Host "Environment variables set:"
Write-Host "REACT_APP_API_BASE_URL: $Env:REACT_APP_API_BASE_URL"
Write-Host "DATABASE_URL: $Env:DATABASE_URL"

# Run Docker Compose
Write-Host "Starting Docker Compose..."
docker-compose up backend
