import express from 'express';
import cors from 'cors';
import si from 'systeminformation';

const app = express();
const port = 3001;

app.use(cors());

// Cache de métricas para performance
let metrics = {
  cpu: { usage: 0, cores: 0, speed: 0, model: '' },
  ram: { used: 0, total: 0, free: 0 },
  latency: { ping: 0 }
};

// Loop de atualização (Frequência de 500ms para maior precisão)
async function updateMetrics() {
  try {
    const cpuLoad = await si.currentLoad();
    const cpuInfo = await si.cpu();
    const cpuSpeed = await si.cpuCurrentSpeed();
    const mem = await si.mem();
    const ping = await si.inetLatency('8.8.8.8');

    const freeMem = mem.available || mem.free;

    metrics = {
      cpu: {
        usage: Math.round(cpuLoad.currentLoad),
        cores: cpuInfo.cores,
        speed: cpuSpeed.avg, // Velocidade média entre os cores
        model: `${cpuInfo.manufacturer} ${cpuInfo.brand}`
      },
      ram: {
        total: Math.round(mem.total / (1024 * 1024 * 1024) * 100) / 100,
        used: Math.round((mem.total - freeMem) / (1024 * 1024 * 1024) * 100) / 100,
        free: Math.round(freeMem / (1024 * 1024 * 1024) * 100) / 100
      },
      latency: {
        ping: ping || 0
      }
    };
  } catch (err) {
    console.error("Erro ao coletar métricas:", err);
  }
}

// Inicia o monitoramento (500ms para capturar oscilações rápidas)
setInterval(updateMetrics, 500);
updateMetrics();

app.get('/metrics', (req, res) => {
  res.json(metrics);
});

app.listen(port, () => {
  console.log(`\x1b[35m[Nebula Bridge]\x1b[0m Ativo em http://localhost:${port}`);
  console.log(`\x1b[32mSincronizado com Gerenciador de Tarefas do Windows.\x1b[0m`);
});
