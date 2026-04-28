import React from 'react';
import './QuotaCard.css';

const QuotaCard = ({ connection, data, loading, error, onRefresh, onDelete, onEdit }) => {
  const getStatusColor = (percentage) => {
    if (percentage > 70) return '#10b981'; // Green
    if (percentage >= 30) return '#fbbf24'; // Yellow
    return '#ef4444'; // Red
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = date - now;
      if (diffMs <= 0) return 'Resetando...';

      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      
      if (hours > 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
      return `${hours}h ${minutes}m`;
    } catch (e) {
      return null;
    }
  };

  return (
    <div className={`premium-quota-card glass ${!connection.is_active ? 'inactive' : ''}`}>
      <div className="card-header">
        <div className="provider-info">
          <div className="provider-logo">
            {connection.provider.charAt(0).toUpperCase()}
          </div>
          <div className="provider-details">
            <h3>{connection.provider.toUpperCase()}</h3>
            <span>{connection.name || 'Conta Ativa'}</span>
          </div>
        </div>
        <div className="card-actions">
          <button onClick={() => onRefresh(connection.id)} title="Atualizar" disabled={loading}>
            <span className={`material-symbols-outlined ${loading ? 'animate-spin' : ''}`}>refresh</span>
          </button>
          <button onClick={() => onEdit(connection)} title="Editar">
            <span className="material-symbols-outlined">edit</span>
          </button>
          <button onClick={() => onDelete(connection.id)} title="Excluir" className="btn-delete">
            <span className="material-symbols-outlined">delete</span>
          </button>
        </div>
      </div>

      <div className="card-content">
        {loading ? (
          <div className="loading-state">
            <div className="shimmer"></div>
            <div className="shimmer"></div>
          </div>
        ) : error ? (
          <div className="error-state">
            <span className="material-symbols-outlined">error</span>
            <p>{error.includes('Failed to fetch') || error.includes('Proxy') ? 'A Nebula Bridge está desligada. Execute "npm run bridge" no terminal.' : error}</p>
          </div>
        ) : data?.quotas?.length > 0 ? (
          <div className="quota-list">
            {data.quotas.map((quota, idx) => {
              const percentage = quota.percentage !== undefined 
                ? quota.percentage 
                : Math.round(((quota.total - quota.used) / (quota.total || 1)) * 100);

              const reset = formatTime(quota.resetAt);

              return (
                <div key={idx} className="quota-item">
                  <div className="quota-header">
                    <span className="quota-name">{quota.name}</span>
                    <span className="quota-values">
                      {quota.isUnlimited ? '∞ Ilimitado' : `${quota.total - quota.used} / ${quota.total}`}
                    </span>
                  </div>
                  <div className="progress-container">
                    <div 
                      className={`progress-bar ${quota.isUnlimited ? 'unlimited' : ''}`} 
                      style={{ 
                        width: quota.isUnlimited ? '100%' : `${percentage}%`,
                        backgroundColor: quota.isUnlimited ? '#8b5cf6' : getStatusColor(percentage)
                      }}
                    ></div>
                  </div>
                  <div className="quota-footer">
                    <span className="percentage">{quota.isUnlimited ? 'Plano Enterprise' : `${percentage}% disponível`}</span>
                    {reset && <span className="reset-time">Reseta em {reset}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <p>{data?.message || 'Nenhum dado de cota disponível'}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuotaCard;
