import React, { useState, useEffect } from 'react';
import './CronManagerPage.css';

const CronManagerPage = ({ config }) => {
  const [tasks, setTasks] = useState([
    { id: 1, name: 'Backup Diário Supabase', schedule: '0 0 * * *', lastRun: 'Hoje, 00:00', status: 'success', nextRun: 'Amanhã, 00:00', type: 'backup' },
    { id: 2, name: 'Sincronizar Modelos Claude', schedule: '*/30 * * * *', lastRun: 'Há 12 min', status: 'running', nextRun: 'Em 18 min', type: 'sync' },
    { id: 3, name: 'Limpeza de Cache Nebula', schedule: '0 12 * * 0', lastRun: 'Domingo, 12:00', status: 'idle', nextRun: 'Próximo Domingo', type: 'maintenance' }
  ]);

  const [isAdding, setIsAdding] = useState(false);
  const [newTask, setNewTask] = useState({ name: '', schedule: '', type: 'automation' });

  const handleAddTask = () => {
    if (!newTask.name || !newTask.schedule) return;
    const task = {
      id: Date.now(),
      ...newTask,
      lastRun: 'Nunca',
      status: 'idle',
      nextRun: 'Calculando...'
    };
    setTasks([task, ...tasks]);
    setNewTask({ name: '', schedule: '', type: 'automation' });
    setIsAdding(false);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return '✅';
      case 'running': return '⏳';
      case 'error': return '❌';
      default: return '⚪';
    }
  };

  return (
    <div className="cron-page fade-in">
      <header className="cron-header">
        <div className="header-info">
          <h1>PicoClaw Automations</h1>
          <p>Agendamento e execução de tarefas recorrentes via motor PicoClaw.</p>
        </div>
        <button className="btn-add-cron glass" onClick={() => setIsAdding(true)}>
          <span>+</span> Agendar Nova Tarefa
        </button>
      </header>

      <div className="cron-stats-row">
        <div className="cron-mini-card glass">
          <span className="label">Total de Tarefas</span>
          <span className="value">{tasks.length}</span>
        </div>
        <div className="cron-mini-card glass">
          <span className="label">Em Execução</span>
          <span className="value">1</span>
        </div>
        <div className="cron-mini-card glass">
          <span className="label">Uptime do Motor</span>
          <span className="value">99.9%</span>
        </div>
      </div>

      <div className="cron-table-container glass">
        <table className="cron-table">
          <thead>
            <tr>
              <th>Status</th>
              <th>Nome da Tarefa</th>
              <th>Expressão Cron</th>
              <th>Última Execução</th>
              <th>Próxima Execução</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map(task => (
              <tr key={task.id} className="cron-row">
                <td><span className={`status-dot ${task.status}`}>{getStatusIcon(task.status)}</span></td>
                <td className="task-name">
                  <strong>{task.name}</strong>
                  <span className="task-type">{task.type}</span>
                </td>
                <td className="task-schedule"><code>{task.schedule}</code></td>
                <td>{task.lastRun}</td>
                <td>{task.nextRun}</td>
                <td className="task-actions">
                  <button className="action-icon" title="Executar Agora">🚀</button>
                  <button className="action-icon" title="Editar">✏️</button>
                  <button className="action-icon danger" onClick={() => setTasks(tasks.filter(t => t.id !== task.id))}>🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isAdding && (
        <div className="cron-modal-overlay">
          <div className="cron-modal glass">
            <h2>Novo Agendamento</h2>
            <div className="form-group">
              <label>Nome da Tarefa</label>
              <input 
                type="text" 
                className="glass-input" 
                placeholder="Ex: Backup do Sistema"
                value={newTask.name}
                onChange={(e) => setNewTask({...newTask, name: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label>Expressão Cron</label>
              <input 
                type="text" 
                className="glass-input" 
                placeholder="Ex: 0 0 * * *"
                value={newTask.schedule}
                onChange={(e) => setNewTask({...newTask, schedule: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label>Tipo de Automação</label>
              <select 
                className="glass-input"
                value={newTask.type}
                onChange={(e) => setNewTask({...newTask, type: e.target.value})}
              >
                <option value="automation">Automação Geral</option>
                <option value="backup">Backup</option>
                <option value="sync">Sincronização</option>
                <option value="maintenance">Manutenção</option>
              </select>
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setIsAdding(false)}>Cancelar</button>
              <button className="btn-save-cron" onClick={handleAddTask}>Salvar Automação</button>
            </div>
          </div>
        </div>
      )}

      <footer className="cron-footer glass">
        <div className="pico-connection">
          <span className="pulse-dot"></span>
          Conectado ao PicoClaw Engine (Porta 18800)
        </div>
        <div className="pico-info">
          Motor v0.2.4 | RAM: 12MB
        </div>
      </footer>
    </div>
  );
};

export default CronManagerPage;
