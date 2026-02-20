# Do-Not-Repeat Ledger

## 2026-02-20 — WhatsApp channel/plugin drift (OC-142)

- **Incident pattern:** delivery/runtime failures when `plugins.entries.whatsapp.enabled=false` while WhatsApp channel/bindings are still active.
- **Guard added:** `scripts/check-whatsapp-binding-drift.js` now detects both legacy (`routing.bindings[].to`) and current (`bindings[].match.channel`) binding shapes.
- **Operator check:** run before enabling WhatsApp-targeted crons:
  - `node scripts/check-whatsapp-binding-drift.js /home/matt/.openclaw/openclaw.json`
- **Expected result:** `{ "ok": true, ... }`
- **If drift found:** either re-enable plugin + valid account setup, or remove stale WhatsApp channel/binding references and migrate cron delivery to Telegram.
