import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { observabilityService } from '../services/observabilityService';
import { projectService } from '../services/projectService';
import './TenantHealthPage.css';

const TenantHealthPage = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Dados do monitoramento
  const [tenants, setTenants] = useState([]);
  const [heartbeats, setHeartbeats] = useState([]);
  
  // Abas e filtros
  const [activeTab, setActiveTab] = useState('tenants'); // 'tenants' | 'heartbeats'
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'unstable' | 'offline'

  // Estado de execução da varredura de timeouts
  const [checkingHeartbeats, setCheckingHeartbeats] = useState(false);
  const [checkResult, setCheckResult] = useState(null);

  // Carrega lista de projetos monitorados no início
  useEffect(() => {
    projectService.getProjects()
      .then(setProjects)
      .catch(err => console.warn('⚠️ Falha ao carregar lista de projetos:', err));
  }, []);

  // Função para buscar os dados de integridade e heartbeats
  const fetchHealthData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Buscar os scores de saúde dos tenants
      const scores = await observabilityService.getTenantHealthScores(selectedProjectId);
      
      // 2. Buscar o histórico de heartbeats ativos
      const hbs = await observabilityService.getServiceHeartbeats(selectedProjectId);

      setTenants(scores);
      setHeartbeats(hbs);
    } catch (err) {
      console.error('Erro ao buscar dados de saúde dos clientes:', err);
      setError(err.message || 'Falha ao recuperar dados do Supabase.');
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    fetchHealthData();
  }, [fetchHealthData]);

  // Executa manualmente a rotina de checagem de heartbeats chamando a Edge Function
  const handleTriggerCheck = async () => {
    setCheckingHeartbeats(true);
    setCheckResult(null);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      // O endpoint precisa da autorização service role no ambiente real,
      // mas na nossa Edge Function configuramos para ler do banco ou token.
      // Vamos chamar a Edge Function 'check-heartbeats'.
      const response = await fetch(`${supabaseUrl}/functions/v1/check-heartbeats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}` // Ou sem autorização se a function estiver aberta / com chave no handler
        }
      });

      if (!response.ok) {
        throw new Error(`Falha na execução: HTTP ${response.status}`);
      }

      const data = await response.json();
      setCheckResult(data);
      
      // Atualiza os dados locais para exibir as atualizações imediatamente
      fetchHealthData();

      // Limpa mensagem de resultado após 5 segundos
      setTimeout(() => setCheckResult(null), 5000);
    } catch (err) {
      console.error('Erro ao disparar varredura de heartbeats:', err);
      alert('Falha ao disparar varredura de heartbeats: ' + err.message);
    } finally {
      setCheckingHeartbeats(false);
    }
  };

  // Funções utilitárias de formatação
  const getHealthColorClass = (score) => {
    if (score >= 95) return 'health-excellent';
    if (score >= 85) return 'health-good';
    if (score >= 70) return 'health-warning';
    return 'health-critical';
  };

  const getRelativeTime = (isoString) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMin = Math.round(diffMs / (1000 * 60));
    
    if (diffMin < 1) return 'agora mesmo';
    if (diffMin === 1) return 'há 1 minuto';
    if (diffMin < 60) return `há ${diffMin} minutos`;
    
    const diffHours = Math.round(diffMin / 60);
    if (diffHours === 1) return 'há 1 hora';
    if (diffHours < 24) return `há ${diffHours} horas`;
    
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  // Filtros aplicados sobre a lista de Tenants
  const filteredTenants = tenants.filter(t => {
    const matchesSearch = t.tenant_name.toLowerCase().includes(searchFilter.toLowerCase()) || 
                          t.tenant_id.toLowerCase().includes(searchFilter.toLowerCase());
    
    const associatedHbs = heartbeats.filter(h => h.tenant_id === t.tenant_id);
    const hasOfflineService = associatedHbs.some(h => h.status === 'offline');

    const matchesStatus = 
      statusFilter === 'all' ||
      (statusFilter === 'unstable' && t.health_score < 90) ||
      (statusFilter === 'offline' && hasOfflineService);

    return matchesSearch && matchesStatus;
  });

  // Filtros aplicados sobre a lista de Heartbeats
  const filteredHeartbeats = heartbeats.filter(h => {
    const matchesSearch = h.tenant_name.toLowerCase().includes(searchFilter.toLowerCase()) ||
                          h.service.toLowerCase().includes(searchFilter.toLowerCase());
    
    const matchesStatus = 
      statusFilter === 'all' ||
      (statusFilter === 'offline' && h.status === 'offline') ||
      (statusFilter === 'unstable' && h.status === 'offline'); // Para heartbeats, offline é a única instabilidade

    return matchesSearch && matchesStatus;
  });

  // Contagem de métricas agregadas do topo
  const totalTenants = tenants.length;
  const criticalTenantsCount = tenants.filter(t => {
    const associatedHbs = heartbeats.filter(h => h.tenant_id === t.tenant_id);
    const hasOfflineService = associatedHbs.some(h => h.status === 'offline');
    return t.health_score < 85 || hasOfflineService;
  }).length;
  
  const averageScore = tenants.length > 0
    ? Math.round(tenants.reduce((sum, t) => sum + t.health_score, 0) / tenants.length)
    : 100;

  return (
    <div className="page-container tenant-health-page fade-in">
      {/* Header */}
      <header className="page-header">
        <div className="header-content">
          <h1>Saúde dos <span>Clientes (SaaS)</span></h1>
          
          <div className="project-selector-header">
            <span className="material-symbols-outlined folder-icon">folder</span>
            <select 
              value={selectedProjectId} 
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="project-select-dropdown"
            >
              <option value="all">Todos os Projetos</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="header-actions">
          <button 
            className={`btn-premium-action scan-btn ${checkingHeartbeats ? 'loading' : ''}`}
            onClick={handleTriggerCheck}
            disabled={checkingHeartbeats}
          >
            <span className="material-symbols-outlined spin-icon">sync_alt</span>
            {checkingHeartbeats ? 'Varrendo timeouts...' : 'Varrer Inatividade'}
          </button>
          <button className="btn-premium-action glass" onClick={fetchHealthData} disabled={loading}>
            <span className="material-symbols-outlined">sync</span>
            Atualizar
          </button>
        </div>
      </header>

      {/* Alerta de Retorno da Varredura */}
      {checkResult && (
        <div className="check-result-alert glass fade-in">
          <span className="material-symbols-outlined success-icon">check_circle</span>
          <p>
            Varredura executada! <strong>{checkResult.timeouts_detected}</strong> timeouts de heartbeat identificados e alertados.
          </p>
        </div>
      )}

      {/* Cards de Métricas de Negócio/SaaS */}
      <div className="health-stats-grid">
        <div className="stat-card glass">
          <div className="stat-icon tenants-count">
            <span className="material-symbols-outlined">groups</span>
          </div>
          <div className="stat-info">
            <h3>Clientes Monitorados</h3>
            <div className="stat-value">{totalTenants}</div>
            <div className="stat-label">Clientes ativos nas últimas 24h</div>
          </div>
        </div>

        <div className="stat-card glass">
          <div className="stat-icon health-average">
            <span className="material-symbols-outlined">favorite</span>
          </div>
          <div className="stat-info">
            <h3>Score de Integridade Geral</h3>
            <div className={`stat-value ${averageScore < 90 ? 'text-yellow' : 'text-green'}`}>
              {averageScore}%
            </div>
            <div className="stat-label">Média das taxas de sucesso operacionais</div>
          </div>
        </div>

        <div className="stat-card glass">
          <div className="stat-icon tenants-critical">
            <span className="material-symbols-outlined">warning</span>
          </div>
          <div className="stat-info">
            <h3>Clientes Críticos / Offline</h3>
            <div className={`stat-value ${criticalTenantsCount > 0 ? 'text-red' : ''}`}>
              {criticalTenantsCount}
            </div>
            <div className="stat-label">Score &lt; 85% ou serviços offline</div>
          </div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="filters-bar glass">
        <div className="search-input-wrapper">
          <span className="material-symbols-outlined search-icon">search</span>
          <input 
            type="text" 
            placeholder="Buscar por nome do cliente ou ID..." 
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
          />
        </div>

        <div className="filters-group">
          <div className="select-wrapper">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">Todos os Status</option>
              <option value="unstable">Apenas Instáveis (Score &lt; 90%)</option>
              <option value="offline">Apenas com Serviços Offline</option>
            </select>
          </div>

          <div className="tab-group inline-tabs">
            <button
              className={`tab-btn ${activeTab === 'tenants' ? 'active' : ''}`}
              onClick={() => setActiveTab('tenants')}
            >
              <span className="material-symbols-outlined">grid_view</span>
              Clientes
            </button>
            <button
              className={`tab-btn ${activeTab === 'heartbeats' ? 'active' : ''}`}
              onClick={() => setActiveTab('heartbeats')}
            >
              <span className="material-symbols-outlined">favorite</span>
              Sinais Vitais (Heartbeats)
            </button>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      {loading ? (
        <div className="table-loading">
          <div className="nebula-spinner"></div>
          <p>Carregando telemetria de clientes...</p>
        </div>
      ) : error ? (
        <div className="error-state-box">
          <span className="material-symbols-outlined text-red">warning</span>
          <p>Erro ao carregar dados: {error}</p>
        </div>
      ) : activeTab === 'tenants' ? (
        // ── ABA CLIENTES ───────────────────────────────────────────
        filteredTenants.length === 0 ? (
          <div className="empty-state-box glass">
            <span className="material-symbols-outlined">filter_list_off</span>
            <p>Nenhum cliente encontrado para as condições selecionadas.</p>
          </div>
        ) : (
          <div className="tenants-grid">
            {filteredTenants.map((t) => {
              const clientHbs = heartbeats.filter(h => h.tenant_id === t.tenant_id);
              const colorClass = getHealthColorClass(t.health_score);
              
              return (
                <div key={t.tenant_id} className={`tenant-card glass ${colorClass}`}>
                  <div className="tenant-card-header">
                    <div className="tenant-info">
                      <h3>{t.tenant_name}</h3>
                      <span className="tenant-id">ID: <code>{t.tenant_id.substring(0, 13)}...</code></span>
                    </div>
                    <div className={`tenant-score-badge ${colorClass}`}>
                      {t.health_score}%
                    </div>
                  </div>

                  {/* Barra de Progresso Neon */}
                  <div className="health-bar-container">
                    <div 
                      className={`health-bar-fill ${colorClass}`}
                      style={{ width: `${t.health_score}%` }}
                    ></div>
                  </div>

                  {/* Detalhes de Eventos */}
                  <div className="tenant-events-info">
                    <span className="event-item">
                      <strong>{t.total_events}</strong> reqs
                    </span>
                    <span className={`event-item ${t.error_events > 0 ? 'text-red' : ''}`}>
                      <strong>{t.error_events}</strong> erros
                    </span>
                  </div>

                  {/* Serviços Monitorados atrelados */}
                  <div className="tenant-services-list">
                    <span className="services-title">Integradores / Serviços:</span>
                    {clientHbs.length === 0 ? (
                      <span className="no-services-text">Nenhum heartbeat ativado</span>
                    ) : (
                      <div className="services-badge-container">
                        {clientHbs.map(h => (
                          <span 
                            key={h.id} 
                            className={`service-status-tag ${h.status}`}
                            title={`Último sinal: ${new Date(h.last_seen).toLocaleString()}`}
                          >
                            <span className="status-dot"></span>
                            {h.service}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        // ── ABA HEARTBEATS / SINAIS VITAIS ─────────────────────────────
        filteredHeartbeats.length === 0 ? (
          <div className="empty-state-box glass">
            <span className="material-symbols-outlined">notifications_off</span>
            <p>Nenhum sinal vital/heartbeat ativo registrado.</p>
          </div>
        ) : (
          <div className="heartbeats-table-wrapper glass">
            <table className="heartbeats-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Serviço / Integrador</th>
                  <th>Cliente (Tenant)</th>
                  <th>Última Resposta</th>
                  <th>Timeout de Alerta</th>
                  <th>Atualizado Em</th>
                </tr>
              </thead>
              <tbody>
                {filteredHeartbeats.map((hb) => (
                  <tr key={hb.id} className={`heartbeat-row ${hb.status}`}>
                    <td className="status-cell">
                      <span className={`status-pill ${hb.status}`}>
                        <span className="status-dot"></span>
                        {hb.status.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <span className="service-tag">{hb.service}</span>
                    </td>
                    <td className="tenant-cell">
                      <strong>{hb.tenant_name || hb.tenant_id}</strong>
                      <span className="tenant-id-sub">ID: {hb.tenant_id}</span>
                    </td>
                    <td className="time-cell">
                      {getRelativeTime(hb.last_seen)}
                      <span className="time-sub">{new Date(hb.last_seen).toLocaleString()}</span>
                    </td>
                    <td className="timeout-cell">
                      <span className="material-symbols-outlined mini-icon">timer</span>
                      {hb.timeout_minutes} min
                    </td>
                    <td className="updated-cell">
                      {new Date(hb.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
};

export default TenantHealthPage;
