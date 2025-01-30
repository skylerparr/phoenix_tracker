$Env:COMPOSE_PROFILES="dev"
$Env:DATABASE_URL="postgresql://postgres:postgres@10.0.0.111:5432/phoenix_tracker"
docker-compose up backend frontend -d
