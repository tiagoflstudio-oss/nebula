import React, { useState } from 'react';

const SettingsPage = () => {
  const [activeSection, setActiveSection] = useState('geral');

  const menuItems = [
    { id: 'geral', label: 'Geral' },
    { id: 'conta', label: 'Conta' },
    { id: 'privacidade', label: 'Privacidade' },
    { id: 'cobranca', label: 'Cobrança' },
    { id: 'capacidades', label: 'Capacidades' },
    { id: 'conectores', label: 'Conectores' },
    { id: 'nebula-code', label: 'Nebula Code' },
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
                  <div className="user-card glass">
                    <div className="user-avatar large">T</div>
                    <div className="user-details">
                      <h3>tiago</h3>
                      <p>tiagoflstudio@gmail.com</p>
                      <span className="badge">Plano Gratuito</span>
                    </div>
                    <button className="btn-secondary">Sair da conta</button>
                  </div>
                </div>
              )}

              {/* Outras seções podem ser implementadas conforme a necessidade */}
              {activeSection !== 'geral' && activeSection !== 'conta' && (
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
