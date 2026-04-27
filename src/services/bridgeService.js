const BRIDGE_URL = 'http://localhost:3001';
const BRIDGE_KEY = 'nebula-secret-key-2024';

const headers = {
  'Content-Type': 'application/json',
  'X-Bridge-Key': BRIDGE_KEY
};

export const bridgeService = {
  async getMetrics() {
    const res = await fetch(`${BRIDGE_URL}/metrics`);
    if (!res.ok) throw new Error('Falha ao obter métricas');
    return res.json();
  },

  async executeCommand(command) {
    const res = await fetch(`${BRIDGE_URL}/exec`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ command })
    });
    return res.json();
  },

  async getCronTasks() {
    const res = await fetch(`${BRIDGE_URL}/cron`, { headers });
    return res.json();
  },

  async addCronTask(task) {
    const res = await fetch(`${BRIDGE_URL}/cron`, {
      method: 'POST',
      headers,
      body: JSON.stringify(task)
    });
    return res.json();
  },

  async deleteCronTask(id) {
    const res = await fetch(`${BRIDGE_URL}/cron/${id}`, {
      method: 'DELETE',
      headers
    });
    return res.json();
  },

  async getAuditLogs() {
    const res = await fetch(`${BRIDGE_URL}/audit`, { headers });
    return res.json();
  }
};
