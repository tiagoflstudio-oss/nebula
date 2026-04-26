const express = require('express');
const si = require('systeminformation');
const cors = require('cors');
const app = express();
const port = 3001;

app.use(cors());

app.get('/metrics', async (req, res) => {
  try {
    const cpuLoad = await si.currentLoad();
    const mem = await si.mem();
    const network = await si.inetLatency('8.8.8.8');

    res.json({
      cpu: {
        usage: Math.round(cpuLoad.currentLoad),
        model: cpuLoad.cpus[0].model
      },
      ram: {
        used: (mem.active / (1024 * 1024 * 1024)).toFixed(2),
        total: (mem.total / (1024 * 1024 * 1024)).toFixed(2),
        percent: Math.round((mem.active / mem.total) * 100)
      },
      latency: {
        ping: Math.round(network)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao ler métricas do sistema' });
  }
});

app.listen(port, () => {
  console.log(`🚀 Nebula Bridge rodando em http://localhost:${port}`);
  console.log(`📊 Coletando dados reais do Windows (CPU, RAM, Latência)...`);
});
