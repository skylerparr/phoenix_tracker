#!/bin/zsh
#
# Build the frontend for production inside Docker (no Node required on the
# host) and copy the resulting build output into the backend's static
# directory so the Rust backend can serve it.
#
# The CRA build emits content-hashed filenames (e.g. main.<hash>.js) and a
# fresh index.html that references those hashes. The backend's ServeDir
# serves everything under backend/static/, so we copy the WHOLE build
# output (index.html, asset-manifest.json, manifest.json, favicon, logos,
# robots.txt, runtime-config.js, static/js, static/css) — not just the JS —
# to keep the hashes referenced by index.html in sync with the files on
# disk. Copying only the JS leaves index.html pointing at stale hashes,
# which makes ServeDir fall back to serving index.html where the browser
# expects JS, so nothing runs.
#
# The destination static/ directory is cleared first so stale hashes from
# previous builds don't accumulate.

set -e  # Exit on any error

# Resolve repo root from this script's location so it works from any cwd.
SCRIPT_DIR="${0:A:h}"
REPO_ROOT="$SCRIPT_DIR"

FRONTEND_DIR="$REPO_ROOT/frontend"
DEST_STATIC_DIR="$REPO_ROOT/backend/static"

IMAGE_NAME="phoenix_frontend"
# Path to the full CRA build output inside the nginx image (see frontend/Dockerfile).
CONTAINER_HTML_PATH="/usr/share/nginx/html"

# ---------------------------------------------------------------------------
# 1. Build the frontend Docker image (multi-stage: node build -> nginx)
# ---------------------------------------------------------------------------
echo "==> Building frontend Docker image '$IMAGE_NAME'..."
(
  cd "$FRONTEND_DIR"
  docker build -t "$IMAGE_NAME" .
)

# ---------------------------------------------------------------------------
# 2. Copy the full build output out of the image into the backend static dir
# ---------------------------------------------------------------------------
echo "==> Extracting build artifacts from image into $DEST_STATIC_DIR ..."

# Clear the destination so stale hashed artifacts from prior builds don't
# linger (CRA emits content-hashed filenames that index.html references).
rm -rf "$DEST_STATIC_DIR"
mkdir -p "$DEST_STATIC_DIR"

# Create a throwaway container from the image so we can docker cp out of it.
CONTAINER_ID=$(docker create "$IMAGE_NAME")

cleanup() {
  docker rm "$CONTAINER_ID" >/dev/null
}
trap cleanup EXIT INT TERM

# Copy the whole build output (index.html, manifest.json, favicon, logos,
# robots.txt, runtime-config.js, static/js/*, static/css/*, and the
# asset-manifest.json) into a temp dir, then move it into place.
TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"; cleanup' EXIT INT TERM

docker cp "$CONTAINER_ID:$CONTAINER_HTML_PATH/." "$TMP_DIR"/

# Copy the extracted build output into the backend static dir.
cp -a "$TMP_DIR"/. "$DEST_STATIC_DIR"/

# Drop nginx's default error page; it ships in the base image and isn't part
# of the CRA build output.
rm -f "$DEST_STATIC_DIR"/50x.html

rm -rf "$TMP_DIR"

echo "==> Done. Build artifacts now in backend/static/:"
ls -1 "$DEST_STATIC_DIR"
echo "==> Static subdirs:"
ls -1 "$DEST_STATIC_DIR/static"