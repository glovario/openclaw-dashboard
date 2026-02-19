#!/usr/bin/env node

/**
 * Detects config drift between WhatsApp plugin enablement and channel bindings.
 * Usage:
 *   node scripts/check-whatsapp-binding-drift.js <config.json>
 */

const fs = require('fs');

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/check-whatsapp-binding-drift.js <config.json>');
  process.exit(1);
}

const raw = fs.readFileSync(file, 'utf8');
const cfg = JSON.parse(raw);

const pluginEnabled = Boolean(cfg?.plugins?.entries?.whatsapp?.enabled);
const channelEnabled = Boolean(cfg?.channels?.whatsapp?.enabled);
const bindings = Array.isArray(cfg?.routing?.bindings) ? cfg.routing.bindings : [];

const whatsappBindings = bindings.filter((b) => {
  const to = String(b?.to || '').toLowerCase();
  return to.startsWith('whatsapp:') || to === 'whatsapp';
});

const drift = [];
if (!pluginEnabled && channelEnabled) {
  drift.push('channels.whatsapp.enabled=true while plugins.entries.whatsapp.enabled=false');
}
if (!pluginEnabled && whatsappBindings.length > 0) {
  drift.push(`routing has ${whatsappBindings.length} WhatsApp binding(s) while plugin is disabled`);
}

const summary = {
  pluginEnabled,
  channelEnabled,
  whatsappBindingCount: whatsappBindings.length,
  drift,
};

if (drift.length === 0) {
  console.log(JSON.stringify({ ok: true, summary }, null, 2));
  process.exit(0);
}

console.log(JSON.stringify({ ok: false, summary }, null, 2));
process.exit(2);
