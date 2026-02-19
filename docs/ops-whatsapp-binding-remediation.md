# OC-142 WhatsApp binding drift remediation

## Problem
Legacy config can end up with this inconsistent state:
- `plugins.entries.whatsapp.enabled=false`
- `channels.whatsapp.enabled=true`
- routing bindings still target `whatsapp:*`

That causes cron delivery/runtime failures.

## Fast verification

```bash
node scripts/check-whatsapp-binding-drift.js /path/to/openclaw-config.json
```

Exit codes:
- `0` no drift detected
- `2` drift detected

## Safe remediation paths

### Path A: Keep WhatsApp disabled (recommended when Telegram is primary)
1. Remove `channels.whatsapp` block or set `channels.whatsapp.enabled=false`.
2. Remove all `routing.bindings` entries targeting `whatsapp`.
3. Migrate WhatsApp-targeted cron jobs to Telegram.
4. Re-run drift check script and then run affected cron once.

### Path B: Reactivate WhatsApp
1. Set `plugins.entries.whatsapp.enabled=true`.
2. Ensure channel account credentials/session are valid.
3. Keep/add required WhatsApp bindings.
4. Re-run affected cron and verify no delivery errors.

## Operational guard
Add this script to pre-restart checklist to prevent regression in mixed-channel configs.
