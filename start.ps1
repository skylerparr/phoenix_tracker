# Set environment variables for Docker Compose
Write-Host "Setting environment variables..."

# Set the variables in current PowerShell environment too
$Env:COMPOSE_PROFILES="dev"
$Env:DATABASE_URL="postgresql://postgres:postgres@postgres:5432/phoenix_tracker"
$Env:FRONTEND_URL="http://localhost:4000"
$Env:REACT_APP_API_BASE_URL="http://localhost:3001"
$Env:FILE_STORE_SCHEME="local"
$Env:BASE_FILE_PATH="/phoenix-file-uploads"

# Print environment variables for debugging
Write-Host "Environment variables set:"
Write-Host "REACT_APP_API_BASE_URL: $Env:REACT_APP_API_BASE_URL"
Write-Host "DATABASE_URL: $Env:DATABASE_URL"
Write-Host "FILE_STORE_SCHEME: $Env:FILE_STORE_SCHEME"
Write-Host "BASE_FILE_PATH: $Env:BASE_FILE_PATH"

docker compose up
