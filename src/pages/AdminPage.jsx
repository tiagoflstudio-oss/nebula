import React, { useState, useEffect } from 'react';

const AdminPage = ({ config }) => {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('offline');

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await fetch(`http://${config.ip}:${config.port}/api/tags`);
        if (response.ok) {
          const data = await response.json();
          setModels(data.models || []);
          setStatus('online');
        } else {
          setStatus('error');
        }
      } catch (error) {
        setStatus('offline');
      } finally {
        setLoading(false);
      }
    };

    fetchModels();
  }, [config]);

  return (
    <div className="admin-page-container fade-in">
      <div className="admin-header glass">
        <h2>Painel de Administração AI</h2>
        <div className={`status-badge ${status}`}>
          {status.toUpperCase()}
        </div>
      </div>

      <div className="admin-grid">
        <div className="admin-card glass">
          <h3>Estatísticas do Servidor</h3>
          <div className="stat-row">
            <span>Uptime</span>
            <span>99.9%</span>
          </div>
          <div className="stat-row">
            <span>Modelos Instalados</span>
            <span>{models.length}</span>
          </div>
          <div className="stat-row">
            <span>Localização</span>
            <span>{config.ip}:{config.port}</span>
          </div>
        </div>

        <div className="admin-card glass wide">
          <h3>Modelos Disponíveis</h3>
          {loading ? (
            <p>Carregando modelos...</p>
          ) : (
            <div className="model-list">
              {models.length > 0 ? models.map((m, i) => (
                <div key={i} className="model-item glass">
                  <div className="model-info">
                    <strong>{m.name}</strong>
                    <span>{Math.round(m.size / (1024 * 1024 * 1024) * 100) / 100} GB</span>
                  </div>
                  <button className="btn-action">Gerenciar</button>
                </div>
              )) : (
                <p className="error-text">Nenhum modelo encontrado. Verifique a conexão com o Ollama.</p>
              )}
            </div>
          )}
        </div>

        <div className="admin-card glass">
          <h3>Controle do Servidor</h3>
          <div className="control-group">
            <button className="btn-control glass">Reiniciar Ollama</button>
            <button className="btn-control glass">Limpar Cache</button>
            <button className="btn-control danger glass">Parar Instância</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
