import React, { useState, useEffect } from 'react';
import { masterService } from '../services/masterService';
import './MasterOSPage.css';

const MasterOSPage = ({ config, setConfig, onSave, globalSettings, session }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [realStats, setRealStats] = useState({
    activeConnections: 0,
    clientCount: 0,
    totalTokens24h: 0,
    performance: '100%'
  });
  const [providers, setProviders] = useState([]);
  const [activities, setActivities] = useState([]);
  const [clients, setClients] = useState([]);
  const [providerTokens, setProviderTokens] = useState({});

  useEffect(() => {
    if (activeTab === 'dashboard') fetchDashboardData();
    if (activeTab === 'clientes') fetchClients();
  }, [activeTab]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [stats, provs, acts] = await Promise.all([
        masterService.getGlobalStats(),
        masterService.getProvidersStatus(),
        masterService.getRecentActivity()
      ]);
      
      // Sincroniza visualmente com as chaves configuradas no Cérebro Mestre (IA Global)
      const mergedProvs = provs.map(p => {
        const isGlobalMaster = globalSettings?.global_api_key && globalSettings?.global_provider === p.id;
        const hasDirectKey = !!globalSettings?.[`global_${p.id}_key`];
        
        if (isGlobalMaster || hasDirectKey) {
          return { ...p, status: 'online' };
        }
        return p;
      });
      
      if (stats) setRealStats(stats);
      setProviders(mergedProvs);
      setActivities(acts);
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    setLoading(true);
    const data = await masterService.getClients();
    setClients(data);
    setLoading(false);
  };

  const handleSaveConnection = async (provider) => {
    const token = providerTokens[provider];
    if (!token) return alert('Insira um token válido');
    if (!session?.user?.id) return alert('Usuário não autenticado');
    
    setLoading(true);
    const res = await masterService.saveProviderConnection(session.user.id, provider, token, []);
    if (res.success) {
      alert('Conexão salva com sucesso!');
      fetchDashboardData();
    } else {
      alert('Erro: ' + res.error);
    }
    setLoading(false);
  };

  const handleUpdateLimit = async (userId, currentLimit) => {
    const newLimit = prompt('Novo limite de tokens:', currentLimit);
    if (newLimit === null) return;
    
    setLoading(true);
    const res = await masterService.updateUserQuota(userId, parseInt(newLimit));
    if (res.success) {
      fetchClients();
    } else {
      alert('Erro ao atualizar limite');
    }
    setLoading(false);
  };

  const statsDisplay = [
    { label: 'Usuários Online', value: realStats.activeConnections.toString(), icon: 'monitoring', color: '#10b981' },
    { label: 'Clientes Master', value: realStats.clientCount.toString(), icon: 'group', color: '#8b5cf6' },
    { label: 'Uso de Tokens (24h)', value: realStats.totalTokens24h.toLocaleString(), icon: 'database', color: '#3b82f6' },
    { label: 'Performance Global', value: realStats.performance, icon: 'bolt', color: '#fbbf24' },
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
            <button 
              className={`btn-refresh glass ${loading ? 'spinning' : ''}`} 
              onClick={fetchDashboardData}
              disabled={loading}
            >
              <span className="material-symbols-outlined">refresh</span>
            </button>
            <button 
              className="btn-save-global glass" 
              onClick={fetchDashboardData}
              disabled={loading}
            >
              {loading ? 'Sincronizando...' : 'Sincronizar Tudo'}
            </button>
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <div className="master-dashboard fade-in">
            <div className="stats-grid">
              {statsDisplay.map((stat, i) => (
                <div key={i} className="stat-card glass" style={{ borderBottom: `3px solid ${stat.color}` }}>
                  <div className="stat-icon" style={{ color: stat.color }}>
                    <span className="material-symbols-outlined">{stat.icon}</span>
                  </div>
                  <div className="stat-info">
                    <h3>{loading ? '...' : stat.value}</h3>
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
                  {activities.length === 0 ? (
                    <p className="empty-activity">Nenhuma atividade recente.</p>
                  ) : (
                    activities.map((act) => (
                      <div key={act.id} className="activity-item">
                        <div className={`activity-dot ${act.type}`}></div>
                        <p>{act.message}</p>
                        <small>{new Date(act.timestamp).toLocaleTimeString()}</small>
                      </div>
                    ))
                  )}
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
                       <input 
                         type="password" 
                         placeholder="API Token..." 
                         className="glass-input" 
                         value={providerTokens[p.id] || ''}
                         onChange={(e) => setProviderTokens(prev => ({ ...prev, [p.id]: e.target.value }))}
                       />
                       <div className="c-models">
                         {p.models.map(m => <span key={m} className="model-tag">{m}</span>)}
                       </div>
                     </div>
                     <div className="c-footer">
                       <button className="btn-test">Testar</button>
                       <button className="btn-connect" onClick={() => handleSaveConnection(p.id)} disabled={loading}>
                         {loading ? 'Salvando...' : 'Conectar'}
                       </button>
                     </div>
                   </div>
                 ))}
             </div>
          </div>
        )}

         {activeTab === 'clientes' && (
           <div className="master-clients-list fade-in">
             <div className="section-header">
               <h3>Gestão de Usuários e Cotas</h3>
               <button className="btn-refresh" onClick={fetchClients}><span className="material-symbols-outlined">sync</span></button>
             </div>
             <div className="clients-table-wrapper glass">
               <table className="clients-table">
                 <thead>
                    <tr>
                      <th>Nome / ID</th>
                      <th>Tokens Usados</th>
                     <th>Limite Total</th>
                     <th>Ações</th>
                   </tr>
                 </thead>
                 <tbody>
                   {clients.map(client => (
                      <tr key={client.user_id}>
                        <td>
                          <strong>{client.name}</strong><br/>
                          <small style={{opacity: 0.6}}>{client.user_id}</small>
                        </td>
                        <td><strong>{client.used_tokens.toLocaleString()}</strong></td>
                       <td>{client.total_limit.toLocaleString()}</td>
                       <td>
                         <button className="btn-edit-quota" onClick={() => handleUpdateLimit(client.user_id, client.total_limit)}>
                           Alterar Limite
                         </button>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
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
