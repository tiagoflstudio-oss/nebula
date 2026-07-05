import React, { useState } from 'react';
import './MCPExplorerPage.css';

const MCPExplorerPage = () => {
  const [connectors, setConnectors] = useState([
    { id: 'fs', name: 'Local Filesystem', description: 'Acesso direto a arquivos e diretórios locais.', status: 'connected', type: 'core', icon: '📁' },
    { id: 'goog', name: 'Google Search', description: 'Busca avançada e extração de dados da web.', status: 'active', type: 'web', icon: '🔍' },
    { id: 'gh', name: 'GitHub Integration', description: 'Gestão de repositórios, PRs e Issues.', status: 'idle', type: 'dev', icon: '🐙' },
    { id: 'db', name: 'Database Bridge', description: 'Conector universal para SQL e NoSQL.', status: 'idle', type: 'data', icon: '🗄️' },
    { id: 'ai', name: 'OpenAI/Anthropic Bridge', description: 'Orquestração de modelos de terceiros.', status: 'active', type: 'ai', icon: '🤖' }
  ]);

  const [searchQuery, setSearchQuery] = useState('');

  const filteredConnectors = connectors.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="mcp-page fade-in">
      <header className="mcp-header">
        <div className="header-text">
          <div className="protocol-badge">PROTOCOL v1.0</div>
          <h1>MCP Explorer</h1>
          <p>Gerencie conectores de contexto e integre o Nebula com suas ferramentas favoritas.</p>
        </div>
        <div className="mcp-search-bar glass">
          <input 
            type="text" 
            placeholder="Buscar conectores..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <span className="search-icon">🔍</span>
        </div>
      </header>

      <div className="mcp-grid">
        {filteredConnectors.map(conn => (
          <div key={conn.id} className={`mcp-card glass ${conn.status}`}>
            <div className="card-top">
              <span className="conn-icon">{conn.icon}</span>
              <span className={`status-pill ${conn.status}`}>{conn.status}</span>
            </div>
            <div className="card-body">
              <h3>{conn.name}</h3>
              <p>{conn.description}</p>
              <div className="conn-type">Tag: <span>{conn.type}</span></div>
            </div>
            <div className="card-actions">
              <button className="btn-config">Configurar</button>
              <button className={`btn-toggle ${conn.status === 'idle' ? 'enable' : 'disable'}`}>
                {conn.status === 'idle' ? 'Ativar' : 'Pausar'}
              </button>
            </div>
          </div>
        ))}
        <div className="mcp-card add-new glass">
          <div className="add-icon">+</div>
          <h3>Novo Conector</h3>
          <p>Adicione um servidor MCP via URL ou NPM.</p>
          <button className="btn-add-mcp">Explorar Marketplace</button>
        </div>
      </div>

      <div className="mcp-status-panel glass">
        <div className="panel-section">
          <h4>Status do Bridge</h4>
          <div className="status-row">
            <span>Conectores Ativos:</span>
            <strong>{connectors.filter(c => c.status !== 'idle').length}</strong>
          </div>
          <div className="status-row">
            <span>Requisições Contextuais:</span>
            <strong>1.2k / hora</strong>
          </div>
        </div>
        <div className="panel-divider"></div>
        <div className="panel-section">
          <h4>Saúde do Sistema</h4>
          <div className="health-bar-container">
            <div className="health-fill" style={{ width: '94%' }}></div>
          </div>
          <span className="health-label">94% de Conectividade Estável</span>
        </div>
      </div>
    </div>
  );
};

export default MCPExplorerPage;
