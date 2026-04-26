import React, { useState } from 'react';
import './MasterOSPage.css';

const MasterOSPage = ({ config, setConfig, onSave }) => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const stats = [
    { label: 'Conexões Ativas', value: '4', icon: 'link', color: '#10b981' },
    { label: 'Clientes Master', value: '12', icon: 'group', color: '#8b5cf6' },
    { label: 'Uso de Tokens (24h)', value: '84k', icon: 'database', color: '#3b82f6' },
    { label: 'Performance Global', value: '98%', icon: 'bolt', color: '#fbbf24' },
  ];

  const providers = [
    { id: 'openai', name: 'OpenAI', status: 'online', models: ['gpt-4o', 'gpt-4-turbo'] },
    { id: 'anthropic', name: 'Anthropic', status: 'online', models: ['claude-3-5-sonnet'] },
    { id: 'google', name: 'Google Gemini', status: 'online', models: ['gemini-1.5-pro'] },
    { id: 'opencode', name: 'OpenCode', status: 'offline', models: [] },
  ];

  return (
    <div className="master-os-container fade-in">
      <div className="master-os-sidebar glass">
        <div className="master-os-nav">
          <button 
            className={`master-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <span className="material-symbols-outlined">dashboard</span>
            Dashboard Master
          </button>
          <button 
            className={`master-nav-item ${activeTab === 'clientes' ? 'active' : ''}`}
            onClick={() => setActiveTab('clientes')}
          >
            <span className="material-symbols-outlined">group</span>
            Gestão de Clientes
          </button>
          <button 
            className={`master-nav-item ${activeTab === 'conexoes' ? 'active' : ''}`}
            onClick={() => setActiveTab('conexoes')}
          >
            <span className="material-symbols-outlined">api</span>
            Hub de Conexões
          </button>
          <button 
            className={`master-nav-item ${activeTab === 'planos' ? 'active' : ''}`}
            onClick={() => setActiveTab('planos')}
          >
            <span className="material-symbols-outlined">vitals</span>
            Controle de Planos
          </button>
        </div>
        
        <div className="master-os-system-info glass">
          <div className="status-indicator online"></div>
          <span>Sistema Master Online</span>
          <small>v2.5.0-master</small>
        </div>
      </div>

      <div className="master-os-content">
        <header className="master-content-header">
          <h2>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} <span>Master</span></h2>
          <div className="header-actions">
            <button className="btn-refresh glass">
              <span className="material-symbols-outlined">refresh</span>
            </button>
            <button className="btn-save-global glass">
              Sincronizar Tudo
            </button>
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <div className="master-dashboard fade-in">
            <div className="stats-grid">
              {stats.map((stat, i) => (
                <div key={i} className="stat-card glass" style={{ borderBottom: `3px solid ${stat.color}` }}>
                  <div className="stat-icon" style={{ color: stat.color }}>
                    <span className="material-symbols-outlined">{stat.icon}</span>
                  </div>
                  <div className="stat-info">
                    <h3>{stat.value}</h3>
                    <p>{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="dashboard-grid-main">
              <div className="dashboard-panel glass">
                <div className="panel-header">
                  <h3>Status de Provedores</h3>
                  <button className="btn-view-all">Ver todos</button>
                </div>
                <div className="providers-list-compact">
                  {providers.map(p => (
                    <div key={p.id} className="provider-item-compact glass">
                      <div className="p-info">
                        <strong>{p.name}</strong>
                        <small>{p.models.length} modelos disponíveis</small>
                      </div>
                      <div className={`p-status ${p.status}`}>{p.status}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="dashboard-panel glass">
                <div className="panel-header">
                  <h3>Atividade Recente</h3>
                </div>
                <div className="activity-feed">
                  <div className="activity-item">
                    <div className="activity-dot blue"></div>
                    <p>GPT-4o sincronizado via Master API</p>
                    <small>Há 2 minutos</small>
                  </div>
                  <div className="activity-item">
                    <div className="activity-dot purple"></div>
                    <p>Novo cliente "Mestre Clientes" adicionado</p>
                    <small>Há 15 minutos</small>
                  </div>
                  <div className="activity-item">
                    <div className="activity-dot green"></div>
                    <p>Configuração Global salva com sucesso</p>
                    <small>Há 45 minutos</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'conexoes' && (
          <div className="master-connections fade-in">
             <div className="connections-header">
                <p>Gerencie todas as suas inteligências de forma centralizada.</p>
             </div>
             <div className="connections-grid">
                {providers.map(p => (
                  <div key={p.id} className="connection-card glass">
                    <div className="c-header">
                      <div className="c-icon">🌐</div>
                      <div className="c-title">
                        <h3>{p.name}</h3>
                        <span className={`status-pill ${p.status}`}>{p.status}</span>
                      </div>
                    </div>
                    <div className="c-body">
                      <input type="password" placeholder="API Token..." className="glass-input" />
                      <div className="c-models">
                        {p.models.map(m => <span key={m} className="model-tag">{m}</span>)}
                      </div>
                    </div>
                    <div className="c-footer">
                      <button className="btn-test">Testar</button>
                      <button className="btn-connect">Conectar</button>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'clientes' && (
          <div className="master-placeholder glass fade-in">
            <span className="material-symbols-outlined large-icon">construction</span>
            <h3>Módulo de Clientes em Construção</h3>
            <p>Em breve, você terá o controle total da sua base de clientes aqui.</p>
          </div>
        )}

        {activeTab === 'planos' && (
          <div className="master-placeholder glass fade-in">
            <span className="material-symbols-outlined large-icon">verified_user</span>
            <h3>Gestão de Planos & Assinaturas</h3>
            <p>Controle de níveis de acesso e restrições de LLM.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MasterOSPage;
