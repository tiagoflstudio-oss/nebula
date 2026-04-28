import express from 'express';
import cors from 'cors';
import si from 'systeminformation';
import os from 'os';

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

let metrics = {
  cpu: { usage: 0, cores: os.cpus().length, speed: 0, model: os.cpus()[0].model },
  ram: { used: 0, total: 0, free: 0 },
  latency: { ping: 0 }
};

// Função para calcular uso de CPU via módulo 'os' (mais estável)
function getCPUUsage() {
  const cpus = os.cpus();
  let user = 0, nice = 0, sys = 0, idle = 0, irq = 0;
  for (let cpu of cpus) {
    user += cpu.times.user;
    nice += cpu.times.nice;
    sys += cpu.times.sys;
    idle += cpu.times.idle;
    irq += cpu.times.irq;
  }
  const total = user + nice + sys + idle + irq;
  return { idle, total };
}

let startStats = getCPUUsage();

async function updateMetrics() {
  try {
    // Cálculo de CPU
    const endStats = getCPUUsage();
    const idleDiff = endStats.idle - startStats.idle;
    const totalDiff = endStats.total - startStats.total;
    const usage = 100 - Math.floor(100 * idleDiff / totalDiff);
    startStats = endStats;

    // RAM via 'os' (Bytes para GB)
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    // Detalhes via 'si'
    const cpuSpeed = await si.cpuCurrentSpeed();
    const ping = await si.inetLatency('8.8.8.8');

    metrics = {
      cpu: {
        usage: usage || 0,
        cores: os.cpus().length,
        speed: cpuSpeed.avg || (os.cpus()[0].speed / 1000),
        model: os.cpus()[0].model
      },
      ram: {
        total: Math.round(totalMem / (1024 ** 3) * 100) / 100,
        used: Math.round(usedMem / (1024 ** 3) * 100) / 100,
        free: Math.round(freeMem / (1024 ** 3) * 100) / 100
      },
      latency: {
        ping: ping || 0
      }
    };
  } catch (err) {
    console.error("Erro no Bridge:", err);
  }
}

setInterval(updateMetrics, 1000);
updateMetrics();

app.get('/metrics', (req, res) => {
  res.json(metrics);
});

// Proxy Local para Antigravity
app.post('/api/antigravity', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Header de Authorization ausente' });

    const { action, projectId } = req.body;
    const ANTIGRAVITY_CONFIG = {
      quotaApiUrl: "https://cloudcode-pa.googleapis.com/v1internal:fetchAvailableModels",
      loadProjectApiUrl: "https://cloudcode-pa.googleapis.com/v1internal:loadCodeAssist",
      userAgent: "antigravity/0.0.1",
    };

    if (action === 'loadProject') {
      const response = await fetch(ANTIGRAVITY_CONFIG.loadProjectApiUrl, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
          'User-Agent': ANTIGRAVITY_CONFIG.userAgent
        },
        body: JSON.stringify({ mode: 1 })
      });
      const data = await response.json();
      return res.status(response.status).json(data);
    }

    if (action === 'fetchQuota') {
      const cleanProjectId = projectId?.replace('projects/', '');
      const response = await fetch(ANTIGRAVITY_CONFIG.quotaApiUrl, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
          'User-Agent': ANTIGRAVITY_CONFIG.userAgent,
          'X-Goog-Api-Client': 'gl-js/ auth/2.0.0 grpc/1.53.0',
          'x-goog-user-project': cleanProjectId || ''
        },
        body: JSON.stringify({})
      });
      const data = await response.json();
      return res.status(response.status).json(data);
    }

    return res.status(400).json({ error: 'Ação inválida' });
  } catch (error) {
    console.error('API Proxy Error:', error);
    return res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`\x1b[35m[Nebula Bridge]\x1b[0m Rodando em http://localhost:${port}`);
  console.log(`\x1b[32mMonitorando via Native OS + SystemInfo.\x1b[0m`);
});
