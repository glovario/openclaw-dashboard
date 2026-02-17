# Dev/Staging Environment Design

> OC-095 — Owner: Norman | Status: Complete (design ready for implementation)

## Overview

A dedicated development environment that mirrors production but is fully isolated from it. Dev activities — including restarts, migrations, data resets, and experimental features — cannot touch the live dashboard.

---

## Architecture

### Deployment Topology

| Environment | URL                        | Port  | DB path                          | API Key         |
|-------------|----------------------------|-------|----------------------------------|-----------------|
| Production  | http://localhost:3420      | 3420  | `data/dashboard.db`              | (live key)      |
| Development | http://localhost:3421      | 3421  | `data/dev-dashboard.db`          | (dev-only key)  |

- Different ports prevent accidental prod traffic from hitting dev
- Different API keys ensure requests are unambiguously routed
- Different DB file paths ensure zero shared state

### Config via Environment Variables

The server already reads `DB_PATH` from the environment. Extending with:

```
PORT=3421
DB_PATH=./data/dev-dashboard.db
API_KEY=dev-only-key-change-me
NODE_ENV=development
```

All config for each environment lives in its own `.env` file (`.env.production`, `.env.development`). Neither is committed to git.

---

## Provisioning Script

`scripts/dev-start.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO="$SCRIPT_DIR/.."

# Load dev config
export PORT=3421
export DB_PATH="$REPO/data/dev-dashboard.db"
export NODE_ENV=development

# Seed dev DB from production snapshot (read-only copy)
if [[ "${SEED:-0}" == "1" ]]; then
  echo "[dev] Seeding dev DB from production snapshot..."
  cp "$REPO/data/dashboard.db" "$DB_PATH"
  echo "[dev] Seed complete."
fi

echo "[dev] Starting dashboard on port $PORT..."
node "$REPO/src/server.js"
```

Run with `SEED=1 ./scripts/dev-start.sh` to refresh dev data from production. Run without `SEED` to keep existing dev data.

### Systemd Unit (optional)

`openclaw-dashboard-dev.service`:

```ini
[Unit]
Description=OpenClaw Dashboard (Dev)
After=network.target

[Service]
Type=simple
WorkingDirectory=/home/matt/.openclaw/workspace/openclaw-dashboard
Environment=PORT=3421
Environment=DB_PATH=/home/matt/.openclaw/workspace/openclaw-dashboard/data/dev-dashboard.db
Environment=NODE_ENV=development
ExecStart=/usr/bin/node src/server.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

---

## Network Isolation

For this single-machine setup, isolation is achieved via:

1. **Port separation** — prod on 3420, dev on 3421; no shared listener
2. **Separate API keys** — requests can be audited by key
3. **LAN firewall recommendation** — expose only port 3420 externally; dev port 3421 should be localhost-only
   - If using `ufw`: `sudo ufw deny in on <iface> to any port 3421`

If the environment moves to Docker in future, network isolation is automatic via bridge networks.

---

## Fail-Safes

| Risk | Mitigation |
|------|-----------|
| Dev accidentally pointed at prod DB | DB_PATH is always explicit; prod path has a different filename |
| Dev restart kills prod | Separate process / systemd unit |
| Dev data is stale | `SEED=1` re-copies from prod (read-only copy, no write-back) |
| Dev changes deployed to prod | Feature branch → PR → Matt review → merge; deploy step is manual |

---

## Health Checks

Both environments expose `GET /api/health` (add this if not present). A simple monitor:

```bash
# cron: */5 * * * *
curl -sf http://localhost:3421/api/health || notify-send "Dev dashboard is down"
```

Or via OpenClaw's HEARTBEAT.md: add a periodic `curl` check against the dev port.

---

## Runbook

### Start dev environment
```bash
cd /home/matt/.openclaw/workspace/openclaw-dashboard
./scripts/dev-start.sh
```

### Refresh dev data from production
```bash
SEED=1 ./scripts/dev-start.sh
```

### Stop dev environment
```bash
# If running in foreground: Ctrl+C
# If systemd: sudo systemctl stop openclaw-dashboard-dev
```

### Destroy dev database
```bash
rm /home/matt/.openclaw/workspace/openclaw-dashboard/data/dev-dashboard.db
```

### Hand off to another engineer
1. Clone the repo
2. Copy `.env.development` (share via secure channel, not git)
3. Run `SEED=1 ./scripts/dev-start.sh`

---

## Implementation Checklist

- [ ] Add `PORT` support to `src/server.js` (currently hardcoded?)
- [ ] Create `scripts/dev-start.sh`
- [ ] Add `.env.development` to `.gitignore`
- [ ] Test: start dev on 3421 with prod on 3420 simultaneously
- [ ] Test: `SEED=1` copies prod DB without affecting prod service
- [ ] Document port in README

---

*Last updated: 2026-02-17 — Norman (OC-095)*
