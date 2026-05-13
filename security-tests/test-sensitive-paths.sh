#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://localhost:3000}"

TARGETS=(
  "/.env"
  "/.env.local"
  "/.git/config"
  "/.git/HEAD"
  "/.svn/entries"
  "/wp-login.php"
  "/admin"
  "/api/internal"
  "/api/debug"
  "/backup.zip"
  "/server-status"
)

printf "\n[+] Testing sensitive-path exposure on %s\n\n" "$BASE_URL"

env_code=$(curl -sS -o /tmp/mareye_env_resp.txt -w "%{http_code}" "$BASE_URL/.env" || true)
if grep -q "HONEYPOT_CANARY=" /tmp/mareye_env_resp.txt; then
  printf "%-24s -> HTTP %-3s (%s)\n" "/.env [decoy-check]" "$env_code" "decoy payload detected"
else
  printf "%-24s -> HTTP %-3s (%s)\n" "/.env [decoy-check]" "$env_code" "decoy payload missing"
fi

for path in "${TARGETS[@]}"; do
  code=$(curl -sS -o /tmp/mareye_resp.txt -w "%{http_code}" "$BASE_URL$path" || true)
  size=$(wc -c < /tmp/mareye_resp.txt | tr -d ' ')
  printf "%-24s -> HTTP %-3s (%s bytes)\n" "$path" "$code" "$size"
done

printf "\n[+] Sample body (last request):\n"
head -c 300 /tmp/mareye_resp.txt || true
printf "\n\n[+] Done. Expectation: .env can return decoy content, but no real secret/config contents should leak.\n"
