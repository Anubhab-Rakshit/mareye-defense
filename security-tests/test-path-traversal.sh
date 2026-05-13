#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://localhost:3000}"

encode_b64() {
  # Portable base64 (macOS/Linux)
  printf "%s" "$1" | base64 | tr -d '\n'
}

show_result() {
  local label="$1"
  local url="$2"
  local code
  code=$(curl -sS -o /tmp/mareye_traversal_resp.txt -w "%{http_code}" "$url" || true)
  local size
  size=$(wc -c < /tmp/mareye_traversal_resp.txt | tr -d ' ')
  printf "%-45s -> HTTP %-3s (%s bytes)\n" "$label" "$code" "$size"
}

show_delete_json_result() {
  local label="$1"
  local url="$2"
  local body="$3"
  local code
  code=$(curl -sS -o /tmp/mareye_traversal_resp.txt -w "%{http_code}" -X DELETE -H "Content-Type: application/json" -d "$body" "$url" || true)
  local size
  size=$(wc -c < /tmp/mareye_traversal_resp.txt | tr -d ' ')
  printf "%-45s -> HTTP %-3s (%s bytes)\n" "$label" "$code" "$size"
}

printf "\n[+] Testing traversal attempts against %s\n\n" "$BASE_URL"

# models/download traversal attempts
show_result "models/download ?path=.env" \
  "$BASE_URL/api/models/download?path=.env"
show_result "models/download ?path=../../.env" \
  "$BASE_URL/api/models/download?path=../../.env"
show_result "models/download ?path=/etc/passwd" \
  "$BASE_URL/api/models/download?path=/etc/passwd"

# video endpoints use base64 IDs
bad1=$(encode_b64 "../../.env")
bad2=$(encode_b64 "../../../etc/passwd")
bad3=$(encode_b64 "..%2f..%2f.env")

show_result "cnn/video base64('../../.env')" \
  "$BASE_URL/api/cnn/video/$bad1"
show_result "jetson/video base64('../../.env')" \
  "$BASE_URL/api/jetson/video/$bad1"
show_result "cnn/dummy/video base64('../../../etc/passwd')" \
  "$BASE_URL/api/cnn/dummy/video/$bad2"
show_result "jetson/dummy/video base64('..%2f..%2f.env')" \
  "$BASE_URL/api/jetson/dummy/video/$bad3"

# Analytics delete traversal attempt (non-destructive invalid name test)
show_delete_json_result "analytics DELETE analysisName='../../etc'" \
  "$BASE_URL/api/analytics" \
  '{"analysisName":"../../etc"}'

printf "\n[+] Done. Expectation: 400/403/404, not 200 with sensitive file contents.\n"
