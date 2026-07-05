import React, { useState } from 'react';
import './OptimizerPage.css';

const OptimizerPage = () => {
  const [optimizing, setOptimizing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState([]);
  const [activeTask, setActiveTask] = useState(null);

  const addLog = (msg) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(prev => [`[${time}] ${msg}`, ...prev].slice(0, 50));
  };

  const runOptimization = (taskName, icon) => {
    if (optimizing) return;
    setOptimizing(true);
    setActiveTask(taskName);
    setProgress(0);
    addLog(`INICIANDO PROTOCOLO: ${taskName.toUpperCase()}...`);

    const steps = [
      `Sincronizando com núcleo de processamento...`,
      `Mapeando clusters de ${taskName.toLowerCase()}...`,
      "Executando rotinas de purging e limpeza...",
      "Otimizando alocação de buffers de sistema",
      "Validando integridade dos novos parâmetros",
      `${taskName} concluído com sucesso.`
    ];

    let stepIdx = 0;
    const interval = setInterval(() => {
      setProgress(prev => {
        const next = prev + 4;
        if (next % 20 === 0 && stepIdx < steps.length) {
          addLog(`> ${steps[stepIdx]}`);
          stepIdx++;
        }
        if (next >= 100) {
          clearInterval(interval);
          setOptimizing(false);
          setActiveTask(null);
          addLog(`✨ SISTEMA: ${taskName.toUpperCase()} FINALIZADO.`);
          return 100;
        }
        return next;
      });
    }, 60);
  };

  return (
    <div className="page-container optimizer-page fade-in">
      <div className="page-header compact-header">
        <div className="header-title-row">
          <h1>Nebula <span>System Master</span></h1>
          <div className="status-badge-premium online">
            <span className="dot"></span>
            Núcleo de Performance Ativo
          </div>
        </div>
      </div>

      <div className="optimizer-actions-grid">
        <div className={`action-card glass ${activeTask === 'Limpeza de Cache' ? 'active' : ''}`} 
             onClick={() => runOptimization('Limpeza de Cache', '🧹')}>
          <div className="action-icon">🧹</div>
          <div className="action-info">
            <h3>Cache Purge</h3>
            <p>Limpa buffers e temporários do navegador.</p>
          </div>
          <button className="run-btn">Executar</button>
        </div>

        <div className={`action-card glass ${activeTask === 'Turbo Network' ? 'active' : ''}`}
             onClick={() => runOptimization('Turbo Network', '🚀')}>
          <div className="action-icon">🚀</div>
          <div className="action-info">
            <h3>Network Boost</h3>
            <p>Flush DNS e otimização de latência TCP.</p>
          </div>
          <button className="run-btn">Executar</button>
        </div>

        <div className={`action-card glass ${activeTask === 'Prioridade CPU' ? 'active' : ''}`}
             onClick={() => runOptimization('Prioridade CPU', '🧠')}>
          <div className="action-icon">🧠</div>
          <div className="action-info">
            <h3>CPU Focus</h3>
            <p>Prioriza processos Nebula no kernel.</p>
          </div>
          <button className="run-btn">Executar</button>
        </div>

        <div className={`action-card glass ${activeTask === 'Escaneamento Profundo' ? 'active' : ''}`}
             onClick={() => runOptimization('Escaneamento Profundo', '🛡️')}>
          <div className="action-icon">🛡️</div>
          <div className="action-info">
            <h3>Deep Scan</h3>
            <p>Busca e encerra processos zumbis inúteis.</p>
          </div>
          <button className="run-btn">Executar</button>
        </div>
      </div>

      <div className="diagnostic-terminal glass">
        <div className="terminal-header">
          <div className="terminal-dots">
            <span></span><span></span><span></span>
          </div>
          <div className="terminal-title">NEBULA DIAGNOSTIC TERMINAL v2.0</div>
          {optimizing && <div className="terminal-spinner"></div>}
        </div>
        
        <div className="terminal-content">
          {logs.length === 0 ? (
            <div className="terminal-empty">
              <span className="cursor-blink">_</span> Aguardando comando de otimização...
            </div>
          ) : (
            logs.map((log, idx) => (
              <div key={idx} className={`terminal-line ${log.includes('✨') ? 'highlight' : ''}`}>
                <span className="line-prefix">nebula:~$</span> {log}
              </div>
            ))
          )}
        </div>

        {optimizing && (
          <div className="terminal-progress-container">
            <div className="progress-label">Otimizando {activeTask}: {progress}%</div>
            <div className="progress-bar-bg">
              <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OptimizerPage;
