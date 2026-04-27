import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const LLMHubPage = ({ config, globalSettings, userRole }) => {
  const [statuses, setStatuses] = useState({
    ollama: 'checking',
    openai: 'checking',
    anthropic: 'checking',
    google: 'checking',
    openrouter: 'checking'
  });

  useEffect(() => {
    checkAllConnections();
  }, [config]);

  const checkAllConnections = async () => {
    // Ollama Check
    try {
      const res = await fetch(`http://${config.ip}:${config.port}/api/tags`, { signal: AbortSignal.timeout(2000) });
      setStatuses(prev => ({ ...prev, ollama: res.ok ? 'online' : 'offline' }));
    } catch {
      setStatuses(prev => ({ ...prev, ollama: 'offline' }));
    }

    // Individual Provider Checks (Simplified for UI feedback)
    setStatuses(prev => ({
      ...prev,
      openai: config.openai_key ? 'online' : 'unconfigured',
      anthropic: config.anthropic_key ? 'online' : 'unconfigured',
      google: config.google_key ? 'online' : 'unconfigured',
      openrouter: config.openrouter_key ? 'online' : 'unconfigured'
    }));
  };

  const providers = [
    { id: 'openai', name: 'OpenAI', icon: '🤖', model: config.openai_model || 'GPT-4O' },
    { id: 'anthropic', name: 'Anthropic', icon: '🎭', model: config.anthropic_model || 'Claude 3.5' },
    { id: 'google', name: 'Google Cloud', icon: '🚀', model: config.google_model || 'Gemini 1.5' },
    { id: 'openrouter', name: 'OpenRouter', icon: '🌐', model: config.openrouter_model || 'Hub Llama/Qwen' },
    { id: 'ollama', name: 'Ollama (Local)', icon: '🏠', model: config.model || 'Llama 3' },
  ];

  const masterProvider = globalSettings?.global_provider || 'openai';
  const masterModel = globalSettings?.global_selected_model || 'gpt-4o';

  return (
    <div className="hub-page fade-in">
      <header className="hub-header">
        <div className="hub-title-section">
          <h1>Hub de Inteligência</h1>
          <p>Monitoramento central de motores e conexões neurais.</p>
        </div>
        <div className="hub-stats glass">
          <div className="stat-item">
            <label>Ativos</label>
            <span>{Object.values(statuses).filter(s => s === 'online').length}</span>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-item">
            <label>Master OS</label>
            <span className="master-status-text">{masterProvider.toUpperCase()}</span>
          </div>
        </div>
      </header>

      <section className="master-highlight-section">
        <div className="master-card-premium glass">
          <div className="m-card-glow"></div>
          <div className="m-card-content">
            <div className="m-badge">SISTEMA MESTRE</div>
            <div className="m-main-info">
              <div className="m-icon-large">🌐</div>
              <div className="m-text">
                <h2>{masterProvider.charAt(0).toUpperCase() + masterProvider.slice(1)} Engine</h2>
                <p>Modelo Oficial: <strong>{masterModel.toUpperCase()}</strong></p>
              </div>
            </div>
            <div className="m-footer">
              <span className="status-indicator">
                <span className="status-dot online"></span>
                Operacional
              </span>
              <button className="btn-manage-master" onClick={() => window.dispatchEvent(new CustomEvent('nav-settings', { detail: 'ia-global' }))}>
                Configurar
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="personal-hub-grid">
        <div className="section-title-row">
          <h2>Suas Conexões Pessoais</h2>
          <button className="btn-refresh-hub" onClick={checkAllConnections}>Sincronizar Agora</button>
        </div>
        
        <div className="hub-grid">
          {providers.map(p => (
            <div key={p.id} className={`hub-card glass ${statuses[p.id]}`}>
              <div className="hub-card-header">
                <span className="h-icon">{p.icon}</span>
                <span className={`h-status-dot ${statuses[p.id]}`}></span>
              </div>
              <div className="hub-card-body">
                <h3>{p.name}</h3>
                <p>{statuses[p.id] === 'unconfigured' ? 'Aguardando Chave' : p.model}</p>
              </div>
              <div className="hub-card-footer">
                <span className="status-text">
                  {statuses[p.id] === 'online' ? 'Conectado' : 
                   statuses[p.id] === 'offline' ? 'Fora de Linha' : 'Desconectado'}
                </span>
                <button className="btn-setup-mini" onClick={() => window.dispatchEvent(new CustomEvent('nav-settings', { detail: 'integracoes' }))}>
                  {statuses[p.id] === 'unconfigured' ? 'Configurar' : 'Ajustar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default LLMHubPage;
