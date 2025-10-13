# Set environment variables for Docker Compose
Write-Host "Setting environment variables..."

# Set the variables in current PowerShell environment too
$Env:COMPOSE_PROFILES="dev,localstack"
$Env:DATABASE_URL="postgresql://postgres:postgres@postgres:5432/phoenix_tracker"
$Env:FRONTEND_URL="http://localhost:4000"
$Env:REACT_APP_API_BASE_URL="http://localhost:3001"

# Use AWS S3 via LocalStack for file storage
$Env:FILE_STORE_SCHEME="aws"
$Env:S3_BUCKET="phoenix-uploads"
$Env:AWS_DEFAULT_REGION="us-east-1"
$Env:AWS_REGION=$Env:AWS_DEFAULT_REGION
$Env:AWS_ACCESS_KEY_ID="test"
$Env:AWS_SECRET_ACCESS_KEY="test"
$Env:S3_FORCE_PATH_STYLE="1"
$Env:S3_PUBLIC_ENDPOINT_URL="http://localhost:4566"

# Still define BASE_FILE_PATH for local storage (unused when FILE_STORE_SCHEME=aws)
$Env:BASE_FILE_PATH="/phoenix-file-uploads"

# Print environment variables for debugging
Write-Host "Environment variables set:"
Write-Host "REACT_APP_API_BASE_URL: $Env:REACT_APP_API_BASE_URL"
Write-Host "DATABASE_URL: $Env:DATABASE_URL"
Write-Host "FILE_STORE_SCHEME: $Env:FILE_STORE_SCHEME"
Write-Host "S3_BUCKET: $Env:S3_BUCKET"
Write-Host "AWS_REGION: $Env:AWS_REGION"
Write-Host "S3_FORCE_PATH_STYLE: $Env:S3_FORCE_PATH_STYLE"
Write-Host "S3_PUBLIC_ENDPOINT_URL: $Env:S3_PUBLIC_ENDPOINT_URL"
Write-Host "BASE_FILE_PATH: $Env:BASE_FILE_PATH"
Write-Host "COMPOSE_PROFILES: $Env:COMPOSE_PROFILES"

# Run Docker Compose
Write-Host "Starting Docker Compose with profiles: $Env:COMPOSE_PROFILES"

# Start LocalStack first (detached) so we can provision the S3 bucket
Write-Host "Starting LocalStack (detached)..."
docker compose --profile localstack up -d localstack

# Wait for LocalStack S3 to become available
Write-Host "Waiting for LocalStack S3 service to be available..."
$maxRetries = 60
for ($i = 0; $i -lt $maxRetries; $i++) {
  try {
    $health = Invoke-RestMethod -Uri "http://localhost:4566/_localstack/health" -ErrorAction Stop
    if ($health.services.s3 -eq "available") {
      Write-Host "LocalStack S3 is available."
      break
    }
  } catch {
    # ignore and retry
  }
  Start-Sleep -Seconds 1
  if ($i -eq ($maxRetries - 1)) {
    Write-Error "LocalStack did not become ready in time."
    exit 1
  }
}

# Ensure S3 bucket exists inside LocalStack
Write-Host "Ensuring S3 bucket exists: $Env:S3_BUCKET"
docker compose exec -T localstack awslocal s3 mb s3://$Env:S3_BUCKET 2>$null | Out-Null

# Bring up the full stack in the foreground
Write-Host "Bringing up the stack..."
docker compose --profile localstack up
