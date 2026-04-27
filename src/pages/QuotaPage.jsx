import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import QuotaCard from '../components/QuotaCard';
import { getUsageForProvider } from '../services/quotaService';
import { getUserQuota, getUsageHistory } from '../services/usageService';
import './QuotaPage.css';

const QuotaPage = ({ onNavigate }) => {
  const [connections, setConnections] = useState([]);
  const [quotaData, setQuotaData] = useState({});
  const [loading, setLoading] = useState(true);
  const [cardLoading, setCardLoading] = useState({});
  const [cardErrors, setCardErrors] = useState({});
  const [systemQuota, setSystemQuota] = useState(null);
  const [usageHistory, setUsageHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('external'); // 'external' or 'system'
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchConnections();
    fetchSystemUsage();
  }, []);

  const fetchSystemUsage = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        const quota = await getUserQuota(session.user.id);
        const history = await getUsageHistory(session.user.id);
        setSystemQuota(quota);
        setUsageHistory(history);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchConnections = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('provider_connections')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setConnections(data || []);
      
      // Fetch initial quotas
      data?.forEach(conn => {
        if (conn.is_active) {
          fetchQuota(conn);
        }
      });
    } catch (err) {
      console.error('Erro ao buscar conexões:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchQuota = async (connection) => {
    setCardLoading(prev => ({ ...prev, [connection.id]: true }));
    setCardErrors(prev => ({ ...prev, [connection.id]: null }));
    try {
      const usage = await getUsageForProvider(connection);
      if (usage.error) {
        setCardErrors(prev => ({ ...prev, [connection.id]: usage.error }));
      } else {
        setQuotaData(prev => ({ ...prev, [connection.id]: usage }));
        // Se a cota veio, pode ser que o token tenha sido renovado silenciosamente
        // Vamos atualizar as conexões em segundo plano
        const { data } = await supabase
          .from('provider_connections')
          .select('*')
          .order('created_at', { ascending: false });
        if (data) setConnections(data);
      }
    } catch (err) {
      console.error(`Erro na cota de ${connection.provider}:`, err);
      setCardErrors(prev => ({ ...prev, [connection.id]: err.message }));
    } finally {
      setCardLoading(prev => ({ ...prev, [connection.id]: false }));
    }
  };

  const handleRefreshAll = () => {
    connections.forEach(conn => {
      if (conn.is_active) fetchQuota(conn);
    });
  };

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja excluir esta conexão?')) return;
    try {
      const { error } = await supabase
        .from('provider_connections')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setConnections(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      alert('Erro ao excluir: ' + err.message);
    }
  };

  return (
    <div className="page-container quota-page fade-in">
      <header className="page-header">
        <div className="header-content">
          <h1>Rastreador de <span>Cota</span></h1>
          <p>Monitore e gerencie seus limites de uso das APIs de IA.</p>
        </div>
        <div className="header-actions">
          <div className="tab-switcher glass">
            <button 
              className={activeTab === 'external' ? 'active' : ''} 
              onClick={() => setActiveTab('external')}
            >
              Contas Externas
            </button>
            <button 
              className={activeTab === 'system' ? 'active' : ''} 
              onClick={() => setActiveTab('system')}
            >
              Consumo Nebula
            </button>
          </div>
          <button className="btn-premium-action" onClick={() => { handleRefreshAll(); fetchSystemUsage(); }} disabled={loading}>
            <span className="material-symbols-outlined">sync</span>
            Atualizar
          </button>
        </div>
      </header>

      {error && (
        <div className="quota-error-alert glass fade-in">
          <span className="material-symbols-outlined">warning</span>
          <p>Erro ao carregar dados: {error}. Certifique-se de que as tabelas no Supabase foram criadas.</p>
          <button onClick={() => { setError(null); fetchConnections(); fetchSystemUsage(); }}>Tentar Novamente</button>
        </div>
      )}

      {activeTab === 'system' && (

        <div className="system-usage-container fade-in">
          <div className="usage-stats-grid">
            <div className="stat-card glass">
              <div className="stat-icon tokens">🪙</div>
              <div className="stat-info">
                <h3>Tokens Totais</h3>
                <div className="stat-value">{(systemQuota?.used_tokens || 0).toLocaleString()}</div>
                <div className="stat-label">Consumidos desde o início</div>
              </div>
            </div>
            <div className="stat-card glass">
              <div className="stat-icon limit">🎯</div>
              <div className="stat-info">
                <h3>Limite Mensal</h3>
                <div className="stat-value">{(systemQuota?.total_limit || 0).toLocaleString()}</div>
                <div className="stat-label">Tokens disponíveis no plano</div>
              </div>
            </div>
            <div className="stat-card glass">
              <div className="stat-icon progress">📊</div>
              <div className="stat-info">
                <h3>Progresso do Uso</h3>
                <div className="progress-bar-container">
                  <div 
                    className="progress-bar-fill" 
                    style={{ width: `${Math.min(100, ((systemQuota?.used_tokens || 0) / (systemQuota?.total_limit || 1)) * 100)}%` }}
                  ></div>
                </div>
                <div className="stat-label">
                  {Math.round(((systemQuota?.used_tokens || 0) / (systemQuota?.total_limit || 1)) * 100)}% da cota utilizada
                </div>
              </div>
            </div>
          </div>

          <div className="history-section glass">
            <div className="section-header">
              <h2><span className="material-symbols-outlined">history</span> Histórico Recente</h2>
            </div>
            <div className="history-table-wrapper">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Provedor</th>
                    <th>Modelo</th>
                    <th>Tokens</th>
                    <th>Custo Est.</th>
                  </tr>
                </thead>
                <tbody>
                  {usageHistory.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="empty-row">Nenhum uso registrado ainda.</td>
                    </tr>
                  ) : (
                    usageHistory.map((log) => (
                      <tr key={log.id}>
                        <td>{new Date(log.created_at).toLocaleString()}</td>
                        <td><span className={`badge ${log.provider}`}>{log.provider}</span></td>
                        <td>{log.model}</td>
                        <td><strong>{log.total_tokens.toLocaleString()}</strong></td>
                        <td className="cost-cell">${Number(log.cost).toFixed(4)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'external' && (
        <>

      {loading ? (
        <div className="page-loading">
          <div className="nebula-spinner"></div>
          <p>Carregando conexões...</p>
        </div>
      ) : connections.length === 0 ? (
        <div className="empty-state-container glass">
          <span className="material-symbols-outlined icon">cloud_off</span>
          <h3>Nenhum Provedor Conectado</h3>
          <p>Cadastre seus tokens nas configurações para rastrear suas cotas.</p>
          <button className="btn-premium-action" onClick={onNavigate}>
            Ir para Configurações
          </button>
        </div>
      ) : (
        <div className="quota-grid">
          {connections.map(conn => (
            <QuotaCard
              key={conn.id}
              connection={conn}
              data={quotaData[conn.id]}
              loading={cardLoading[conn.id]}
              error={cardErrors[conn.id]}
              onRefresh={() => fetchQuota(conn)}
              onDelete={handleDelete}
              onEdit={(c) => onNavigate()}
            />
          ))}
        </div>
      )}
    </>
  )}
</div>
  );
};

export default QuotaPage;
