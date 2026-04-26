import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import QuotaCard from '../components/QuotaCard';
import { getUsageForProvider } from '../services/quotaService';
import './QuotaPage.css';

const QuotaPage = ({ onNavigate }) => {
  const [connections, setConnections] = useState([]);
  const [quotaData, setQuotaData] = useState({});
  const [loading, setLoading] = useState(true);
  const [cardLoading, setCardLoading] = useState({});
  const [cardErrors, setCardErrors] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchConnections();
  }, []);

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
          <button className="btn-premium-action" onClick={handleRefreshAll} disabled={loading}>
            <span className="material-symbols-outlined">sync</span>
            Atualizar Tudo
          </button>
        </div>
      </header>

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
    </div>
  );
};

export default QuotaPage;
