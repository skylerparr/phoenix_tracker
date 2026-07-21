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
#
# Usage:
#   ./build_frontend.sh                          # use ApiConfig.tsx default
#   ./build_frontend.sh --api-base-url <url>     # bake REACT_APP_API_BASE_URL into the bundle
#   REACT_APP_API_BASE_URL=<url> ./build_frontend.sh
#
# REACT_APP_API_BASE_URL is inlined by create-react-app at build time, so it
# must be present during the image build. It is forwarded to Docker via
# --build-arg and declared as an ARG in frontend/Dockerfile.

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
# 0. Parse arguments
# ---------------------------------------------------------------------------
# Inherit from environment if set, allow --api-base-url to override it.
API_BASE_URL="${REACT_APP_API_BASE_URL:-}"

# Captured at top level because $0 inside a zsh function is the function name.
SCRIPT_NAME="$0"

usage() {
  cat >&2 <<EOF
Usage: $SCRIPT_NAME [--api-base-url <url>]

Bakes REACT_APP_API_BASE_URL into the frontend bundle at build time
(create-react-app inlines REACT_APP_* vars during the build). If omitted,
the default from frontend/src/config/ApiConfig.tsx (http://localhost:3001)
is used.

Can also be set via the REACT_APP_API_BASE_URL environment variable.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --api-base-url)
      [[ $# -ge 2 ]] || { echo "Error: --api-base-url requires a value" >&2; usage; exit 1; }
      API_BASE_URL="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Error: unknown argument '$1'" >&2
      usage
      exit 1
      ;;
  esac
done

BUILD_ARGS=()
if [[ -n "$API_BASE_URL" ]]; then
  echo "==> Baking REACT_APP_API_BASE_URL=$API_BASE_URL into the bundle"
  BUILD_ARGS+=(--build-arg "REACT_APP_API_BASE_URL=$API_BASE_URL")
else
  echo "==> No API base URL specified; using ApiConfig.tsx default (http://localhost:3001)"
fi

# ---------------------------------------------------------------------------
# 1. Build the frontend Docker image (multi-stage: node build -> nginx)
# ---------------------------------------------------------------------------
echo "==> Building frontend Docker image '$IMAGE_NAME'..."
(
  cd "$FRONTEND_DIR"
  docker build -t "$IMAGE_NAME" "${BUILD_ARGS[@]}" .
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