# MarEye Honeypot Setup

## What was implemented

- **Decoy trap routing** in `middleware.ts` for suspicious paths (e.g. `/admin`, `/wp-login.php`, `/.env`, `/.git`, `phpmyadmin`, backup file probes).
- **Trap endpoint** at `app/api/honeypot/trap/route.ts` that logs all interaction and returns believable decoy responses.
- **Server-only telemetry logger** in `lib/honeypot.ts` writing to `.security/honeypot-events.ndjson`.
- **Protected log API** at `app/api/security/honeypot-logs/route.ts`.
- **Optional high-risk alert webhook** (`HONEYPOT_ALERT_WEBHOOK_URL`) with threshold (`HONEYPOT_ALERT_THRESHOLD`).
- **Feature flag** via `HONEYPOT_ENABLED` (`false` disables honeypot).

## Secure log storage

Logs are written under:

- `.security/honeypot-events.ndjson`

This directory is server-side and not publicly served.

## Developer access (secure)

Honeypot logs are accessible only from authenticated admin session.

- Admin session is issued **only** when login uses:
	- `HONEYPOT_ADMIN_EMAIL`
	- `HONEYPOT_ADMIN_PASSWORD`
- OTP login grants honeypot admin access **only when** the OTP-verified email matches `HONEYPOT_ADMIN_EMAIL`.
- Internal console path: `/security/honeypot`
- Logs endpoint: `GET /api/security/honeypot-logs?limit=100`

Without honeypot admin session, endpoint returns `404`.

## Recommended env config

```env
HONEYPOT_ENABLED=true
HONEYPOT_ADMIN_EMAIL=admin@yourdomain.com
HONEYPOT_ADMIN_PASSWORD=replace_with_strong_password
HONEYPOT_ALERT_WEBHOOK_URL=
HONEYPOT_ALERT_THRESHOLD=70
```

Honeypot panel and logs are available when either condition is met:
- password login with `HONEYPOT_ADMIN_EMAIL` + `HONEYPOT_ADMIN_PASSWORD`
- OTP login for `HONEYPOT_ADMIN_EMAIL`

## Quick test

1. Trigger decoy paths:

- `GET /admin`
- `POST /wp-login.php` with suspicious payload

2. Verify protection:

- `GET /api/security/honeypot-logs` as non-admin login -> `404`

3. Verify authorized access:

- Login with configured admin email/password -> open `/security/honeypot` -> logs load

## Operational note

- Keep honeypot admin credentials private and rotate periodically.
- Keep `.security/` access restricted to server/admin users only.
