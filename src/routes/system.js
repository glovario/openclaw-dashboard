const express = require('express');
const os = require('os');
const { exec } = require('child_process');
const http = require('http');

const router = express.Router();

function getCpuUsage() {
  return new Promise((resolve) => {
    const cpus1 = os.cpus();
    setTimeout(() => {
      const cpus2 = os.cpus();
      let idleDiff = 0, totalDiff = 0;
      for (let i = 0; i < cpus1.length; i++) {
        const t1 = Object.values(cpus1[i].times).reduce((a, b) => a + b, 0);
        const t2 = Object.values(cpus2[i].times).reduce((a, b) => a + b, 0);
        idleDiff += cpus2[i].times.idle - cpus1[i].times.idle;
        totalDiff += t2 - t1;
      }
      const usage = totalDiff === 0 ? 0 : Math.round((1 - idleDiff / totalDiff) * 100);
      resolve(usage);
    }, 500);
  });
}

function getDiskUsage() {
  return new Promise((resolve) => {
    exec("df -BG / | awk 'NR==2 {print $2,$3,$5}'", (err, stdout) => {
      if (err) return resolve(null);
      const parts = stdout.trim().split(' ');
      const total = parseInt(parts[0]);
      const used = parseInt(parts[1]);
      const pct = parseInt(parts[2]);
      resolve({ total, used, pct });
    });
  });
}

function pingService(url) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: 2000 }, (res) => {
      resolve({ up: true, status: res.statusCode });
      res.resume();
    });
    req.on('error', () => resolve({ up: false }));
    req.on('timeout', () => { req.destroy(); resolve({ up: false }); });
  });
}

router.get('/health', async (req, res) => {
  try {
    const [cpuPct, disk, gateway, dashboard] = await Promise.all([
      getCpuUsage(),
      getDiskUsage(),
      pingService('http://localhost:18789'),
      pingService('http://localhost:3420/api/health'),
    ]);

    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memPct = Math.round((usedMem / totalMem) * 100);

    const uptimeSecs = os.uptime();

    res.json({
      ok: true,
      ts: new Date().toISOString(),
      cpu: { pct: cpuPct },
      memory: {
        totalGb: Math.round(totalMem / 1073741824 * 10) / 10,
        usedGb: Math.round(usedMem / 1073741824 * 10) / 10,
        pct: memPct,
      },
      disk: disk || { total: 0, used: 0, pct: 0 },
      uptime: uptimeSecs,
      services: {
        gateway: gateway,
        dashboard: dashboard,
      },
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
