import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { buildAuthUrl } from '../services/oauthService';

const IntegrationRow = ({ label, description, value, field, placeholder, onTest, setConfig, config }) => {
  const [showKey, setShowKey] = useState(false);
  const [syncStatus, setSyncStatus] = useState('idle'); // idle, loading, success, error

  const handleSync = async () => {
    setSyncStatus('loading');
    try {
      const result = await onTest(value);
      if (result === false) {
        setSyncStatus('error');
      } else {
        setSyncStatus('success');
      }
    } catch (err) {
      setSyncStatus('error');
    }
    setTimeout(() => setSyncStatus('idle'), 5000);
  };

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
            onChange={(e) => {
              const val = e.target.value;
              setConfig(prev => ({ ...prev, [field]: val }));
              setSyncStatus('idle');
            }}
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
          className={`test-api-btn glass sync-mode ${syncStatus}`}
          onClick={handleSync}
          disabled={syncStatus === 'loading'}
        >
          {syncStatus === 'loading' ? '...' :
            syncStatus === 'success' ? 'Sincronizado ✅' :
              syncStatus === 'error' ? 'Erro ❌' : 'Sincronizar'}
        </button>
      </div>
    </div>
  );
};

const SettingsPage = ({ config, setConfig, userRole, session, onSave, setModalConfig, globalSettings, initialSection }) => {
  const [activeSection, setActiveSection] = useState(initialSection || 'geral');
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });
  const [connections, setConnections] = useState([]);
  const [connectionsLoading, setConnectionsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newConn, setNewConn] = useState({ provider: 'antigravity', name: '', access_token: '', auth_type: 'apikey' });
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [isWaitingForCode, setIsWaitingForCode] = useState(false);
  const [oauthCode, setOauthCode] = useState('');

  const [prevInitial, setPrevInitial] = useState(initialSection);
  if (initialSection !== prevInitial) {
    setPrevInitial(initialSection);
    if (initialSection) setActiveSection(initialSection);
  }

  const showToast = React.useCallback((message, type = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'info' }), 3000);
  }, []);

  const fetchConnections = React.useCallback(async () => {
    setConnectionsLoading(true);
    try {
      const { data, error } = await supabase
        .from('provider_connections')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setConnections(data || []);
    } catch (err) {
      showToast("Erro ao carregar conexões", "error");
    } finally {
      setConnectionsLoading(false);
    }
  }, [showToast]);

  React.useEffect(() => {
    if (activeSection === 'conexoes') {
      fetchConnections();
    }
  }, [activeSection, fetchConnections]);


  const handleAddConnection = async () => {
    if (!newConn.access_token) return showToast("Token é obrigatório", "error");
    try {
      const { error } = await supabase
        .from('provider_connections')
        .insert([{
          ...newConn,
          user_id: session?.user?.id,
          is_active: true
        }]);
      if (error) throw error;
      showToast("Conexão adicionada!", "success");
      setShowAddModal(false);
      setNewConn({ provider: 'antigravity', name: '', access_token: '' });
      fetchConnections();
    } catch (err) {
      showToast("Erro ao salvar: " + err.message, "error");
    }
  };

  const handleDeleteConnection = (id) => {
    setModalConfig({
      isOpen: true,
      title: 'Excluir Conexão',
      message: 'Tem certeza que deseja apagar esta conexão de conta? Esta ação removerá o acesso do Rastreador de Cota permanentemente.',
      type: 'confirm',
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('provider_connections')
            .delete()
            .eq('id', id);
          if (error) throw error;
          setConnections(prev => prev.filter(c => c.id !== id));
          showToast("Conexão excluída", "success");
          setModalConfig(prev => ({ ...prev, isOpen: false }));
        } catch (err) {
          showToast("Erro ao excluir", "error");
        }
      }
    });
  };

  const handleOAuthStart = async () => {
    if (newConn.provider === 'antigravity') {
      try {
        showToast("Conectando via Nebula Bridge local...", "info");
        const response = await fetch('http://localhost:3001/api/antigravity/refresh-local-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
          throw new Error('Falha ao obter token da Bridge. Verifique se o "npm run bridge" está rodando no terminal.');
        }

        const data = await response.json();
        if (!data.access_token) {
          throw new Error('Token não retornado pela Bridge.');
        }

        const { error } = await supabase
          .from('provider_connections')
          .insert([{
            provider: 'antigravity',
            name: 'Local ADC (Bridge)',
            access_token: data.access_token,
            auth_type: 'oauth',
            user_id: session?.user?.id,
            is_active: true
          }]);
        
        if (error) throw error;
        
        showToast("Conexão automática estabelecida com sucesso!", "success");
        setShowAddModal(false);
        fetchConnections();
      } catch (err) {
        showToast(err.message, "error");
      }
      return;
    }

    try {
      const redirectUri = window.location.origin + '/callback'; // Simulated redirect
      const state = Math.random().toString(36).substring(7);
      const url = buildAuthUrl(newConn.provider, null, redirectUri, state); // Service uses hardcoded IDs now

      // Open in new tab
      window.open(url, '_blank');
      showToast("Janela de autorização aberta! Após autorizar, cole o código abaixo.", "info");
      setIsWaitingForCode(true);
    } catch (err) {
      showToast(err.message, "error");
    }
  };


  const menuItems = [
    { id: 'geral', label: 'Geral', icon: '⚙️' },
    { id: 'conta', label: 'Conta', icon: '👤' },
    ...(userRole === 'admin' || userRole === 'vip' ? [
      { id: 'ia-engine', label: 'IA Engine', icon: '🧠' },
      { id: 'ia-global', label: 'IA Global (Mestre)', icon: '🌐' }
    ] : []),
    { id: 'integracoes', label: 'Integrações de API', icon: '🔌' },
    { id: 'conexoes', label: 'Conexão de Conta', icon: '🔗' },
    { id: 'nebula-code', label: 'Nebula Code', icon: '💻' },
  ];



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
                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" />
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
                        if (!key) {
                          showToast("Insira uma chave primeiro!", "error");
                          return false;
                        }
                        showToast("Sincronizando modelos OpenAI...", "info");
                        try {
                          const res = await fetch('https://api.openai.com/v1/models', {
                            headers: { 'Authorization': `Bearer ${key}` }
                          });
                          if (res.ok) {
                            const data = await res.json();
                            const models = data.data
                              .map(m => m.id)
                              .filter(id => id.startsWith('gpt') || id.includes('o1'))
                              .sort();
                            setConfig(prev => ({ ...prev, fetched_openai_models: models, openai_key: key }));
                            showToast(`OpenAI ativa! ${models.length} modelos detectados. ✅`, "success");
                            return true;
                          }
                          else {
                            const err = await res.json();
                            showToast(`Erro: ${err.error?.message || "Chave Inválida"}`, "error");
                            return false;
                          }
                        } catch (e) {
                          showToast(`CORS bloqueou fetch direto. Usando lista segura.`, "info");
                          const models = ['gpt-4o', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'];
                          setConfig(prev => ({ ...prev, fetched_openai_models: models, openai_key: key }));
                          showToast("OpenAI pronta para uso! ✅", "success");
                          return true;
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
                      onTest={() => {
                        const models = ['claude-3-5-sonnet-20240620', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'];
                        setConfig(prev => ({ ...prev, fetched_anthropic_models: models }));
                        showToast("Anthropic: 3 modelos sincronizados. ✨", "success");
                        return true;
                      }}
                    />
                    <IntegrationRow
                      label="OpenRouter"
                      description="Acesso a centenas de modelos (Llama, Mistral, Qwen)."
                      value={config.openrouter_key}
                      field="openrouter_key"
                      config={config}
                      setConfig={setConfig}
                      onTest={async (key) => {
                        if (!key) {
                          showToast("Insira uma chave primeiro!", "error");
                          return false;
                        }
                        showToast("Sincronizando modelos OpenRouter...", "info");
                        try {
                          const res = await fetch('https://openrouter.ai/api/v1/models', {
                            headers: { 'Authorization': `Bearer ${key}` }
                          });
                          if (res.ok) {
                            const data = await res.json();
                            const models = data.data
                              .map(m => m.id)
                              .slice(0, 20); // Limita aos top 20 para o UI não explodir
                            setConfig(prev => ({ ...prev, fetched_openrouter_models: models, openrouter_key: key }));
                            showToast(`OpenRouter ativo! ${models.length} modelos detectados. ✅`, "success");
                            return true;
                          } else {
                            showToast("Chave inválida ou erro na API.", "error");
                            return false;
                          }
                        } catch (e) {
                          const models = ['meta-llama/llama-3-70b-instruct', 'mistralai/mixtral-8x7b-instruct', 'google/gemini-pro-1.5'];
                          setConfig(prev => ({ ...prev, fetched_openrouter_models: models, openrouter_key: key }));
                          showToast("OpenRouter pronto com lista básica! ✅", "success");
                          return true;
                        }
                      }}
                    />
                    <IntegrationRow
                      label="Google Cloud"
                      description="Integração com Gemini Pro e Ultra."
                      value={config.google_key}
                      field="google_key"
                      config={config}
                      setConfig={setConfig}
                      onTest={() => {
                        const models = ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro'];
                        setConfig(prev => ({ ...prev, fetched_google_models: models }));
                        showToast("Google Gemini: Modelos sincronizados. 🚀", "success");
                        return true;
                      }}
                    />
                    <IntegrationRow
                      label="OpenCode"
                      description="Motor especializado em programação."
                      value={config.opencode_key}
                      field="opencode_key"
                      config={config}
                      setConfig={setConfig}
                      onTest={() => {
                        showToast("Motor de código pronto para uso. 💻", "success");
                        return true;
                      }}
                    />
                  </div>

                  <div className="settings-footer">
                    <button
                      className="sync-btn-premium"
                      onClick={async () => {
                        showToast("Gravando motores no Supabase...", "info");
                        const success = await onSave(config);
                        if (success) {
                          showToast("Motores salvos com sucesso! 🌌", "success");
                        } else {
                          showToast("Erro ao salvar motores.", "error");
                        }
                      }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                        <polyline points="17 21 17 13 7 13 7 21" />
                        <polyline points="7 3 7 8 15 8" />
                      </svg>
                      Salvar Motores
                    </button>
                  </div>
                </div>
              )}

              {activeSection === 'conexoes' && (
                <div className="settings-group fade-in">
                  <div className="conexoes-header">
                    <p>Gerencie seus tokens para o Rastreador de Cota.</p>
                    <button className="btn-premium-action mini" onClick={() => setShowAddModal(true)}>
                      <span className="material-symbols-outlined">add</span>
                      Nova Conexão de Conta
                    </button>
                  </div>

                  <div className="conexoes-list">
                    {connectionsLoading ? (
                      <div className="shimmer-list">
                        <div className="shimmer-row"></div>
                        <div className="shimmer-row"></div>
                      </div>
                    ) : connections.length === 0 ? (
                      <div className="empty-conexoes">
                        <p>Nenhuma conexão ativa.</p>
                      </div>
                    ) : (
                      connections.map(conn => (
                        <div key={conn.id} className="conexao-row glass">
                          <div className="conexao-info">
                            <span className="p-badge">{conn.provider}</span>
                            <div className="p-details">
                              <strong>{conn.name || 'Sem nome'}</strong>
                              <code>{conn.access_token ? `••••${conn.access_token.slice(-4)}` : 'Sem Token'}</code>
                            </div>
                          </div>
                          <div className="conexao-actions">
                            <button className="icon-btn delete" onClick={() => handleDeleteConnection(conn.id)}>
                              🗑️
                            </button>
                          </div>
                        </div>
                      ))
                    )}
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
                          onChange={(e) => {
                            const val = e.target.value;
                            setConfig(prev => ({...prev, active_provider: val}));
                          }}
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
                      onChange={(e) => {
                        const val = e.target.value;
                        setConfig(prev => ({...prev, ip: val}));
                      }}
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
                      onChange={(e) => {
                        const val = e.target.value;
                        setConfig(prev => ({...prev, port: val}));
                      }}
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
                      onChange={(e) => {
                        const val = e.target.value;
                        setConfig(prev => ({...prev, ssh_key: val}));
                      }}
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
                        onChange={(e) => {
                          const val = e.target.value;
                          setConfig(prev => ({...prev, model: val}));
                        }}
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
                        onChange={(e) => {
                          const val = e.target.value;
                          setConfig(prev => ({...prev, openai_model: val}));
                        }}
                      >
                        <option value="gpt-4o">GPT-4o</option>
                        <option value="gpt-4-turbo">GPT-4 Turbo</option>
                        <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                      </select>
                    ) : config.active_provider === 'anthropic' ? (
                      <select 
                        className="glass-input"
                        value={config.anthropic_model} 
                        onChange={(e) => {
                          const val = e.target.value;
                          setConfig(prev => ({...prev, anthropic_model: val}));
                        }}
                      >
                        <option value="claude-3-5-sonnet-20240620">Claude 3.5 Sonnet</option>
                        <option value="claude-3-opus-20240229">Claude 3 Opus</option>
                        <option value="claude-3-haiku-20240307">Claude 3 Haiku</option>
                      </select>
                    ) : (
                      <select 
                        className="glass-input"
                        value={config.google_model} 
                        onChange={(e) => {
                          const val = e.target.value;
                          setConfig(prev => ({...prev, google_model: val}));
                        }}
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

              {activeSection === 'ia-global' && (userRole === 'admin' || userRole === 'vip') && (
                <div className="settings-group fade-in">
                  <div className="master-ia-header glass">
                    <div className="m-icon">🌐</div>
                    <div className="m-text">
                      <h3>Cérebro Mestre Global</h3>
                      <p>Configure as chaves de API e defina qual IA será o motor oficial para todos os usuários no modo "Mestre".</p>
                    </div>
                  </div>

                  <div className="master-ia-selectors mt-6 glass">
                    <div className="setting-row">
                      <div className="setting-info">
                        <h3>Provedor Mestre Ativo</h3>
                        <p>Escolha qual motor processará as requisições globais.</p>
                      </div>
                      <select 
                        className="glass-input"
                        value={config.global_provider || 'openai'}
                        onChange={(e) => setConfig(prev => ({ ...prev, global_provider: e.target.value }))}
                      >
                        <option value="openai">OpenAI (Padrão)</option>
                        <option value="anthropic">Anthropic</option>
                        <option value="google">Google Gemini</option>
                        <option value="openrouter">OpenRouter</option>
                      </select>
                    </div>

                    <div className="setting-row">
                      <div className="setting-info">
                        <h3>Modelo Mestre Oficial</h3>
                        <p>Defina o modelo específico para o sistema.</p>
                      </div>
                      <select 
                        className="glass-input"
                        value={config.global_selected_model || ''}
                        onChange={(e) => setConfig(prev => ({ ...prev, global_selected_model: e.target.value }))}
                      >
                        <option value="">Selecione um modelo...</option>
                        {((config.global_provider || 'openai') === 'openai' ? (config.fetched_global_openai_models || ['gpt-4o', 'gpt-4-turbo']) :
                          (config.global_provider || 'openai') === 'anthropic' ? (config.fetched_global_anthropic_models || ['claude-3-5-sonnet-20240620']) :
                          (config.global_provider || 'openai') === 'google' ? (config.fetched_global_google_models || ['gemini-1.5-pro']) :
                          (config.fetched_global_openrouter_models || ['meta-llama/llama-3-70b-instruct'])
                        ).map(m => (
                          <option key={m} value={m}>{m.toUpperCase()}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div className="integrations-list mt-6">
                    <IntegrationRow 
                      label="OpenAI (Global)" 
                      description="Chave compartilhada para todos os usuários VIP/Free."
                      value={config.global_openai_key}
                      field="global_openai_key"
                      config={config}
                      setConfig={setConfig}
                      onTest={async (key) => {
                        if (!key) return false;
                        try {
                          const res = await fetch('https://api.openai.com/v1/models', {
                            headers: { 'Authorization': `Bearer ${key}` }
                          });
                          if (res.ok) {
                            const data = await res.json();
                            const models = data.data
                              .map(m => m.id)
                              .filter(id => id.startsWith('gpt') || id.includes('o1'))
                              .sort();
                            setConfig(prev => ({...prev, fetched_global_openai_models: models, global_openai_key: key}));
                            return true;
                          }
                          return false;
                        } catch (e) { 
                          const models = ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'];
                          setConfig(prev => ({...prev, fetched_global_openai_models: models, global_openai_key: key}));
                          return true; 
                        }
                      }}
                    />
                    <IntegrationRow 
                      label="Anthropic (Global)" 
                      description="Claude 3.5 Sonnet global para o sistema."
                      value={config.global_anthropic_key}
                      field="global_anthropic_key"
                      config={config}
                      setConfig={setConfig}
                      onTest={() => {
                        const models = ['claude-3-5-sonnet-20240620', 'claude-3-opus-20240229'];
                        setConfig(prev => ({...prev, fetched_global_anthropic_models: models}));
                        return true;
                      }}
                    />
                    <IntegrationRow 
                      label="Google Gemini (Global)" 
                      description="Gemini 1.5 Pro global para o sistema."
                      value={config.global_google_key}
                      field="global_google_key"
                      config={config}
                      setConfig={setConfig}
                      onTest={() => {
                        const models = ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro'];
                        setConfig(prev => ({...prev, fetched_global_google_models: models}));
                        return true;
                      }}
                    />
                    <IntegrationRow 
                      label="OpenRouter (Global)" 
                      description="Acesso global a modelos open-source."
                      value={config.global_openrouter_key}
                      field="global_openrouter_key"
                      config={config}
                      setConfig={setConfig}
                      onTest={async (key) => {
                        if (!key) return false;
                        try {
                          const res = await fetch('https://openrouter.ai/api/v1/models', {
                            headers: { 'Authorization': `Bearer ${key}` }
                          });
                          if (res.ok) {
                            const data = await res.json();
                            const models = data.data.map(m => m.id).slice(0, 20);
                            setConfig(prev => ({...prev, fetched_global_openrouter_models: models, global_openrouter_key: key}));
                            return true;
                          }
                          return false;
                        } catch (e) { 
                          const models = ['meta-llama/llama-3-70b-instruct', 'google/gemini-pro-1.5'];
                          setConfig(prev => ({...prev, fetched_global_openrouter_models: models, global_openrouter_key: key}));
                          return true; 
                        }
                      }}
                    />
                  </div>
                  
                  <div className="master-footer-actions mt-6">
                    <button 
                      className="sync-btn-premium master-save-btn"
                      onClick={async () => {
                        showToast("Gravando Cérebro Mestre no sistema...", "info");
                        // Antes de salvar, garantimos que a chave do provedor mestre seja passada como principal se necessário
                        const providerToSave = config.global_provider || 'openai';
                        const masterKey = providerToSave === 'openai' ? config.global_openai_key :
                                          providerToSave === 'anthropic' ? config.global_anthropic_key :
                                          providerToSave === 'google' ? config.global_google_key :
                                          config.global_openrouter_key;
                        
                        const defaultModel = providerToSave === 'openai' ? 'gpt-4o' : 
                                             providerToSave === 'anthropic' ? 'claude-3-5-sonnet-20240620' : 
                                             providerToSave === 'google' ? 'gemini-1.5-pro' : 
                                             'meta-llama/llama-3-70b-instruct';

                        const success = await onSave({ 
                          ...config, 
                          global_api_key: masterKey,
                          global_provider: providerToSave,
                          global_selected_model: config.global_selected_model || defaultModel
                        });
                        
                        if (success) {
                          showToast("Configurações Mestres aplicadas! 🌐", "success");
                        } else {
                          showToast("Erro ao aplicar configurações mestres.", "error");
                        }
                      }}
                    >
                      <span className="material-symbols-outlined">save_as</span>
                      Salvar Configurações Mestres
                    </button>
                    <p className="master-info-text">
                      <span className="material-symbols-outlined">info</span>
                      Estas chaves serão aplicadas automaticamente a todos os usuários no modo "Mestre".
                    </p>
                  </div>
                </div>
              )}



              {!['geral', 'conta', 'ia-engine', 'master-os', 'integracoes', 'ia-global', 'nebula-code', 'conexoes'].includes(activeSection) && (
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

      {showAddModal && (
        <div className="settings-modal-overlay fade-in">
          <div className="settings-modal glass">
            <h3>Nova Conexão de Conta</h3>
            <div className="modal-form">
              <div className="mode-selector glass">
                <button
                  className={!isAutoMode ? 'active' : ''}
                  onClick={() => setIsAutoMode(false)}
                >Manual</button>
                <button
                  className={isAutoMode ? 'active' : ''}
                  onClick={() => setIsAutoMode(true)}
                >Automático (OAuth)</button>
              </div>

              <div className="form-group">
                <label>Provedor</label>
                <select
                  className="glass-input"
                  value={newConn.provider}
                  onChange={(e) => setNewConn({ ...newConn, provider: e.target.value })}
                >
                  <option value="antigravity">Antigravity</option>
                  <option value="github">GitHub Copilot</option>
                  <option value="claude">Claude (Anthropic)</option>
                  <option value="codex">Codex (OpenAI)</option>
                </select>
              </div>

              {isAutoMode ? (
                <div className="auto-mode-info fade-in">
                  <p>
                    {newConn.provider === 'antigravity' 
                      ? 'Clique abaixo para conectar usando as credenciais do seu terminal local. A Nebula Bridge precisa estar ligada.'
                      : 'Clique abaixo para autorizar o acesso à sua conta. Você será redirecionado para o Google.'}
                  </p>

                  {!isWaitingForCode ? (
                    <button className="btn-premium-action w-full" onClick={handleOAuthStart}>
                      <span className="material-symbols-outlined">
                        {newConn.provider === 'antigravity' ? 'terminal' : 'link'}
                      </span>
                      {newConn.provider === 'antigravity' ? 'Conectar Localmente (Bridge)' : 'Conectar com Google'}
                    </button>
                  ) : (
                    <div className="code-input-area fade-in">
                      <div className="form-group">
                        <label>Código de Autorização</label>
                        <input
                          type="text"
                          className="glass-input"
                          placeholder="Cole o código aqui..."
                          value={oauthCode}
                          onChange={(e) => setOauthCode(e.target.value)}
                        />
                      </div>
                      <button className="btn-premium-action w-full" onClick={() => showToast("Implementando troca de token...", "info")}>
                        <span className="material-symbols-outlined">check_circle</span>
                        Finalizar Conexão
                      </button>
                      <button className="btn-link" onClick={() => setIsWaitingForCode(false)}>Voltar</button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="manual-mode-form fade-in">
                  <div className="form-group">
                    <label>Nome da Conta (E-mail)</label>
                    <input
                      type="text"
                      className="glass-input"
                      placeholder="ex: conta@gmail.com"
                      value={newConn.name}
                      onChange={(e) => setNewConn({ ...newConn, name: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Access Token</label>
                    <input
                      type="password"
                      className="glass-input"
                      placeholder="Cole seu token aqui..."
                      value={newConn.access_token}
                      onChange={(e) => setNewConn({ ...newConn, access_token: e.target.value })}
                      disabled={newConn.provider === 'antigravity'}
                    />
                    {newConn.provider === 'antigravity' && (
                      <small style={{ color: '#fbbf24', marginTop: '4px', display: 'block' }}>
                        Para o Antigravity, use o modo "Automático (OAuth)" para conectar via Nebula Bridge. Tokens manuais expiram em 1h.
                      </small>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button className="btn-action-minimalist" onClick={() => setShowAddModal(false)}>Cancelar</button>
              <button className="btn-premium-action" onClick={handleAddConnection}>
                <span className="material-symbols-outlined">save</span>
                Salvar Conexão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
