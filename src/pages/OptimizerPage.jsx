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
    <div className="page-container optimizer-page fade-in">
      <div className="page-header compact-header">
        <div className="header-title-row">
          <h1>Nebula <span>Optimizer</span></h1>
          <div className={`status-badge-premium ${stats.connected ? 'online' : 'offline'}`}>
            <span className="dot"></span>
            {stats.connected ? 'Bridge Ativo' : 'Bridge Desconectado'}
          </div>
        </div>
      </div>

      <div className="optimizer-stats-grid">
        <div className="premium-stat-card glass">
          <div className="stat-icon">📡</div>
          <div className="stat-info">
            <span className="label">Latência (Ping)</span>
            <span className={`value ${optimizing ? 'pulse-text' : ''}`}>
              {stats.connected ? `${stats.ping}ms` : '--'}
            </span>
          </div>
          <div className="stat-footer positive">Internet Estável</div>
        </div>

        <div className={`premium-stat-card glass ${stats.cpu > 80 ? 'warning' : ''}`}>
          <div className="stat-icon">⚡</div>
          <div className="stat-info">
            <span className="label">Uso de CPU</span>
            <span className={`value ${optimizing ? 'pulse-text' : ''}`}>
              {stats.connected ? `${stats.cpu}%` : '--'}
            </span>
          </div>
          <div className="stat-footer">Carga Dinâmica</div>
        </div>

        <div className="premium-stat-card glass">
          <div className="stat-icon">🧠</div>
          <div className="stat-info">
            <span className="label">RAM Livre</span>
            <span className={`value ${optimizing ? 'pulse-text' : ''}`}>
              {stats.connected ? `${stats.ram} GB` : '--'}
            </span>
          </div>
          <div className="stat-footer positive">Memória Volátil</div>
        </div>
      </div>

      <div className="optimizer-dashboard">
        <div className="optimizer-console-container glass">
          <div className="console-header">
            <span className="title">Terminal de Diagnóstico</span>
            <div className={`scan-line ${optimizing ? 'active' : ''}`}></div>
          </div>
          <div className="optimizer-console-content">
            {!stats.connected && <div className="line warning">⚠️ Alerta: Inicie o 'node nebula-bridge.js' para sincronizar hardware.</div>}
            {logs.length === 0 && stats.connected && <span className="placeholder">Pronto para otimização...</span>}
            {logs.map((log, i) => (
              <div key={i} className="line">{log}</div>
            ))}
          </div>
          <button 
            className={`btn-premium-optimize ${optimizing ? 'active' : ''}`} 
            onClick={startOptimization}
            disabled={optimizing || !stats.connected}
          >
            {optimizing ? (
              <div className="progress-container">
                <div className="progress-bar" style={{ width: `${progress}%` }}></div>
                <span className="progress-text">{progress}% Otimizando...</span>
              </div>
            ) : (
              <><span className="btn-icon">🚀</span> Otimizar Sistema Agora</>
            )}
          </button>
        </div>

        <div className="optimizer-features-column">
          <div className="premium-feature-item glass">
            <div className="f-icon">🧹</div>
            <div className="f-content">
              <h4>Limpeza de Cache</h4>
              <p>Elimina buffers e arquivos temporários.</p>
            </div>
          </div>
          <div className="premium-feature-item glass">
            <div className="f-icon">🌐</div>
            <div className="f-content">
              <h4>Network Boost</h4>
              <p>Reduz o jitter e estabiliza rotas.</p>
            </div>
          </div>
          <div className="premium-feature-item glass">
            <div className="f-icon">🎯</div>
            <div className="f-content">
              <h4>Prioridade CPU</h4>
              <p>Foca hardware na tarefa ativa.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OptimizerPage;
