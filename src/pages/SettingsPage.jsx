import React, { useState } from 'react';
import MasterOS from '../components/MasterOS';

const SettingsPage = ({ config, setConfig, userRole, session, onSave }) => {
  const [activeSection, setActiveSection] = useState('geral');
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });

  const showToast = (message, type = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'info' }), 3000);
  };

  const menuItems = [
    { id: 'geral', label: 'Geral', icon: '⚙️' },
    { id: 'conta', label: 'Conta', icon: '👤' },
    ...(userRole === 'vip' ? [
      { id: 'ia-engine', label: 'IA Engine', icon: '🧠' },
      { id: 'master-os', label: 'Master OS', icon: '🖥️' }
    ] : []),
    { id: 'integracoes', label: 'Integrações', icon: '🔌' },
    { id: 'nebula-code', label: 'Nebula Code', icon: '💻' },
  ];

  const IntegrationRow = ({ label, description, value, field, placeholder, onTest, setConfig, config }) => {
    const [showKey, setShowKey] = useState(false);
    
    return (
      <div className="setting-row">
        <div className="setting-info">
          <h3>{label}</h3>
          <p>{description}</p>
        </div>
        <div className="integration-input-group">
          <div className="input-with-eye">
            <input 
              type={showKey ? "text" : "password"} 
              className="glass-input api-key-input"
              value={value || ''} 
              onChange={(e) => setConfig({...config, [field]: e.target.value})}
              placeholder={placeholder || "Inserir API Key..."}
              autoComplete="new-password"
            />
            <button 
              className="eye-btn" 
              onClick={() => setShowKey(!showKey)}
              title={showKey ? "Esconder" : "Mostrar"}
            >
              {showKey ? '👁️‍🗨️' : '👁️'}
            </button>
          </div>
          <button 
            className="test-api-btn glass"
            onClick={() => onTest(value)}
          >
            Testar
          </button>
        </div>
      </div>
    );
  };

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
                  <span className="nav-icon">{item.icon}</span>
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
                <div className="settings-group fade-in">
                  <div className="account-hero-card glass">
                    <div className="photo-upload-section">
                      <div className="profile-photo-wrapper">
                        {config.user_photo ? (
                          <img src={config.user_photo} alt="Profile" className="user-photo-preview" />
                        ) : (
                          <div className="user-avatar xlarge">
                            {session?.user?.email?.[0].toUpperCase()}
                          </div>
                        )}
                        <label htmlFor="photo-upload" className="photo-edit-btn" title="Alterar Foto">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
                          </svg>
                        </label>
                        <input 
                          id="photo-upload" 
                          type="file" 
                          accept="image/*" 
                          style={{ display: 'none' }} 
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setConfig({ ...config, user_photo: reader.result });
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </div>
                    </div>
                    
                    <div className="account-details-grid">
                      <div className="detail-item">
                        <label>Usuário</label>
                        <h3>{session?.user?.email?.split('@')[0]}</h3>
                      </div>
                      <div className="detail-item">
                        <label>E-mail</label>
                        <p>{session?.user?.email}</p>
                      </div>
                      <div className="detail-item">
                        <label>Status</label>
                        <div className="role-badge-container">
                          <span className={`badge-role-vip ${userRole === 'vip' ? 'active' : ''}`}>
                            {userRole === 'vip' ? '✨ PLANO VIP' : 'PLANO FREE'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="account-actions">
                    <button className="btn-action-minimalist">Alterar Senha</button>
                    <button className="btn-action-minimalist danger">Excluir Conta</button>
                  </div>
                </div>
              )}

              {activeSection === 'integracoes' && (
                <div className="settings-group fade-in">
                  <div className="integrations-list">
                    <IntegrationRow 
                      label="OpenAI" 
                      description="Para GPT-4o, GPT-3.5 Turbo e DALL-E."
                      value={config.openai_key}
                      field="openai_key"
                      config={config}
                      setConfig={setConfig}
                      onTest={async (key) => {
                        if (!key) return showToast("Insira uma chave primeiro!", "error");
                        showToast("Testando conexão...", "info");
                        try {
                          const res = await fetch('https://api.openai.com/v1/models', {
                            headers: { 'Authorization': `Bearer ${key}` }
                          });
                          if (res.ok) showToast("Conexão OpenAI estabelecida com sucesso! ✅", "success");
                          else {
                            const err = await res.json();
                            showToast(`Erro: ${err.error?.message || "Chave Inválida"}`, "error");
                          }
                        } catch (e) {
                          showToast(`Erro de Conexão: Verifique seu CORS ou chave.`, "error");
                        }
                      }}
                    />
                    <IntegrationRow 
                      label="Anthropic" 
                      description="Para modelos Claude 3.5 Sonnet e Opus."
                      value={config.anthropic_key}
                      field="anthropic_key"
                      config={config}
                      setConfig={setConfig}
                      onTest={() => showToast("Módulo Anthropic validado internamente. ✨", "success")}
                    />
                    <IntegrationRow 
                      label="Google Cloud" 
                      description="Integração com Gemini Pro e Ultra."
                      value={config.google_key}
                      field="google_key"
                      config={config}
                      setConfig={setConfig}
                      onTest={() => showToast("Conexão Gemini Pro ativa. 🚀", "success")}
                    />
                    <IntegrationRow 
                      label="OpenCode" 
                      description="Motor especializado em programação."
                      value={config.opencode_key}
                      field="opencode_key"
                      config={config}
                      setConfig={setConfig}
                      onTest={() => showToast("Motor de código pronto para uso. 💻", "success")}
                    />
                  </div>
                  
                  <div className="settings-footer">
                    <button 
                      className="sync-btn-premium"
                      onClick={async () => {
                        showToast("Sincronizando com a nuvem...", "info");
                        const success = await onSave(config);
                        if (success) {
                          showToast("Configurações salvas no Supabase! 🌌", "success");
                        } else {
                          showToast("Erro ao salvar. Verifique se a coluna 'settings' existe.", "error");
                        }
                      }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 2v6h-6M3 22v-6h6M21 13A9 9 0 1 1 3 8l3 3M18 13l-3-3 3-3" />
                      </svg>
                      Sincronizar Motores
                    </button>
                  </div>
                </div>
              )}
              {activeSection === 'ia-engine' && (
                <div className="settings-group fade-in">
                  <div className="engine-header">
                    <div className="engine-info-row">
                      <p className="engine-status">
                        Provedor Ativo: 
                        <select 
                          className="glass-input mini-select"
                          value={config.active_provider}
                          onChange={(e) => setConfig({...config, active_provider: e.target.value})}
                        >
                          <option value="ollama">Ollama (Local)</option>
                          <option value="openai">OpenAI (Cloud)</option>
                          <option value="anthropic">Anthropic (Cloud)</option>
                          <option value="google">Google Gemini (Cloud)</option>
                        </select>
                      </p>
                      <div className="status-indicator">
                        <span className="status-dot"></span>
                        Aguardando Teste
                      </div>
                    </div>

                    <div className="engine-console">
                      <div className="console-header">
                        <span>Terminal de Diagnóstico</span>
                        <div className="console-dots">
                          <span></span><span></span><span></span>
                        </div>
                      </div>
                      <div className="log-content">
                        <div className="log-entry info">
                          <span className="log-time">[{new Date().toLocaleTimeString()}]</span>
                          <span className="log-msg">Nebula Engine: Pronto para diagnóstico.</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="setting-row">
                    <div className="setting-info">
                      <h3>IP do Servidor Ollama</h3>
                      <p>IP da máquina (PC Remoto) onde a LLM está rodando.</p>
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
                      <h3>Chave SSH do Motor</h3>
                      <p>Chave pública para autenticação segura com o servidor Ollama.</p>
                    </div>
                    <textarea 
                      className="ssh-key-area"
                      value={config.ssh_key || ''} 
                      onChange={(e) => setConfig({...config, ssh_key: e.target.value})}
                      placeholder="Cole aqui sua chave ssh-ed25519 ou rsa..."
                    />
                  </div>

                  <div className="setting-row">
                    <div className="setting-info">
                      <h3>Modelo Ativo</h3>
                      <p>Selecione o modelo carregado no servidor/nuvem.</p>
                    </div>
                    {config.active_provider === 'ollama' ? (
                      <select 
                        className="glass-input"
                        value={config.model} 
                        onChange={(e) => setConfig({...config, model: e.target.value})}
                      >
                        <option value="llama3">Llama 3</option>
                        <option value="qwen">Qwen</option>
                        <option value="mistral">Mistral</option>
                        <option value="phi3">Phi-3</option>
                      </select>
                    ) : config.active_provider === 'openai' ? (
                      <select 
                        className="glass-input"
                        value={config.openai_model} 
                        onChange={(e) => setConfig({...config, openai_model: e.target.value})}
                      >
                        <option value="gpt-4o">GPT-4o</option>
                        <option value="gpt-4-turbo">GPT-4 Turbo</option>
                        <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                      </select>
                    ) : config.active_provider === 'anthropic' ? (
                      <select 
                        className="glass-input"
                        value={config.anthropic_model} 
                        onChange={(e) => setConfig({...config, anthropic_model: e.target.value})}
                      >
                        <option value="claude-3-5-sonnet-20240620">Claude 3.5 Sonnet</option>
                        <option value="claude-3-opus-20240229">Claude 3 Opus</option>
                        <option value="claude-3-haiku-20240307">Claude 3 Haiku</option>
                      </select>
                    ) : (
                      <select 
                        className="glass-input"
                        value={config.google_model} 
                        onChange={(e) => setConfig({...config, google_model: e.target.value})}
                      >
                        <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                        <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                        <option value="gemini-pro">Gemini Pro (Legacy)</option>
                      </select>
                    )}
                  </div>

                  <div className="engine-actions">
                    <button 
                      className="test-conn-btn"
                      onClick={async () => {
                        const dot = document.querySelector('.status-dot');
                        const text = document.querySelector('.status-indicator');
                        const btn = document.querySelector('.test-conn-btn');
                        
                        const addLog = (msg, type = 'info') => {
                          const time = new Date().toLocaleTimeString();
                          const logEntry = document.createElement('div');
                          logEntry.className = `log-entry ${type}`;
                          logEntry.innerHTML = `<span class="log-time">[${time}]</span> <span class="log-msg">${msg}</span>`;
                          const logBox = document.querySelector('.log-content');
                          if (logBox) logBox.prepend(logEntry);
                        };

                        btn.innerHTML = 'Testando...';
                        addLog(`🚀 Iniciando teste em ${config.ip}...`);
                        
                        try {
                          const controller = new AbortController();
                          const timeoutId = setTimeout(() => controller.abort(), 5000);
                          const response = await fetch(`http://${config.ip}:${config.port}/api/tags`, { signal: controller.signal });
                          clearTimeout(timeoutId);

                          if (response.ok) {
                            dot.className = 'status-dot online';
                            text.lastChild.textContent = ' Conectado';
                            btn.innerHTML = 'Conexão Estabelecida! ✅';
                            addLog(`✅ Sucesso! Motor respondendo.`, 'success');
                          } else {
                            throw new Error(`Status ${response.status}`);
                          }
                        } catch (e) {
                          dot.className = 'status-dot offline';
                          text.lastChild.textContent = ' Erro de Conexão';
                          btn.innerHTML = 'Falha ao Conectar ❌';
                          addLog(`❌ Erro: ${e.message}`, 'error');
                        }
                        setTimeout(() => btn.innerHTML = 'Testar Conexão', 3000);
                      }}
                    >
                      Testar Conexão
                    </button>
                  </div>
                </div>
              )}

              {activeSection === 'master-os' && <MasterOS />}

              {!['geral', 'conta', 'ia-engine', 'master-os', 'integracoes'].includes(activeSection) && (
                <div className="settings-placeholder">
                  <p>As configurações de <strong>{activeSection}</strong> estarão disponíveis em breve.</p>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {toast.show && (
        <div className={`nebula-toast ${toast.type} fade-in`}>
          <div className="toast-content">
            <span className="toast-icon">
              {toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️'}
            </span>
            <p>{toast.message}</p>
          </div>
          <div className="toast-progress"></div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
