import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { alertService } from '../services/alertService';
import { projectService } from '../services/projectService';
import './AlertsPage.css';

// ─── Constantes ───────────────────────────────────────────────
const LEVELS   = ['critical', 'error', 'warn', 'info'];
const SERVICES = ['billing', 'nfe', 'pdv-sync', 'auth', 'whatsapp', 'ai-collections'];
const CHANNELS = [
  { value: 'whatsapp', label: 'WhatsApp', icon: 'chat' },
  { value: 'email',    label: 'E-mail',   icon: 'mail' },
  { value: 'slack',    label: 'Slack',    icon: 'tag' },
  { value: 'webhook',  label: 'Webhook',  icon: 'webhook' },
];

const STATUS_META = {
  success:    { label: 'Enviado',   cls: 'success',   icon: 'check_circle' },
  failed:     { label: 'Falha',     cls: 'failed',    icon: 'error' },
  suppressed: { label: 'Suprimido', cls: 'suppressed',icon: 'do_not_disturb_on' },
  pending:    { label: 'Pendente',  cls: 'pending',   icon: 'schedule' },
};

// ─────────────────────────────────────────────────────────────
const AlertsPage = () => {
  const [activeTab, setActiveTab]         = useState('rules');   // 'rules' | 'history'
  const [projects, setProjects]           = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('all');

  const [rules, setRules]                 = useState([]);
  const [history, setHistory]             = useState([]);
  const [loading, setLoading]             = useState(true);

  // Modal de criação
  const [showModal, setShowModal]         = useState(false);
  const [submitting, setSubmitting]       = useState(false);

  // Campos do formulário
  const [form, setForm] = useState({
    name:                    '',
    project_id:              '',
    filter_level:            'critical',
    filter_service:          '',
    trigger_type:            'immediate',
    threshold_limit:         3,
    threshold_window_minutes:5,
    channel:                 'email',
    recipient:               '',
  });

  // ── Carga inicial ──────────────────────────────────────────
  useEffect(() => {
    projectService.getProjects().then(setProjects).catch(console.warn);
  }, []);

  useEffect(() => {
    loadData();
  }, [selectedProjectId, activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'rules') {
        const data = await alertService.getAlertRules(selectedProjectId);
        setRules(data);
      } else {
        const data = await alertService.getAlertHistory(selectedProjectId);
        setHistory(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ── Toggle ativo/inativo ───────────────────────────────────
  const handleToggle = async (rule) => {
    try {
      const updated = await alertService.toggleAlertRule(rule.id, rule.is_active);
      setRules(prev => prev.map(r => r.id === updated.id ? updated : r));
    } catch (err) {
      alert('Erro ao atualizar status da regra: ' + err.message);
    }
  };

  // ── Deletar regra ─────────────────────────────────────────
  const handleDelete = async (ruleId, name) => {
    if (!window.confirm(`Deletar a regra "${name}"?`)) return;
    try {
      await alertService.deleteAlertRule(ruleId);
      setRules(prev => prev.filter(r => r.id !== ruleId));
    } catch (err) {
      alert('Erro ao deletar: ' + err.message);
    }
  };

  // ── Criar regra ───────────────────────────────────────────
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.project_id || !form.name || !form.recipient) {
      alert('Preencha: Projeto, Nome da Regra e Destinatário.');
      return;
    }
    setSubmitting(true);
    try {
      const cleanedForm = {
        ...form,
        filter_level: form.filter_level || null,
        filter_service: form.filter_service || null,
      };
      const newRule = await alertService.createAlertRule(cleanedForm);
      setRules(prev => [newRule, ...prev]);
      setShowModal(false);
      setForm(f => ({ ...f, name: '', recipient: '' }));
    } catch (err) {
      alert('Erro ao criar regra: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // ── Helpers de exibição ───────────────────────────────────
  const getChannelIcon = (ch) => CHANNELS.find(c => c.value === ch)?.icon ?? 'notifications';
  const getLevelClass  = (lv) => ({ critical:'lvl-critical', error:'lvl-error', warn:'lvl-warn', info:'lvl-info' }[lv] ?? '');

  const projectName = (id) => projects.find(p => p.id === id)?.name ?? '—';

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="page-container alerts-page fade-in">

      {/* Header */}
      <header className="page-header">
        <div className="header-content">
          <h1>Central de <span>Alertas</span></h1>
          <p>Configure disparos automáticos por WhatsApp, e-mail ou Slack quando incidentes ocorrerem.</p>
        </div>
        <button className="btn-premium-action" onClick={() => setShowModal(true)}>
          <span className="material-symbols-outlined">add_alert</span>
          Nova Regra
        </button>
      </header>

      {/* Seletor de projeto + abas */}
      <div className="alerts-controls glass">
        <div className="project-selector-header">
          <span className="material-symbols-outlined folder-icon">folder</span>
          <select
            value={selectedProjectId}
            onChange={e => setSelectedProjectId(e.target.value)}
            className="project-select-dropdown"
          >
            <option value="all">Todos os Projetos</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <div className="tab-group">
          <button
            className={`tab-btn ${activeTab === 'rules' ? 'active' : ''}`}
            onClick={() => setActiveTab('rules')}
          >
            <span className="material-symbols-outlined">rule</span>
            Regras
          </button>
          <button
            className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <span className="material-symbols-outlined">history</span>
            Histórico
          </button>
        </div>
      </div>

      {/* Conteúdo principal */}
      {loading ? (
        <div className="table-loading">
          <div className="nebula-spinner"></div>
          <p>Carregando...</p>
        </div>
      ) : activeTab === 'rules' ? (
        // ── Aba Regras ─────────────────────────────────────────
        rules.length === 0 ? (
          <div className="empty-state-box glass">
            <span className="material-symbols-outlined" style={{ fontSize: '3rem', opacity: 0.35 }}>notifications_off</span>
            <h3>Nenhuma regra cadastrada</h3>
            <p>Crie regras para ser notificado automaticamente quando incidentes acontecerem.</p>
            <button className="btn-premium-action" onClick={() => setShowModal(true)}>Criar Regra</button>
          </div>
        ) : (
          <div className="rules-grid">
            {rules.map(rule => (
              <div key={rule.id} className={`rule-card glass ${rule.is_active ? 'active' : 'inactive'}`}>
                {/* Cabeçalho */}
                <div className="rule-card-header">
                  <div className="rule-icon-wrap">
                    <span className="material-symbols-outlined">{getChannelIcon(rule.channel)}</span>
                  </div>
                  <div className="rule-title-area">
                    <h3>{rule.name}</h3>
                    <span className="rule-project">{projectName(rule.project_id)}</span>
                  </div>
                  {/* Toggle */}
                  <label className="toggle-switch" title={rule.is_active ? 'Desativar' : 'Ativar'}>
                    <input
                      type="checkbox"
                      checked={rule.is_active}
                      onChange={() => handleToggle(rule)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                {/* Badges de condição */}
                <div className="rule-conditions">
                  {rule.filter_level && (
                    <span className={`cond-badge ${getLevelClass(rule.filter_level)}`}>
                      {rule.filter_level}
                    </span>
                  )}
                  {rule.filter_service && (
                    <span className="cond-badge service">{rule.filter_service}</span>
                  )}
                  {rule.trigger_type === 'threshold' && (
                    <span className="cond-badge threshold">
                      &gt; {rule.threshold_limit} erros / {rule.threshold_window_minutes}min
                    </span>
                  )}
                  {rule.trigger_type === 'immediate' && (
                    <span className="cond-badge immediate">Imediato</span>
                  )}
                </div>

                {/* Destinatário */}
                <div className="rule-recipient">
                  <span className="material-symbols-outlined" style={{ fontSize: '15px', opacity: 0.6 }}>{getChannelIcon(rule.channel)}</span>
                  <span>{rule.channel.toUpperCase()} → <code>{rule.recipient}</code></span>
                </div>

                {/* Footer */}
                <div className="rule-card-footer">
                  <span className="rule-date">{new Date(rule.created_at).toLocaleDateString('pt-BR')}</span>
                  <button
                    className="btn-card-action danger"
                    onClick={() => handleDelete(rule.id, rule.name)}
                    title="Excluir regra"
                  >
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        // ── Aba Histórico ──────────────────────────────────────
        history.length === 0 ? (
          <div className="empty-state-box glass">
            <span className="material-symbols-outlined" style={{ fontSize: '3rem', opacity: 0.35 }}>notifications_paused</span>
            <h3>Nenhum alerta disparado ainda</h3>
            <p>Quando uma regra for acionada, o histórico aparecerá aqui.</p>
          </div>
        ) : (
          <div className="history-list">
            {history.map(item => {
              const meta = STATUS_META[item.sent_status] ?? STATUS_META.pending;
              return (
                <div key={item.id} className={`history-item glass ${meta.cls}`}>
                  <div className="history-status-icon">
                    <span className="material-symbols-outlined">{meta.icon}</span>
                  </div>
                  <div className="history-details">
                    <div className="history-row-top">
                      <strong>{item.rule?.name ?? 'Regra removida'}</strong>
                      <span className={`status-pill ${meta.cls}`}>{meta.label}</span>
                    </div>
                    <div className="history-row-mid">
                      {item.rule?.channel && (
                        <span className="history-channel">
                          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>{getChannelIcon(item.rule.channel)}</span>
                          {item.rule.channel.toUpperCase()}
                        </span>
                      )}
                      {item.rule?.filter_level && (
                        <span className={`cond-badge mini ${getLevelClass(item.rule.filter_level)}`}>
                          {item.rule.filter_level}
                        </span>
                      )}
                      {item.rule?.filter_service && (
                        <span className="cond-badge mini service">{item.rule.filter_service}</span>
                      )}
                    </div>
                    {item.incident_details?.message && (
                      <p className="history-message" title={item.incident_details.message}>
                        {item.incident_details.message}
                      </p>
                    )}
                    {item.error_message && (
                      <p className="history-error">Erro: {item.error_message}</p>
                    )}
                  </div>
                  <div className="history-time">
                    {new Date(item.created_at).toLocaleString('pt-BR', {
                      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ── Modal de Nova Regra ───────────────────────────────── */}
      {showModal && createPortal(
        <div className="obs-modal-backdrop">
          <div className="obs-modal-content glass large fade-in">
            <div className="obs-modal-header">
              <h2>Nova Regra de Alerta</h2>
              <button className="btn-close-modal" onClick={() => setShowModal(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreate}>
              <div className="obs-modal-body">
                {/* Projeto */}
                <div className="form-group">
                  <label>Projeto Monitorado *</label>
                  <select
                    value={form.project_id}
                    onChange={e => setField('project_id', e.target.value)}
                    required
                    className="form-select"
                  >
                    <option value="">Selecione um projeto…</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>

                {/* Nome */}
                <div className="form-group">
                  <label>Nome da Regra *</label>
                  <input
                    type="text"
                    placeholder="Ex: Falha Crítica no Billing"
                    value={form.name}
                    onChange={e => setField('name', e.target.value)}
                    required
                  />
                </div>

                {/* Filtros em linha */}
                <div className="row-form-group">
                  <div className="form-group flex-1">
                    <label>Nível de Severidade</label>
                    <select className="form-select" value={form.filter_level} onChange={e => setField('filter_level', e.target.value)}>
                      <option value="">Qualquer nível</option>
                      {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <div className="form-group flex-1">
                    <label>Serviço Específico</label>
                    <select className="form-select" value={form.filter_service} onChange={e => setField('filter_service', e.target.value)}>
                      <option value="">Qualquer serviço</option>
                      {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                {/* Tipo de disparo */}
                <div className="form-group">
                  <label>Tipo de Disparo</label>
                  <div className="trigger-selector">
                    <button
                      type="button"
                      className={`trigger-btn ${form.trigger_type === 'immediate' ? 'active' : ''}`}
                      onClick={() => setField('trigger_type', 'immediate')}
                    >
                      <span className="material-symbols-outlined">bolt</span>
                      Imediato (1 evento)
                    </button>
                    <button
                      type="button"
                      className={`trigger-btn ${form.trigger_type === 'threshold' ? 'active' : ''}`}
                      onClick={() => setField('trigger_type', 'threshold')}
                    >
                      <span className="material-symbols-outlined">trending_up</span>
                      Limiar de Volume
                    </button>
                  </div>
                </div>

                {/* Configurações de threshold */}
                {form.trigger_type === 'threshold' && (
                  <div className="row-form-group fade-in">
                    <div className="form-group flex-1">
                      <label>Quantidade de Erros</label>
                      <input type="number" min="1" value={form.threshold_limit}
                        onChange={e => setField('threshold_limit', Number(e.target.value))} />
                    </div>
                    <div className="form-group flex-1">
                      <label>Janela de Tempo (min)</label>
                      <input type="number" min="1" value={form.threshold_window_minutes}
                        onChange={e => setField('threshold_window_minutes', Number(e.target.value))} />
                    </div>
                  </div>
                )}

                {/* Canal */}
                <div className="form-group">
                  <label>Canal de Notificação *</label>
                  <div className="channel-selector">
                    {CHANNELS.map(ch => (
                      <button
                        key={ch.value}
                        type="button"
                        className={`channel-btn ${form.channel === ch.value ? 'active' : ''}`}
                        onClick={() => setField('channel', ch.value)}
                      >
                        <span className="material-symbols-outlined">{ch.icon}</span>
                        {ch.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Destinatário */}
                <div className="form-group">
                  <label>
                    {form.channel === 'email'   && 'Endereço de E-mail *'}
                    {form.channel === 'whatsapp'&& 'Número WhatsApp (com DDI) *'}
                    {form.channel === 'slack'   && 'URL do Webhook Slack *'}
                    {form.channel === 'webhook' && 'URL do Webhook HTTP *'}
                  </label>
                  <input
                    type={form.channel === 'email' ? 'email' : 'text'}
                    placeholder={
                      form.channel === 'email'    ? 'ops@empresa.com.br' :
                      form.channel === 'whatsapp' ? '+5511999999999' :
                      'https://hooks.slack.com/...'
                    }
                    value={form.recipient}
                    onChange={e => setField('recipient', e.target.value)}
                    required
                  />
                  <small className="form-help">
                    {form.channel === 'whatsapp' && '⚠️ Envios via WhatsApp estão em modo simulado. Configure a Evolution API para envios reais.'}
                    {form.channel === 'email'    && '⚠️ Envios via E-mail estão em modo simulado. Configure Brevo/Resend para envios reais.'}
                    {form.channel === 'slack'    && 'O webhook do Slack receberá a notificação em tempo real.'}
                    {form.channel === 'webhook'  && 'O endpoint receberá um POST JSON com os detalhes do incidente.'}
                  </small>
                </div>
              </div>

              <div className="obs-modal-footer">
                <button type="button" className="btn-modal-cancel" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-premium-action" disabled={submitting}>
                  {submitting ? 'Criando…' : 'Criar Regra'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default AlertsPage;
