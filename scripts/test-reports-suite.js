#!/usr/bin/env node
const { spawn } = require('node:child_process');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const steps = [
  { label: 'contract', cmd: [process.execPath, ['scripts/test-reports-contract.js']] },
  { label: 'reconciliation', cmd: [process.execPath, ['scripts/test-reports-reconciliation.js']] },
];

function runStep(step) {
  return new Promise((resolve, reject) => {
    const child = spawn(step.cmd[0], step.cmd[1], {
      cwd: repoRoot,
      env: process.env,
      stdio: 'inherit',
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) return resolve();
      reject(new Error(`${step.label} failed with code ${code}`));
    });
  });
}

(async function main() {
  for (const step of steps) {
    console.log(`\n▶ running ${step.label} reports test`);
    await runStep(step);
  }
  console.log('\n✅ reports suite passed (contract + reconciliation)');
})().catch((err) => {
  console.error('\n❌ reports suite failed');
  console.error(err.stack || err.message || err);
  process.exit(1);
});
