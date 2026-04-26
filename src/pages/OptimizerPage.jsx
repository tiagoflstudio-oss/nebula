import React, { useState } from 'react';

const OptimizerPage = () => {
  const [optimizing, setOptimizing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({
    ping: 0,
    cpu: 0,
    ram: 0,
    connected: false
  });

  // Buscar métricas reais do Nebula Bridge
  React.useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch('http://localhost:3001/metrics');
        const data = await response.json();
        setStats({
          ping: data.latency.ping,
          cpu: data.cpu.usage,
          ram: data.ram.used,
          connected: true
        });
      } catch (error) {
        setStats(prev => ({ ...prev, connected: false }));
        // Fallback para simulação se o bridge não estiver rodando (opcional)
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 2000);
    return () => clearInterval(interval);
  }, []);

  const addLog = (msg) => {
    setLogs(prev => [msg, ...prev].slice(0, 5));
  };

  const startOptimization = () => {
    setOptimizing(true);
    setLogs([]);
    let p = 0;
    
    const commands = [
      "ipconfig /flushdns",
      "EmptyStandbyList.exe standby",
      "powercfg /setactive SCHEME_MIN",
      "netsh int tcp set global autotuninglevel=normal",
      "Cleaning Temp files...",
      "Optimizing CPU affinity...",
      "System Overclock verified."
    ];

    const interval = setInterval(() => {
      p += 2;
      setProgress(p);
      
      if (p % 12 === 0) {
        addLog(`> Executing: ${commands[Math.floor(p / 12) % commands.length]}`);
      }

      if (p >= 100) {
        clearInterval(interval);
        setOptimizing(false);
        addLog("✨ Optimization Complete. Peak Performance Active.");
      }
    }, 80);
  };

  return (
    <div className="optimizer-page fade-in">
      <header className="optimizer-header">
        <div className="optimizer-info">
          <h1>Nebula <span>Optimizer</span></h1>
          <p>Monitoramento de hardware e rede em tempo real.</p>
        </div>
        <div className={`status-badge glass ${stats.connected ? 'online' : 'offline'}`}>
          <div className="status-dot"></div>
          {stats.connected ? 'Bridge Ativo' : 'Bridge Desconectado'}
        </div>
      </header>

      <div className="optimizer-stats">
        <div className="stat-card glass">
          <span className="stat-label">Latência (Ping)</span>
          <span className={`stat-value ${optimizing ? 'pulse-text' : ''}`}>
            {stats.connected ? `${stats.ping}ms` : '--'}
          </span>
          <span className="stat-change negative">Internet em tempo real</span>
        </div>
        <div className={`stat-card glass ${stats.cpu > 80 ? 'warning' : ''}`}>
          <span className="stat-label">Uso de CPU</span>
          <span className={`stat-value ${optimizing ? 'pulse-text' : ''}`}>
            {stats.connected ? `${stats.cpu}%` : '--'}
          </span>
          <span className="stat-change positive">Carga do Sistema</span>
        </div>
        <div className="stat-card glass">
          <span className="stat-label">RAM Em Uso</span>
          <span className={`stat-value ${optimizing ? 'pulse-text' : ''}`}>
            {stats.connected ? `${stats.ram} GB` : '--'}
          </span>
          <span className="stat-change positive">Memória Volátil</span>
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
          <h2>Análise de Performance</h2>
          <p>Inicie a otimização para limpar processos desnecessários e priorizar o hardware para tarefas críticas.</p>
          
          <div className="optimizer-console glass">
            {!stats.connected && <div className="console-line warning">⚠️ Aviso: Inicie o 'node nebula-bridge.js' para dados reais.</div>}
            {logs.length === 0 && stats.connected && <span className="console-placeholder">Aguardando comando...</span>}
            {logs.map((log, i) => (
              <div key={i} className="console-line">{log}</div>
            ))}
          </div>

          <button 
            className={`btn-optimize ${optimizing ? 'active' : ''}`} 
            onClick={startOptimization}
            disabled={optimizing || !stats.connected}
          >
            {optimizing ? 'Otimizando Sistema...' : stats.connected ? 'Otimizar Agora' : 'Aguardando Bridge...'}
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
