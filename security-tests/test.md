1. Pre-flight setup

```sh
cd /Users/kausheyaroy/Desktop/MyProjects/mareye-hack-among-us
mkdir -p security-tests/results
export BASE_URL="http://localhost:3000"

# Start app in another terminal if not already running
# pnpm dev
```

Expected:
- App is reachable at `$BASE_URL`
- `HONEYPOT_ENABLED` is not set to `false`

2. Baseline sanity check

```sh
curl -sS -i "$BASE_URL/api/health"
```

Expected:
- `HTTP 200`
- JSON with `status: "healthy"`

3. Run automated security scripts

```sh
./security-tests/test-sensitive-paths.sh "$BASE_URL" \
| tee "security-tests/results/sensitive_$(date +%F_%H%M%S).log"

./security-tests/test-path-traversal.sh "$BASE_URL" \
| tee "security-tests/results/traversal_$(date +%F_%H%M%S).log"
```

Expected output (decoy mode):
- `/.env [decoy-check] -> ... (decoy payload detected)`
- `/.env` and `/.env.local` may return `200` with fake content (expected)
- Traversal probes return `400/403/404` (not `200` with sensitive file bytes)

4. Manual traversal and file-access checks

```sh
# Analytics traversal delete attempt
curl -i -X DELETE "$BASE_URL/api/analytics" \
  -H "Content-Type: application/json" \
  -d '{"analysisName":"../../etc"}'

# Dynamic analytics path traversal style
curl -i -X DELETE "$BASE_URL/api/analytics/%2e%2e%2f%2e%2e%2fetc"

# Deployment path probing attempt outside project
curl -i -X POST "$BASE_URL/api/deployments/deploy" \
  -H "Content-Type: application/json" \
  -d '{"deploymentName":"test","deploymentPath":"/etc"}'
```

Expected:
- Analytics delete traversal is blocked (`400/403/404`)
- Deployment outside project is blocked (`403`)

5. Command-injection smoke test

```sh
rm -f /tmp/mareye_pwned

curl -i -X POST "$BASE_URL/api/mission/plan-path" \
  -H "Content-Type: application/json" \
  -d '{"start":{"lat":"1;touch /tmp/mareye_pwned","lng":72},"goal":{"lat":2,"lng":73},"threat_zones":[]}'

test -f /tmp/mareye_pwned && echo "FAIL: command executed" || echo "PASS: no command execution"
```

Expected:
- Marker file is not created
- Final line prints `PASS: no command execution`

6. Decoy credential replay tests (honeypot trap)

```sh
# Explicitly fetch decoy .env and verify canary key is present
curl -sS "$BASE_URL/.env" | head -n 20

# Attempt login using fake credentials from decoy .env
curl -i -X POST "$BASE_URL/api/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"ops-control@mareye-sec.net","password":"HP_Admin#Mareye_2026"}'

# Attempt API use with fake INTERNAL_API_KEY
curl -i "$BASE_URL/api/health" \
  -H "Authorization: Bearer hp_api_5f9f2f799c2a4378b65d"
```

Expected:
- Login attempt returns `401 Invalid credentials`
- Decoy key request is trapped/re-written to honeypot behavior (not normal health JSON)

7. Verify honeypot logs captured attacker behavior

```sh
grep -n "decoy-credential-reuse\|decoy_hits=\|path-traversal-pattern\|rce-pattern" \
  .security/honeypot-events.ndjson | tail -n 20
```

Expected:
- Events include decoy replay indicators
- Entries show what was used, for example `decoy_hits=INTERNAL_API_KEY` or `hits=ADMIN_EMAIL,ADMIN_PASSWORD`
- Risk score is elevated for decoy replay

8. Optional false-positive check (normal traffic still works)

```sh
curl -sS "$BASE_URL/api/health"
```

Expected:
- Without decoy credentials in headers/query/body, endpoint behaves normally

9. Pass criteria (all attacks verified)

- No real secret files are leaked.
- Path traversal attempts are blocked.
- Command injection payload does not execute.
- Decoy `.env` is served instead of real env.
- Reuse of decoy credentials is trapped and logged with indicator details.

