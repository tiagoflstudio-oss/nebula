import React, { useState } from 'react';

const OptimizerPage = () => {
  const [optimizing, setOptimizing] = useState(false);
  const [progress, setProgress] = useState(0);

  const startOptimization = () => {
    setOptimizing(true);
    let p = 0;
    const interval = setInterval(() => {
      p += 5;
      setProgress(p);
      if (p >= 100) {
        clearInterval(interval);
        setOptimizing(false);
        alert('Otimização concluída com sucesso! Ganho estimado: +25% de FPS.');
      }
    }, 150);
  };

  return (
    <div className="optimizer-page fade-in">
      <header className="optimizer-header">
        <div className="optimizer-info">
          <h1>Nebula <span>Optimizer</span></h1>
          <p>Otimização de performance guiada por IA para gamers e profissionais.</p>
        </div>
        <div className="status-badge glass">
          <div className="status-dot"></div>
          Sistema Pronto
        </div>
      </header>

      <div className="optimizer-stats">
        <div className="stat-card glass">
          <span className="stat-label">Latência (Ping)</span>
          <span className="stat-value pulse-text">-45ms</span>
          <span className="stat-change negative">Melhoria detectada</span>
        </div>
        <div className="stat-card glass">
          <span className="stat-label">Ganho de FPS</span>
          <span className="stat-value">+32%</span>
          <span className="stat-change positive">Modo Gamer Ativo</span>
        </div>
        <div className="stat-card glass">
          <span className="stat-label">RAM Liberada</span>
          <span className="stat-value">2.4 GB</span>
          <span className="stat-change positive">Otimização de Fundo</span>
        </div>
      </div>

      <div className="optimizer-main glass">
        <div className="optimizer-visual">
          <div className={`optimizer-core ${optimizing ? 'rotating' : ''}`}>
            <svg viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="280" />
              <path d="M50 20v10M50 70v10M20 50h10M70 50h10" stroke="currentColor" strokeWidth="2" />
            </svg>
            <div className="core-inner">
              {optimizing ? `${progress}%` : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>}
            </div>
          </div>
        </div>

        <div className="optimizer-actions">
          <h2>Pronto para decolar?</h2>
          <p>O Nebula analisará processos em segundo plano, serviços do Windows e latência de rede para maximizar sua performance.</p>
          <button 
            className={`btn-optimize ${optimizing ? 'active' : ''}`} 
            onClick={startOptimization}
            disabled={optimizing}
          >
            {optimizing ? 'Otimizando Sistema...' : 'Otimizar Agora'}
          </button>
        </div>
      </div>

      <div className="optimizer-features">
        <div className="feature-card glass">
          <h4>Limpeza de Cache</h4>
          <p>Remove arquivos temporários e logs que atrasam o sistema.</p>
        </div>
        <div className="feature-card glass">
          <h4>Network Boost</h4>
          <p>Otimiza rotas de rede para diminuir o jitter em jogos online.</p>
        </div>
        <div className="feature-card glass">
          <h4>Prioridade de CPU</h4>
          <p>Aloca mais recursos para o aplicativo em foco.</p>
        </div>
      </div>
    </div>
  );
};

export default OptimizerPage;
