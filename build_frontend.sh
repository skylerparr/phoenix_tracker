#!/bin/zsh
#
# Build the frontend for production inside Docker (no Node required on the
# host) and copy the resulting JavaScript artifacts into the backend's
# static directory so the Rust backend can serve them.
#
# The CRA build emits content-hashed filenames (main.<hash>.js plus its
# .map and .LICENSE.txt), so the destination js/ directory is cleared
# first to avoid accumulating stale hashes from previous builds.

set -e  # Exit on any error

# Resolve repo root from this script's location so it works from any cwd.
SCRIPT_DIR="${0:A:h}"
REPO_ROOT="$SCRIPT_DIR"

FRONTEND_DIR="$REPO_ROOT/frontend"
DEST_JS_DIR="$REPO_ROOT/backend/static/static/js"

IMAGE_NAME="phoenix_frontend"
# Path to the built JS artifacts inside the nginx image (see frontend/Dockerfile).
CONTAINER_JS_PATH="/usr/share/nginx/html/static/js"

# ---------------------------------------------------------------------------
# 1. Build the frontend Docker image (multi-stage: node build -> nginx)
# ---------------------------------------------------------------------------
echo "==> Building frontend Docker image '$IMAGE_NAME'..."
(
  cd "$FRONTEND_DIR"
  docker build -t "$IMAGE_NAME" .
)

# ---------------------------------------------------------------------------
# 2. Copy the JS artifacts out of the image into the backend static dir
# ---------------------------------------------------------------------------
echo "==> Extracting JS artifacts from image into $DEST_JS_DIR ..."
mkdir -p "$DEST_JS_DIR"

# Remove stale hashed JS artifacts before copying fresh ones.
rm -f "$DEST_JS_DIR"/*.js "$DEST_JS_DIR"/*.js.map "$DEST_JS_DIR"/*.js.LICENSE.txt

# Create a throwaway container from the image so we can docker cp out of it.
CONTAINER_ID=$(docker create "$IMAGE_NAME")

cleanup() {
  docker rm "$CONTAINER_ID" >/dev/null
}
trap cleanup EXIT INT TERM

# Copy the whole js/ directory from the image, then move its contents into place.
TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"; cleanup' EXIT INT TERM

docker cp "$CONTAINER_ID:$CONTAINER_JS_PATH/." "$TMP_DIR"/

cp "$TMP_DIR"/*.js             "$DEST_JS_DIR"/
cp "$TMP_DIR"/*.js.map         "$DEST_JS_DIR"/ 2>/dev/null || true
cp "$TMP_DIR"/*.js.LICENSE.txt "$DEST_JS_DIR"/ 2>/dev/null || true

rm -rf "$TMP_DIR"

echo "==> Done. JS artifacts now in backend/static/static/js/:"
ls -1 "$DEST_JS_DIR"