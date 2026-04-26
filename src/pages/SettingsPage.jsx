import React, { useState } from 'react';
import MasterOS from '../components/MasterOS';

const SettingsPage = ({ config, setConfig, userRole, session }) => {
  const [activeSection, setActiveSection] = useState('geral');

  const menuItems = [
    { id: 'geral', label: 'Geral' },
    { id: 'conta', label: 'Conta' },
    { id: 'privacidade', label: 'Privacidade' },
    // Apenas para VIPs
    ...(userRole === 'vip' ? [
      { id: 'ia-engine', label: 'IA Engine' },
      { id: 'master-os', label: 'Master OS' }
    ] : []),
    { id: 'integracoes', label: 'Integrações' },
    { id: 'cobranca', label: 'Cobrança' },
    { id: 'nebula-code', label: 'Nebula Code' },
  ];

  const IntegrationRow = ({ label, description, value, field, placeholder }) => (
    <div className="setting-row">
      <div className="setting-info">
        <h3>{label}</h3>
        <p>{description}</p>
      </div>
      <input 
        type="password" 
        className="glass-input api-key-input"
        value={value} 
        onChange={(e) => setConfig({...config, [field]: e.target.value})}
        placeholder={placeholder || "Inserir API Key..."}
      />
    </div>
  );

  return (
    <div className="settings-page fade-in">
      <div className="settings-container glass">
        <header className="settings-header">
          <h1>Configurações</h1>
        </header>

        <div className="settings-layout">
          <aside className="settings-sidebar">
            <nav>
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  className={`settings-nav-item ${activeSection === item.id ? 'active' : ''}`}
                  onClick={() => setActiveSection(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </aside>

          <main className="settings-content">
            <div className="content-section">
              <h2>{menuItems.find(i => i.id === activeSection)?.label}</h2>
              
              {activeSection === 'geral' && (
                <div className="settings-group">
                  <div className="setting-row">
                    <div className="setting-info">
                      <h3>Tema do Sistema</h3>
                      <p>Escolha entre o modo claro, escuro ou automático.</p>
                    </div>
                    <select className="glass-input">
                      <option>Escuro (Padrão)</option>
                      <option>Claro</option>
                      <option>Sistema</option>
                    </select>
                  </div>

                  <div className="setting-row">
                    <div className="setting-info">
                      <h3>Idioma</h3>
                      <p>Selecione o idioma da interface.</p>
                    </div>
                    <select className="glass-input">
                      <option>Português (Brasil)</option>
                      <option>English</option>
                      <option>Español</option>
                    </select>
                  </div>
                </div>
              )}

              {activeSection === 'conta' && (
                <div className="settings-group">
                  <div className="user-card-settings glass">
                    <div className="user-avatar large">
                      {session?.user?.email?.[0].toUpperCase()}
                    </div>
                    <div className="user-details">
                      <h3>{session?.user?.email?.split('@')[0]}</h3>
                      <p>{session?.user?.email}</p>
                      <span className="badge-role" data-role={userRole}>{userRole.toUpperCase()}</span>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'integracoes' && (
                <div className="settings-group fade-in">
                  <IntegrationRow 
                    label="OpenAI" 
                    description="Para GPT-4o, GPT-3.5 Turbo e DALL-E."
                    value={config.openai_key}
                    field="openai_key"
                  />
                  <IntegrationRow 
                    label="Anthropic" 
                    description="Para modelos Claude 3.5 Sonnet e Opus."
                    value={config.anthropic_key}
                    field="anthropic_key"
                  />
                  <IntegrationRow 
                    label="Google Cloud" 
                    description="Integração com Gemini Pro e Ultra."
                    value={config.google_key}
                    field="google_key"
                  />
                  <IntegrationRow 
                    label="OpenCode" 
                    description="Motor especializado em programação."
                    value={config.opencode_key}
                    field="opencode_key"
                  />
                  
                  <div className="settings-footer">
                    <button 
                      className="btn-primary sync-btn"
                      onClick={() => {
                        // Feedback visual de salvamento
                        const btn = document.querySelector('.sync-btn');
                        btn.innerHTML = 'Sincronizando...';
                        setTimeout(() => {
                          btn.innerHTML = 'Configurações Salvas! ✨';
                          setTimeout(() => btn.innerHTML = 'Sincronizar Integrações', 2000);
                        }, 1000);
                      }}
                    >
                      Sincronizar Integrações
                    </button>
                  </div>
                </div>
              )}

              {activeSection === 'ia-engine' && (
                <div className="settings-group fade-in">
                  <div className="setting-row">
                    <div className="setting-info">
                      <h3>IP do Servidor Ollama</h3>
                      <p>IP da máquina onde a LLM está rodando.</p>
                    </div>
                    <input 
                      type="text" 
                      className="glass-input"
                      value={config.ip} 
                      onChange={(e) => setConfig({...config, ip: e.target.value})}
                      placeholder="Ex: 192.168.1.100"
                    />
                  </div>

                  <div className="setting-row">
                    <div className="setting-info">
                      <h3>Porta de Conexão</h3>
                      <p>Padrão do Ollama é 11434.</p>
                    </div>
                    <input 
                      type="text" 
                      className="glass-input"
                      value={config.port} 
                      onChange={(e) => setConfig({...config, port: e.target.value})}
                      placeholder="11434"
                    />
                  </div>

                  <div className="setting-row">
                    <div className="setting-info">
                      <h3>Modelo Ativo</h3>
                      <p>Selecione o modelo carregado no servidor.</p>
                    </div>
                    <select 
                      className="glass-input"
                      value={config.model} 
                      onChange={(e) => setConfig({...config, model: e.target.value})}
                    >
                      <option value="llama3">Llama 3</option>
                      <option value="mistral">Mistral</option>
                      <option value="phi3">Phi-3</option>
                    </select>
                  </div>
                </div>
              )}

              {activeSection === 'master-os' && <MasterOS />}

              {/* Placeholders para outras seções */}
              {!['geral', 'conta', 'ia-engine', 'master-os', 'integracoes'].includes(activeSection) && (
                <div className="settings-placeholder">
                  <p>As configurações de <strong>{activeSection}</strong> estarão disponíveis em breve.</p>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
