#!/usr/bin/env node
const fs = require('node:fs');

const configPath = process.argv[2] || '/home/matt/.openclaw/openclaw.json';

function isTruthyEnabled(v) {
  return !!(v && v.enabled === true);
}

function main() {
  const raw = fs.readFileSync(configPath, 'utf8');
  const cfg = JSON.parse(raw);

  const pluginEntries = cfg?.plugins?.entries || {};
  const channels = cfg?.channels || {};
  const bindings = Array.isArray(cfg?.bindings) ? cfg.bindings : [];

  const checks = ['telegram', 'whatsapp'];
  const findings = [];

  for (const key of checks) {
    const pluginEnabled = isTruthyEnabled(pluginEntries[key]);
    const channelEnabled = isTruthyEnabled(channels[key]);
    const bound = bindings.some((b) => (b?.match?.channel || '').toLowerCase() === key);

    if (!pluginEnabled && (channelEnabled || bound)) {
      findings.push({
        channel: key,
        severity: 'error',
        message: `plugin '${key}' disabled while channel/binding still active`,
        pluginEnabled,
        channelEnabled,
        bound,
      });
    } else if (pluginEnabled && !channelEnabled && !bound) {
      findings.push({
        channel: key,
        severity: 'warn',
        message: `plugin '${key}' enabled but no channel config/binding present`,
        pluginEnabled,
        channelEnabled,
        bound,
      });
    }
  }

  const payload = {
    ok: findings.length === 0,
    configPath,
    findings,
  };

  console.log(JSON.stringify(payload, null, 2));
  process.exit(payload.ok ? 0 : 2);
}

main();
