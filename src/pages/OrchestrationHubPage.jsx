import React, { useState, useEffect } from 'react';
import './OrchestrationHubPage.css';

const OrchestrationHubPage = () => {
  const [agents, setAgents] = useState([
    { id: 1, name: 'Research-Bot', task: 'Pesquisando tendências de UI', progress: 100, status: 'completed', role: 'Pesquisador' },
    { id: 2, name: 'Logic-Engine', task: 'Implementando componentes React', progress: 65, status: 'active', role: 'Engenheiro' },
    { id: 3, name: 'Doc-Writer', task: 'Gerando documentação técnica', progress: 30, status: 'active', role: 'Escritor' },
    { id: 4, name: 'QA-Validator', task: 'Aguardando código para teste', progress: 0, status: 'idle', role: 'Tester' }
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setAgents(prev => prev.map(agent => {
        if (agent.status === 'active' && agent.progress < 100) {
          const nextProgress = agent.progress + Math.floor(Math.random() * 5);
          return { 
            ...agent, 
            progress: nextProgress > 100 ? 100 : nextProgress,
            status: nextProgress >= 100 ? 'completed' : 'active'
          };
        }
        return agent;
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="orch-page fade-in">
      <header className="orch-header">
        <div className="header-info">
          <div className="orch-badge">SWARM INTELLIGENCE</div>
          <h1>Orchestration Hub</h1>
          <p>Coordenação de sub-agentes PicoClaw em execução paralela.</p>
        </div>
        <div className="swarm-status glass">
          <span className="pulse-dot-blue"></span>
          Orquestrador Online
        </div>
      </header>

      <div className="agents-grid">
        {agents.map(agent => (
          <div key={agent.id} className={`agent-card glass ${agent.status}`}>
            <div className="agent-header">
              <div className="agent-identity">
                <span className="agent-role">{agent.role}</span>
                <h3>{agent.name}</h3>
              </div>
              <span className={`status-tag ${agent.status}`}>{agent.status}</span>
            </div>
            
            <div className="agent-task">
              <label>Tarefa Atual</label>
              <p>{agent.task}</p>
            </div>

            <div className="progress-container">
              <div className="progress-info">
                <span>Progresso</span>
                <span>{agent.progress}%</span>
              </div>
              <div className="progress-bar-bg">
                <div 
                  className="progress-bar-fill" 
                  style={{ width: `${agent.progress}%` }}
                ></div>
              </div>
            </div>

            <div className="agent-actions">
              <button className="btn-view-logs">Ver Logs</button>
              {agent.status === 'active' && <button className="btn-stop">Interromper</button>}
            </div>
          </div>
        ))}
      </div>

      <div className="orch-command-center glass">
        <h2>Spawn de Novos Agentes</h2>
        <div className="spawn-controls">
          <input type="text" className="glass-input" placeholder="Descreva a macro-tarefa..." />
          <button className="btn-spawn">Iniciar Enxame (Swarm) 🧠</button>
        </div>
        <p className="spawn-hint">O PicoClaw dividirá automaticamente a tarefa entre especialistas.</p>
      </div>

      <footer className="orch-footer">
        <div className="fleet-metrics">
          <span>Frota Ativa: 4 Agentes</span>
          <span>Eficiência: 92%</span>
          <span>Coordenação: SubTurn Protocol</span>
        </div>
      </footer>
    </div>
  );
};

export default OrchestrationHubPage;
