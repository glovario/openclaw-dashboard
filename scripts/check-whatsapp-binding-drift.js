#!/usr/bin/env node

/**
 * Detects config drift between WhatsApp plugin enablement and routing/channel bindings.
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

// Legacy/OpenClaw variants seen in the wild:
// - routing.bindings[].to = "whatsapp:*"
// - bindings[].match.channel = "whatsapp"
const routingBindings = Array.isArray(cfg?.routing?.bindings) ? cfg.routing.bindings : [];
const topLevelBindings = Array.isArray(cfg?.bindings) ? cfg.bindings : [];

const legacyWhatsappBindings = routingBindings.filter((b) => {
  const to = String(b?.to || '').toLowerCase();
  return to.startsWith('whatsapp:') || to === 'whatsapp';
});

const matchChannelWhatsappBindings = topLevelBindings.filter((b) => {
  const channel = String(b?.match?.channel || '').toLowerCase();
  return channel === 'whatsapp';
});

const whatsappBindingCount = legacyWhatsappBindings.length + matchChannelWhatsappBindings.length;

const drift = [];
if (!pluginEnabled && channelEnabled) {
  drift.push('channels.whatsapp.enabled=true while plugins.entries.whatsapp.enabled=false');
}
if (!pluginEnabled && whatsappBindingCount > 0) {
  drift.push(`found ${whatsappBindingCount} WhatsApp binding(s) while plugin is disabled`);
}

const summary = {
  pluginEnabled,
  channelEnabled,
  whatsappBindingCount,
  legacyWhatsappBindings: legacyWhatsappBindings.length,
  topLevelWhatsappBindings: matchChannelWhatsappBindings.length,
  drift,
};

if (drift.length === 0) {
  console.log(JSON.stringify({ ok: true, summary }, null, 2));
  process.exit(0);
}

console.log(JSON.stringify({ ok: false, summary }, null, 2));
process.exit(2);
