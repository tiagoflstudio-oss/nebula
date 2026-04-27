import React, { useState } from 'react';
import './AuditHubPage.css';

const AuditHubPage = () => {
  const [logs, setLogs] = useState([
    { id: 1, time: '18:42:05', event: 'Análise de Intenção', details: 'Verificação de segurança para comando de sistema.', status: 'safe', score: 98 },
    { id: 2, time: '18:43:12', event: 'Filtro de Dados Sensíveis', details: 'Remoção de padrões de chaves de API na saída.', status: 'safe', score: 100 },
    { id: 3, time: '18:45:30', event: 'Verificação Técnica', details: 'Auditoria de sintaxe Go no componente sugerido.', status: 'warning', score: 75 },
    { id: 4, time: '19:10:22', event: 'Protocolo Steering', details: 'Interrupção de loop infinito detectada no sub-agente.', status: 'fixed', score: 92 },
    { id: 5, time: '19:15:45', event: 'Validação de RLS', details: 'Confirmando isolamento de tenant na query Supabase.', status: 'safe', score: 99 }
  ]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'safe': return '#4ade80';
      case 'warning': return '#fbbf24';
      case 'fixed': return '#60a5fa';
      default: return '#94a3b8';
    }
  };

  return (
    <div className="audit-hub fade-in">
      <header className="audit-header">
        <div className="header-main">
          <div className="audit-badge">SECURED BY PICOCLAW</div>
          <h1>Audit Hub</h1>
          <p>Monitoramento de integridade, segurança e precisão técnica em tempo real.</p>
        </div>
        <div className="security-score glass">
          <span className="score-label">Global Trust Score</span>
          <span className="score-value">96%</span>
        </div>
      </header>

      <div className="audit-overview">
        <div className="overview-card glass">
          <span className="card-icon">🛡️</span>
          <div className="card-data">
            <h3>Filtros Ativos</h3>
            <p>12 Camadas de Proteção</p>
          </div>
        </div>
        <div className="overview-card glass">
          <span className="card-icon">🔍</span>
          <div className="card-data">
            <h3>Eventos Auditados</h3>
            <p>1,240 nas últimas 24h</p>
          </div>
        </div>
        <div className="overview-card glass">
          <span className="card-icon">⚡</span>
          <div className="card-data">
            <h3>Latência de Auditoria</h3>
            <p>&lt; 15ms por evento</p>
          </div>
        </div>
      </div>

      <div className="logs-section glass">
        <div className="logs-header">
          <h2>Logs de Supervisão</h2>
          <div className="log-filters">
            <button className="filter-btn active">Todos</button>
            <button className="filter-btn">Segurança</button>
            <button className="filter-btn">Técnico</button>
          </div>
        </div>
        
        <div className="logs-container">
          <div className="log-table-header">
            <span>Horário</span>
            <span>Evento</span>
            <span>Detalhes da Auditoria</span>
            <span>Status</span>
            <span>Confiança</span>
          </div>
          {logs.map(log => (
            <div key={log.id} className="log-entry-row">
              <span className="log-time">{log.time}</span>
              <span className="log-event">{log.event}</span>
              <span className="log-details">{log.details}</span>
              <span className="log-status" style={{ color: getStatusColor(log.status) }}>
                {log.status.toUpperCase()}
              </span>
              <span className="log-score">
                <div className="score-bar-bg">
                  <div className="score-bar-fill" style={{ width: `${log.score}%`, backgroundColor: getStatusColor(log.status) }}></div>
                </div>
                {log.score}%
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="steering-console-wrapper">
        <div className="console-header">
          <span>Steering Control Center</span>
          <div className="status-indicator">Ativo e Escutando...</div>
        </div>
        <div className="console-body">
          <div className="terminal-entry">
            <span className="t-prefix">[SYS]</span> Aguardando sinal do Supervisor PicoClaw...
          </div>
          <div className="terminal-entry">
            <span className="t-prefix">[AUDIT]</span> Auditoria de Prompt iniciada às {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditHubPage;
