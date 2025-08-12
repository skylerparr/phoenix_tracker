#!/usr/bin/env bash
set -euo pipefail

# Script: login_and_fetch_backlog.sh
# Purpose: Log in (email-only), switch to a project-scoped JWT, and fetch backlog issues.
# Defaults: email=skylerparrti@gmail.com, base_url=https://pt.local/api, project_id=4
# TLS: For local dev at pt.local, allow self-signed by default unless a CA is provided or --insecure is set.
# Usage examples:
#   ./scripts/login_and_fetch_backlog.sh
#   ./scripts/login_and_fetch_backlog.sh --base-url https://pt.local/api --project-id 4
#   ./scripts/login_and_fetch_backlog.sh --cacert /path/to/pt-ca.pem
#   ./scripts/login_and_fetch_backlog.sh --insecure  # force curl -k

EMAIL=${EMAIL:-""}
BASE_URL=${BASE_URL:-"https://pt.local/api"}
PROJECT_ID=${PROJECT_ID:-4}
INSECURE=0
CACERT=""
OUTPUT="-"   # default stdout

usage() {
  cat <<EOF
Usage: $0 [-e|--email EMAIL] [--base-url URL] [-p|--project-id ID] [--insecure] [--cacert FILE] [--output FILE]

Options:
  -e, --email       Login email (default: ${EMAIL}; can also set env EMAIL)
  --base-url URL    API base URL (default: ${BASE_URL}; can also set env BASE_URL)
  -p, --project-id  Project ID to scope the JWT (default: ${PROJECT_ID}; can also set env PROJECT_ID)
  --insecure        Allow insecure TLS for local dev (adds curl -k)
  --cacert FILE     Use CA certificate file for TLS verification (curl --cacert)
  --output FILE     Write backlog JSON to FILE (default: stdout)

Env:
  EMAIL            If set, used as default login email
  BASE_URL         If set, used as default API base URL
  PROJECT_ID       If set, used as default project id
EOF
}

die() { echo "Error: $*" 1>&2; exit 1; }

need_cmd() { command -v "$1" >/dev/null 2>&1 || die "Missing required command: $1"; }

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --base-url)
      BASE_URL="${2:-}"; shift 2;;
    -e|--email)
      EMAIL="${2:-}"; shift 2;;
    -p|--project-id)
      PROJECT_ID="${2:-}"; shift 2;;
    --insecure)
      INSECURE=1; shift 1;;
    --cacert)
      CACERT="${2:-}"; shift 2;;
    --output)
      OUTPUT="${2:-}"; shift 2;;
    -h|--help)
      usage; exit 0;;
    *)
      die "Unknown argument: $1";;
  esac
done

need_cmd curl
need_cmd jq

# Build curl options
CURL_OPTS=("-sS" "--fail")
if [[ -n "$CACERT" ]]; then
  CURL_OPTS+=("--cacert" "$CACERT")
fi
if [[ "$INSECURE" == "1" ]]; then
  CURL_OPTS+=("-k")
fi
# If using pt.local and no CA is provided and not explicitly strict, allow -k for dev
BASE_HOST=$(printf "%s" "$BASE_URL" | sed -E 's#^https?://([^/]+)/?.*#\1#')
if [[ "$BASE_HOST" == "pt.local" && -z "$CACERT" && "$INSECURE" != "1" ]]; then
  CURL_OPTS+=("-k")
fi

# 1) Login to get base token (no project bound) — email-only
LOGIN_PAYLOAD=$(jq -n --arg email "$EMAIL" '{email:$email}')
LOGIN_RESP=$(curl "${CURL_OPTS[@]}" -H 'Content-Type: application/json' -X POST \
  "${BASE_URL}/auth/login" \
  -d "$LOGIN_PAYLOAD" || true)

BASE_TOKEN=$(jq -r '.token // empty' <<<"$LOGIN_RESP")
if [[ -z "$BASE_TOKEN" || "$BASE_TOKEN" == "null" ]]; then
  echo "Login response:" 1>&2
  echo "$LOGIN_RESP" | jq . 1>&2 || echo "$LOGIN_RESP" 1>&2
  die "Failed to obtain base JWT token from /auth/login"
fi

# 2) Switch to project-scoped token (API expects camelCase projectId)
SWITCH_PAYLOAD=$(jq -n --argjson projectId "$PROJECT_ID" '{projectId:$projectId}')
SWITCH_RESP=$(curl "${CURL_OPTS[@]}" -H 'Content-Type: application/json' \
  -H "Authorization: ${BASE_TOKEN}" \
  -X POST "${BASE_URL}/auth/switch-project" \
  -d "$SWITCH_PAYLOAD" || true)

PROJECT_TOKEN=$(jq -r '.token // empty' <<<"$SWITCH_RESP")
if [[ -z "$PROJECT_TOKEN" || "$PROJECT_TOKEN" == "null" ]]; then
  echo "Switch-project response:" 1>&2
  echo "$SWITCH_RESP" | jq . 1>&2 || echo "$SWITCH_RESP" 1>&2
  die "Failed to obtain project-scoped JWT token from /auth/switch-project"
fi

# 3) Fetch backlog issues for the selected project
BACKLOG_RESP=$(curl "${CURL_OPTS[@]}" -H "Authorization: ${PROJECT_TOKEN}" \
  "${BASE_URL}/issues" || true)

# Try to pretty print; if invalid JSON, pass through
if jq -e . >/dev/null 2>&1 <<<"$BACKLOG_RESP"; then
  if [[ "$OUTPUT" == "-" ]]; then
    jq . <<<"$BACKLOG_RESP"
  else
    jq . <<<"$BACKLOG_RESP" > "$OUTPUT"
    echo "Backlog written to $OUTPUT"
  fi
else
  if [[ "$OUTPUT" == "-" ]]; then
    printf "%s\n" "$BACKLOG_RESP"
  else
    printf "%s\n" "$BACKLOG_RESP" > "$OUTPUT"
    echo "Backlog written to $OUTPUT"
  fi
fi

