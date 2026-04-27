const express = require('express');
const si = require('systeminformation');
const cors = require('cors');
const { exec } = require('child_process');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3001;
const BRIDGE_KEY = 'nebula-secret-key-2024'; // Chave de segurança simples

app.use(cors());
app.use(express.json());

// Middleware de segurança
const authMiddleware = (req, res, next) => {
  const key = req.headers['x-bridge-key'];
  if (key !== BRIDGE_KEY) {
    return res.status(401).json({ error: 'Não autorizado. Bridge Key inválida.' });
  }
  next();
};

// Armazenamento em memória para tarefas Cron
let scheduledTasks = {};
let auditLogs = [];

const addLog = (message, type = 'info') => {
  const entry = {
    id: Date.now(),
    timestamp: new Date().toISOString(),
    message,
    type
  };
  auditLogs.unshift(entry);
  if (auditLogs.length > 50) auditLogs.pop();
  console.log(`[${type.toUpperCase()}] ${message}`);
};

// --- ENDPOINTS ---

// 1. Métricas do Sistema
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
    res.status(500).json({ error: 'Erro ao ler métricas' });
  }
});

// 2. Execução de Comandos (Terminal)
app.post('/exec', authMiddleware, (req, res) => {
  const { command } = req.body;
  if (!command) return res.status(400).json({ error: 'Comando não fornecido' });

  addLog(`Executando comando: ${command}`, 'security');
  
  exec(command, (error, stdout, stderr) => {
    res.json({
      success: !error,
      stdout,
      stderr,
      error: error ? error.message : null
    });
  });
});

// 3. Gestão de Cron
app.get('/cron', authMiddleware, (req, res) => {
  const tasks = Object.keys(scheduledTasks).map(id => ({
    id,
    schedule: scheduledTasks[id].schedule,
    name: scheduledTasks[id].name
  }));
  res.json(tasks);
});

app.post('/cron', authMiddleware, (req, res) => {
  const { id, name, schedule, command } = req.body;
  
  if (scheduledTasks[id]) {
    scheduledTasks[id].task.stop();
  }

  try {
    const task = cron.schedule(schedule, () => {
      addLog(`[Cron] Executando tarefa: ${name}`, 'info');
      exec(command, (err) => {
        if (err) addLog(`[Cron Erro] ${name}: ${err.message}`, 'error');
      });
    });

    scheduledTasks[id] = { id, name, schedule, command, task };
    addLog(`Tarefa Cron agendada: ${name} (${schedule})`, 'info');
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: 'Formato de cron inválido' });
  }
});

app.delete('/cron/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  if (scheduledTasks[id]) {
    scheduledTasks[id].task.stop();
    delete scheduledTasks[id];
    addLog(`Tarefa Cron removida: ${id}`, 'info');
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Tarefa não encontrada' });
  }
});

// 4. Audit Logs
app.get('/audit', authMiddleware, (req, res) => {
  res.json(auditLogs);
});

app.listen(port, () => {
  console.log(`\n🚀 NEBULA BRIDGE V2 - OPERACIONAL`);
  console.log(`-----------------------------------`);
  console.log(`URL: http://localhost:${port}`);
  console.log(`Status: Aguardando conexões do Nebula AI`);
  console.log(`Segurança: Ativada (X-Bridge-Key necessária)`);
  addLog('Sistema Bridge iniciado com sucesso.');
});
