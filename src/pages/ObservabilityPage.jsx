import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '../lib/supabaseClient';
import { observabilityService } from '../services/observabilityService';
import { sentryService } from '../services/sentryService';
import { diagnoseService } from '../services/diagnoseService';
import './ObservabilityPage.css';

const ObservabilityPage = () => {
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState({ total24h: 0, errors24h: 0, topServices: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Estados de Filtro
  const [selectedService, setSelectedService] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [tenantFilter, setTenantFilter] = useState('');
  const [dateRangeOption, setDateRangeOption] = useState('24h'); // '2h', '24h', '7d', 'all'
  const [liveUpdate, setLiveUpdate] = useState(true);

  // Estados de Drill-Down / Correlação
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [correlatedEvents, setCorrelatedEvents] = useState([]);
  const [loadingCorrelation, setLoadingCorrelation] = useState(false);

  // Estados de IA (Diagnóstico)
  const [diagnosis, setDiagnosis] = useState(null);
  const [loadingDiagnosis, setLoadingDiagnosis] = useState(false);

  // Serviços únicos detectados para preencher o select de filtro
  const [availableServices, setAvailableServices] = useState(['billing', 'nfe', 'pdv-sync', 'auth', 'whatsapp', 'ai-collections']);

  const liveUpdateRef = useRef(liveUpdate);
  useEffect(() => {
    liveUpdateRef.current = liveUpdate;
  }, [liveUpdate]);

  // Função para mapear o intervalo de tempo selecionado em datas ISO
  const getDateRange = useCallback((option) => {
    const now = new Date();
    switch (option) {
      case '2h':
        return { start: new Date(now - 2 * 60 * 60 * 1000).toISOString(), end: null };
      case '24h':
        return { start: new Date(now - 24 * 60 * 60 * 1000).toISOString(), end: null };
      case '7d':
        return { start: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString(), end: null };
      case 'all':
      default:
        return null;
    }
  }, []);

  // Busca inicial e atualização de dados (Mesclando Supabase e Sentry)
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters = {
        service: selectedService,
        level: selectedLevel,
        tenant_id: tenantFilter,
        search: searchTerm,
        dateRange: getDateRange(dateRangeOption)
      };

      // 1. Busca os logs de negócio no banco Supabase
      const { data: dbLogs } = await observabilityService.getEvents(filters);

      // 2. Busca erros técnicos na API (ou mock) do Sentry
      let sentryLogs = [];
      try {
        sentryLogs = await sentryService.getRecentSentryIssues();
        
        // Aplica os filtros ativos de nível e busca nos eventos do Sentry para manter a timeline coerente
        if (selectedLevel) {
          sentryLogs = sentryLogs.filter(l => l.level === selectedLevel);
        }
        if (searchTerm) {
          sentryLogs = sentryLogs.filter(l => 
            l.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
            l.message.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }
        if (tenantFilter) {
          sentryLogs = sentryLogs.filter(l => l.tenant_id === tenantFilter);
        }
      } catch (sentryErr) {
        console.warn('⚠️ Sentry: Falha ao carregar erros técnicos:', sentryErr);
      }

      // 3. Mescla ambas as fontes e ordena por timestamp (ordem decrescente)
      const merged = [...dbLogs, ...sentryLogs].sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      );

      setEvents(merged);

      // Atualiza os serviços disponíveis dinamicamente
      const servicesInLogs = [...new Set(dbLogs.map(log => log.service))].filter(Boolean);
      setAvailableServices(prev => [...new Set([...prev, ...servicesInLogs])]);

      // Atualiza os cards de estatísticas
      const summary = await observabilityService.getSummaryStats();
      setStats(summary);
    } catch (err) {
      console.error('Erro ao buscar logs de observabilidade:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedService, selectedLevel, tenantFilter, searchTerm, dateRangeOption, getDateRange]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Efeito para o Realtime do Supabase
  useEffect(() => {
    const handleNewLog = (newLog) => {
      if (liveUpdateRef.current) {
        setEvents(prev => {
          if (prev.some(e => e.id === newLog.id)) return prev;
          const updated = [newLog, ...prev].sort((a, b) => 
            new Date(b.created_at) - new Date(a.created_at)
          );
          return updated.slice(0, 100);
        });

        // Atualiza estatísticas do topo
        setStats(prev => {
          const isErrorOrCritical = ['error', 'critical'].includes(newLog.level);
          const topServicesUpdated = [...prev.topServices];
          
          if (isErrorOrCritical && newLog.service) {
            const index = topServicesUpdated.findIndex(s => s.service === newLog.service);
            if (index !== -1) {
              topServicesUpdated[index] = { 
                ...topServicesUpdated[index], 
                count: topServicesUpdated[index].count + 1 
              };
            } else {
              topServicesUpdated.push({ service: newLog.service, count: 1 });
            }
            topServicesUpdated.sort((a, b) => b.count - a.count);
          }

          return {
            total24h: prev.total24h + 1,
            errors24h: isErrorOrCritical ? prev.errors24h + 1 : prev.errors24h,
            topServices: topServicesUpdated.slice(0, 3)
          };
        });
      }
    };

    const unsubscribe = observabilityService.subscribeToEvents(handleNewLog);
    return () => unsubscribe();
  }, []);

  // Busca logs correlacionados por trace_id nas duas fontes (Supabase e Sentry)
  const handleSelectEvent = async (event) => {
    setSelectedEvent(event);
    setDiagnosis(null); // Limpa o diagnóstico anterior ao mudar de log
    if (!event.trace_id) {
      setCorrelatedEvents([]);
      return;
    }

    setLoadingCorrelation(true);
    try {
      // 1. Busca logs correlacionados no Supabase
      const dbLogs = await observabilityService.getEventsByTraceId(event.trace_id);
      
      // 2. Busca logs correlacionados no Sentry
      let sentryLogs = [];
      try {
        const allSentry = await sentryService.getRecentSentryIssues();
        sentryLogs = allSentry.filter(l => l.trace_id === event.trace_id);
      } catch (sentryErr) {
        console.warn('Erro ao correlacionar logs do Sentry:', sentryErr);
      }

      // 3. Mescla e ordena de forma cronológica (ascendente)
      const merged = [...dbLogs, ...sentryLogs].sort((a, b) => 
        new Date(a.created_at) - new Date(b.created_at)
      );

      // Filtra o log selecionado para mostrar apenas os "outros" logs correlacionados
      setCorrelatedEvents(merged.filter(l => l.id !== event.id));
    } catch (err) {
      console.error('Erro ao buscar correlação de trace:', err);
    } finally {
      setLoadingCorrelation(false);
    }
  };

  // Dispara a geração de diagnóstico usando a IA
  const handleGenerateDiagnosis = async () => {
    if (!selectedEvent) return;
    setLoadingDiagnosis(true);
    setDiagnosis(null);
    try {
      const result = await diagnoseService.generateDiagnosis(selectedEvent, correlatedEvents);
      setDiagnosis(result);
    } catch (err) {
      console.error('Erro ao gerar diagnóstico:', err);
      setDiagnosis(`⚠️ **Falha no Diagnóstico por IA**: ${err.message}. Certifique-se de configurar uma chave nas conexões.`);
    } finally {
      setLoadingDiagnosis(false);
    }
  };

  const getLevelBadgeClass = (level) => {
    switch (level) {
      case 'critical': return 'badge-critical';
      case 'error': return 'badge-error';
      case 'warn': return 'badge-warn';
      case 'debug': return 'badge-debug';
      case 'info':
      default:
        return 'badge-info';
    }
  };

  const getLevelIcon = (level) => {
    switch (level) {
      case 'critical': return 'gavel';
      case 'error': return 'error';
      case 'warn': return 'warning';
      case 'debug': return 'bug_report';
      case 'info':
      default:
        return 'info';
    }
  };

  const isEligibleForDiagnosis = selectedEvent && 
    (selectedEvent.source === 'sentry' || ['error', 'critical'].includes(selectedEvent.level));

  return (
    <div className="page-container observability-page fade-in">
      <header className="page-header">
        <div className="header-content">
          <h1>Central de <span>Observabilidade</span></h1>
          <p>Monitore eventos de negócio, falhas operacionais e trace de requisições do Confia.</p>
        </div>
        <div className="header-actions">
          <button 
            className={`btn-live-toggle glass ${liveUpdate ? 'active' : ''}`} 
            onClick={() => setLiveUpdate(!liveUpdate)}
            title={liveUpdate ? "Desativar Atualização em Tempo Real" : "Ativar Atualização em Tempo Real"}
          >
            <span className={`status-dot ${liveUpdate ? 'live' : 'paused'}`}></span>
            {liveUpdate ? 'Tempo Real Ativo' : 'Tempo Real Pausado'}
          </button>
          <button className="btn-premium-action" onClick={fetchLogs} disabled={loading}>
            <span className="material-symbols-outlined">sync</span>
            Atualizar
          </button>
        </div>
      </header>

      {/* Cards de Métricas do Topo */}
      <div className="observability-stats-grid">
        <div className="stat-card glass">
          <div className="stat-icon events">
            <span className="material-symbols-outlined">analytics</span>
          </div>
          <div className="stat-info">
            <h3>Eventos (24h)</h3>
            <div className="stat-value">{stats.total24h.toLocaleString()}</div>
            <div className="stat-label">Total de transações registradas</div>
          </div>
        </div>

        <div className="stat-card glass">
          <div className="stat-icon errors">
            <span className="material-symbols-outlined">gavel</span>
          </div>
          <div className="stat-info">
            <h3>Erros & Críticos (24h)</h3>
            <div className={`stat-value ${stats.errors24h > 0 ? 'text-red' : ''}`}>{stats.errors24h}</div>
            <div className="stat-label">Eventos com falha crítica ou de negócio</div>
          </div>
        </div>

        <div className="stat-card glass">
          <div className="stat-icon services">
            <span className="material-symbols-outlined">grid_view</span>
          </div>
          <div className="stat-info">
            <h3>Top Serviços com Falhas</h3>
            <div className="services-list">
              {stats.topServices.length === 0 ? (
                <div className="no-errors-text">Nenhum serviço instável nas últimas 24h.</div>
              ) : (
                stats.topServices.map((s, idx) => (
                  <div key={idx} className="service-error-item">
                    <span className="service-name">{s.service}</span>
                    <span className="service-count badge-error">{s.count} err</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="filters-bar glass">
        <div className="search-input-wrapper">
          <span className="material-symbols-outlined search-icon">search</span>
          <input 
            type="text" 
            placeholder="Buscar por mensagem ou erro..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filters-group">
          <div className="select-wrapper">
            <select value={selectedService} onChange={(e) => setSelectedService(e.target.value)}>
              <option value="">Todos os Serviços</option>
              <option value="sentry">Sentry (Erros Técnicos)</option>
              {availableServices.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="select-wrapper">
            <select value={selectedLevel} onChange={(e) => setSelectedLevel(e.target.value)}>
              <option value="">Todos os Níveis</option>
              <option value="debug">Debug</option>
              <option value="info">Info</option>
              <option value="warn">Aviso (Warn)</option>
              <option value="error">Erro (Error)</option>
              <option value="critical">Crítico (Critical)</option>
            </select>
          </div>

          <div className="select-wrapper">
            <select value={dateRangeOption} onChange={(e) => setDateRangeOption(e.target.value)}>
              <option value="2h">Últimas 2 Horas</option>
              <option value="24h">Últimas 24 Horas</option>
              <option value="7d">Últimos 7 Dias</option>
              <option value="all">Todo o Histórico</option>
            </select>
          </div>

          <input 
            type="text" 
            className="tenant-input"
            placeholder="Filtrar por Tenant ID..." 
            value={tenantFilter}
            onChange={(e) => setTenantFilter(e.target.value)}
          />
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="obs-content-layout">
        
        {/* Tabela de Eventos */}
        <div className="events-section glass">
          <div className="section-header">
            <h2><span className="material-symbols-outlined">list</span> Timeline de Eventos</h2>
          </div>
          
          {loading && events.length === 0 ? (
            <div className="table-loading">
              <div className="nebula-spinner"></div>
              <p>Carregando logs e erros...</p>
            </div>
          ) : error ? (
            <div className="error-state-box">
              <span className="material-symbols-outlined text-red">warning</span>
              <p>Ocorreu um erro ao carregar os dados: {error}</p>
            </div>
          ) : events.length === 0 ? (
            <div className="empty-state-box">
              <span className="material-symbols-outlined">filter_list_off</span>
              <p>Nenhum evento encontrado para os filtros selecionados.</p>
            </div>
          ) : (
            <div className="events-table-wrapper">
              <table className="events-table">
                <thead>
                  <tr>
                    <th>Horário</th>
                    <th>Origem / Serviço</th>
                    <th>Nível</th>
                    <th>Tenant</th>
                    <th>Mensagem</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((log) => {
                    const isSentry = log.source === 'sentry';
                    return (
                      <tr 
                        key={log.id} 
                        className={`event-row ${selectedEvent?.id === log.id ? 'selected' : ''} ${isSentry ? 'sentry-row-highlight' : ''}`}
                        onClick={() => handleSelectEvent(log)}
                      >
                        <td className="time-cell">
                          {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          <span className="date-sub">{new Date(log.created_at).toLocaleDateString([], { month: 'short', day: '2-digit' })}</span>
                        </td>
                        <td>
                          {isSentry ? (
                            <span className="service-tag sentry-badge">
                              <span className="material-symbols-outlined mini-icon" style={{ fontSize: '13px' }}>pest_control</span>
                              SENTRY
                            </span>
                          ) : (
                            <span className="service-tag">{log.service || 'geral'}</span>
                          )}
                        </td>
                        <td>
                          <span className={`badge-level ${getLevelBadgeClass(log.level)}`}>
                            <span className="material-symbols-outlined mini-icon">{getLevelIcon(log.level)}</span>
                            {log.level}
                          </span>
                        </td>
                        <td className="tenant-cell">
                          {log.tenant_name ? (
                            <strong>{log.tenant_name}</strong>
                          ) : log.tenant_id ? (
                            <code className="uuid-short" title={log.tenant_id}>{log.tenant_id.substring(0, 8)}...</code>
                          ) : (
                            <span className="empty-text">-</span>
                          )}
                        </td>
                        <td className="message-cell" title={isSentry ? log.title : log.message}>
                          {isSentry ? (
                            <span className="sentry-title-text">
                              <strong>{log.title}</strong>
                            </span>
                          ) : (
                            log.message
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Painel de Drill-down (Detalhes do Evento Selecionado) */}
        <div className="details-panel glass">
          <div className="panel-header">
            <h2><span className="material-symbols-outlined">info</span> Detalhes do Incidente</h2>
          </div>

          {!selectedEvent ? (
            <div className="no-selection-state">
              <span className="material-symbols-outlined icon">zoom_in</span>
              <p>Selecione um evento na timeline para inspecionar os metadados e correlacionar traces.</p>
            </div>
          ) : (
            <div className="details-scroll-content fade-in">
              <div className="detail-header-card">
                <div className="header-meta-row">
                  <span className={`badge-level ${getLevelBadgeClass(selectedEvent.level)}`}>
                    <span className="material-symbols-outlined mini-icon">{getLevelIcon(selectedEvent.level)}</span>
                    {selectedEvent.level.toUpperCase()}
                  </span>
                  {isEligibleForDiagnosis && !diagnosis && !loadingDiagnosis && (
                    <button 
                      className="btn-ai-diagnose glass pulse-animation" 
                      onClick={handleGenerateDiagnosis}
                      title="Analisar Causa Raiz com IA"
                    >
                      <span className="material-symbols-outlined">psychology</span>
                      Diagnóstico IA
                    </button>
                  )}
                </div>
                
                <h3>{selectedEvent.source === 'sentry' ? 'Erro Técnico (Sentry)' : selectedEvent.service}</h3>
                
                <p className="detail-message">
                  {selectedEvent.source === 'sentry' ? selectedEvent.title : selectedEvent.message}
                </p>
                
                <span className="detail-time">Ocorrido em: {new Date(selectedEvent.created_at).toLocaleString()}</span>
                
                {selectedEvent.source === 'sentry' && selectedEvent.metadata?.sentry_url && (
                  <a 
                    href={selectedEvent.metadata.sentry_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn-sentry-link glass fade-in"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>open_in_new</span>
                    Ver no Painel Sentry
                  </a>
                )}
              </div>

              {/* Loader de IA */}
              {loadingDiagnosis && (
                <div className="ai-diagnosis-loader glass fade-in">
                  <div className="ai-brain-animation">
                    <span className="material-symbols-outlined brain-icon">psychology</span>
                    <div className="scanner-line"></div>
                  </div>
                  <p>Inspecionando trace, metadados e gerando causa raiz com IA...</p>
                </div>
              )}

              {/* Diagnóstico da IA Exibido */}
              {diagnosis && (
                <div className="ai-diagnosis-container glass fade-in">
                  <div className="diagnosis-header">
                    <span className="material-symbols-outlined">smart_toy</span>
                    <h4>Diagnóstico da IA</h4>
                  </div>
                  <div className="diagnosis-content">
                    <ReactMarkdown>{diagnosis}</ReactMarkdown>
                  </div>
                </div>
              )}

              <div className="detail-info-list">
                {selectedEvent.trace_id && (
                  <div className="info-item">
                    <span className="label">Trace ID (Correlação)</span>
                    <div className="trace-wrapper">
                      <code>{selectedEvent.trace_id}</code>
                    </div>
                  </div>
                )}

                {selectedEvent.metadata?.culprit && (
                  <div className="info-item">
                    <span className="label">Localização da Falha (Culpado)</span>
                    <code style={{ color: '#f87171' }}>{selectedEvent.metadata.culprit}</code>
                  </div>
                )}

                {selectedEvent.tenant_id && (
                  <div className="info-item">
                    <span className="label">Tenant ID</span>
                    <code>{selectedEvent.tenant_id}</code>
                  </div>
                )}

                {selectedEvent.tenant_name && (
                  <div className="info-item">
                    <span className="label">Nome do Cliente (Tenant)</span>
                    <strong>{selectedEvent.tenant_name}</strong>
                  </div>
                )}
              </div>

              {/* Metadados JSON Formatados */}
              <div className="metadata-section">
                <span className="section-label">Payload de Metadados</span>
                <pre className="json-pre">
                  <code>
                    {JSON.stringify(selectedEvent.metadata || {}, null, 2)}
                  </code>
                </pre>
              </div>

              {/* Eventos Correlacionados por Trace ID */}
              {selectedEvent.trace_id && (
                <div className="correlation-section">
                  <span className="section-label">Timeline de Trace Correlacionada</span>
                  
                  {loadingCorrelation ? (
                    <div className="correlation-loading">
                      <div className="nebula-spinner mini"></div>
                      <p>Buscando correlações...</p>
                    </div>
                  ) : correlatedEvents.length === 0 ? (
                    <p className="empty-correlation-text">Nenhum outro evento correlacionado para este Trace ID.</p>
                  ) : (
                    <div className="correlation-timeline">
                      {correlatedEvents.map((log) => {
                        const isSentry = log.source === 'sentry';
                        return (
                          <div 
                            key={log.id} 
                            className={`correlated-item ${isSentry ? 'sentry' : ''}`}
                            onClick={() => handleSelectEvent(log)}
                          >
                            <span className="time">
                              {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                            <span className={`badge-level mini ${getLevelBadgeClass(log.level)}`}>
                              {log.level}
                            </span>
                            <span className="service-tag-cor">
                              {isSentry ? 'SENTRY' : log.service}
                            </span>
                            <p className="msg">{isSentry ? log.title : log.message}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default ObservabilityPage;
