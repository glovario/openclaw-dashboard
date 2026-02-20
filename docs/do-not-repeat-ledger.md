# Do-Not-Repeat Ledger

## 2026-02-20 — WhatsApp channel/plugin drift (OC-142)

- **Failure pattern:** WhatsApp plugin disabled while stale channel/binding/cron assumptions still existed in automation logic.
- **Impact:** delivery/runtime noise on scheduled jobs and repeated remediation churn.
- **Guardrails added:**
  1. Before enabling any channel-targeted cron, verify corresponding plugin + channel account are enabled in gateway config.
  2. During heartbeat/self-improvement runs, execute a config drift check for `plugins.entries.*` vs `channels.*` + active bindings.
  3. If plugin is disabled, enforce migration of jobs to an enabled channel (Telegram) before closing task.
- **Verification step:** `cron.list` must show no jobs targeting disabled channels before marking drift-remediation tasks complete.
- **Owner:** Atlas (ops), with Ada review for policy-level channel defaults.
