import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { projectService } from '../services/projectService';
import './ProjectsListPage.css';

const ProjectsListPage = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estados de Modais
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);

  // Estados de Formulário de Cadastro
  const [projectName, setProjectName] = useState('');
  const [projectSlug, setProjectSlug] = useState('');
  const [uptimeUrl, setUptimeUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Estado do Projeto Selecionado para Edição / Visualização de Token
  const [selectedProject, setSelectedProject] = useState(null);
  
  // Estados de Integração do Sentry / GitHub no Modal de Configurações
  const [settingsGithubUrl, setSettingsGithubUrl] = useState('');
  const [settingsUptimeUrl, setSettingsUptimeUrl] = useState('');
  const [settingsSentryOrg, setSettingsSentryOrg] = useState('');
  const [settingsSentryProject, setSettingsSentryProject] = useState('');
  const [settingsProjectName, setSettingsProjectName] = useState('');

  // Busca inicial dos projetos
  const loadProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await projectService.getProjects();
      setProjects(data);
    } catch (err) {
      console.error(err);
      setError('Falha ao obter lista de projetos cadastrados.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  // Handler de auto-geração de slug conforme digita o nome
  const handleNameChange = (e) => {
    const name = e.target.value;
    setProjectName(name);
    // Transforma "Meu Projeto SaaS" em "meu-projeto-saas"
    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove acentos
      .replace(/[^a-z0-9\s-]/g, '')    // remove caracteres especiais
      .trim()
      .replace(/\s+/g, '-');           // substitui espaços por hífens
    setProjectSlug(slug);
  };

  // Cadastra o projeto no Supabase
  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!projectName || !projectSlug) return;

    setSubmitting(true);
    try {
      const newProject = await projectService.createProject(projectName, projectSlug, {
        uptime_url: uptimeUrl,
        github_repo_url: githubUrl
      });

      // Atualiza a lista local e abre o modal de token de integração do projeto recém-criado
      setProjects([newProject, ...projects]);
      setSelectedProject(newProject);
      setShowCreateModal(false);
      setShowTokenModal(true);

      // Reseta formulário
      setProjectName('');
      setProjectSlug('');
      setUptimeUrl('');
      setGithubUrl('');
    } catch (err) {
      alert('Erro ao criar projeto: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Abre modal de configurações e popula inputs
  const handleOpenSettings = (project) => {
    setSelectedProject(project);
    setSettingsProjectName(project.name);
    setSettingsGithubUrl(project.github_repo_url || '');
    setSettingsUptimeUrl(project.uptime_url || '');
    setSettingsSentryOrg(project.sentry_org || '');
    setSettingsSentryProject(project.sentry_project || '');
    setShowSettingsModal(true);
  };

  // Salva edições nas configurações/integrações do projeto
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    if (!selectedProject) return;

    setSubmitting(true);
    try {
      const updated = await projectService.updateProject(selectedProject.id, {
        name: settingsProjectName,
        github_repo_url: settingsGithubUrl,
        uptime_url: settingsUptimeUrl,
        sentry_org: settingsSentryOrg,
        sentry_project: settingsSentryProject
      });

      setProjects(projects.map(p => p.id === updated.id ? updated : p));
      setShowSettingsModal(false);
    } catch (err) {
      alert('Erro ao atualizar configurações: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Exclui projeto com confirmação do usuário
  const handleDeleteProject = async () => {
    if (!selectedProject) return;
    const confirmDelete = window.confirm(
      `ATENÇÃO: Tem certeza que deseja deletar o projeto "${selectedProject.name}"? Isso removerá permanentemente todas as configurações e logs de observabilidade associados!`
    );

    if (!confirmDelete) return;

    try {
      await projectService.deleteProject(selectedProject.id);
      setProjects(projects.filter(p => p.id !== selectedProject.id));
      setShowSettingsModal(false);
    } catch (err) {
      alert('Erro ao deletar projeto: ' + err.message);
    }
  };

  const handleOpenToken = (project) => {
    setSelectedProject(project);
    setShowTokenModal(true);
  };

  return (
    <div className="page-container projects-list-page fade-in">
      <header className="page-header">
        <div className="header-content">
          <h1>Sistemas <span>Monitorados</span></h1>
          <p>Cadastre e gerencie integrações, repositórios de código e segredos dos seus projetos SaaS.</p>
        </div>
        <button className="btn-premium-action" onClick={() => setShowCreateModal(true)}>
          <span className="material-symbols-outlined">add_circle</span>
          Novo Projeto
        </button>
      </header>

      {loading ? (
        <div className="table-loading">
          <div className="nebula-spinner"></div>
          <p>Carregando projetos...</p>
        </div>
      ) : error ? (
        <div className="error-state-box">
          <span className="material-symbols-outlined text-red">warning</span>
          <p>{error}</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="empty-state-box glass">
          <span className="material-symbols-outlined" style={{ fontSize: '3.5rem', marginBottom: '16px', opacity: 0.4 }}>
            folder_open
          </span>
          <h3>Nenhum projeto monitorado</h3>
          <p style={{ maxWidth: '380px', margin: '8px 0 20px 0', opacity: 0.7 }}>
            Adicione o seu primeiro projeto para começar a monitorar eventos de negócio, coletar erros técnicos do Sentry e ter suporte a diagnósticos por IA.
          </p>
          <button className="btn-premium-action" onClick={() => setShowCreateModal(true)}>
            Adicionar Projeto
          </button>
        </div>
      ) : (
        <div className="projects-grid">
          {projects.map((project) => (
            <div key={project.id} className="project-card glass">
              <div className="project-card-header">
                <div className="project-icon-wrapper">
                  <span className="material-symbols-outlined">folder</span>
                </div>
                <div className="project-title-area">
                  <h3>{project.name}</h3>
                  <span className="project-slug">Slug: <code>{project.slug}</code></span>
                </div>
              </div>

              <div className="project-card-body">
                {/* Status de Uptime */}
                <div className="project-detail-row">
                  <span className="label">Status de Uptime</span>
                  {project.uptime_url ? (
                    <span className="status-badge operational">
                      <span className="status-dot live"></span>
                      Operacional
                    </span>
                  ) : (
                    <span className="status-badge inactive">
                      Sem monitoramento
                    </span>
                  )}
                </div>

                {/* GitHub link status */}
                <div className="project-detail-row">
                  <span className="label">Repositório Git</span>
                  {project.github_repo_url ? (
                    <span className="icon-badge text-green" title={project.github_repo_url}>
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>check_circle</span>
                      Conectado
                    </span>
                  ) : (
                    <span className="icon-badge text-gray">
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>cancel</span>
                      Nenhum
                    </span>
                  )}
                </div>

                {/* Sentry link status */}
                <div className="project-detail-row">
                  <span className="label">Sentry SRE</span>
                  {project.sentry_org && project.sentry_project ? (
                    <span className="icon-badge text-green">
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>pest_control</span>
                      Ativo ({project.sentry_project})
                    </span>
                  ) : (
                    <span className="icon-badge text-gray">
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>pest_control_off</span>
                      Inativo
                    </span>
                  )}
                </div>
              </div>

              <div className="project-card-footer">
                <button 
                  className="btn-card-action secondary" 
                  onClick={() => handleOpenToken(project)}
                  title="Visualizar instruções e token de integração"
                >
                  <span className="material-symbols-outlined">vpn_key</span>
                  Chave
                </button>
                <button 
                  className="btn-card-action primary" 
                  onClick={() => handleOpenSettings(project)}
                  title="Configurar integrações do projeto"
                >
                  <span className="material-symbols-outlined">settings</span>
                  Ajustes
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL 1: Cadastro de Projeto */}
      {showCreateModal && createPortal(
        <div className="obs-modal-backdrop">
          <div className="obs-modal-content glass fade-in">
            <div className="obs-modal-header">
              <h2>Novo Projeto de Observabilidade</h2>
              <button className="btn-close-modal" onClick={() => setShowCreateModal(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleCreateProject}>
              <div className="obs-modal-body">
                <div className="form-group">
                  <label>Nome do Sistema / SaaS</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Confia Crediário" 
                    value={projectName}
                    onChange={handleNameChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Identificador Único (Slug)</label>
                  <input 
                    type="text" 
                    placeholder="ex-confia" 
                    value={projectSlug}
                    onChange={(e) => setProjectSlug(e.target.value.toLowerCase())}
                    required
                  />
                  <small className="form-help">Usado nos caminhos de logs e roteamento de APIs.</small>
                </div>

                <div className="form-group">
                  <label>URL de Produção (Uptime Ping)</label>
                  <input 
                    type="url" 
                    placeholder="https://confia.meusite.com.br" 
                    value={uptimeUrl}
                    onChange={(e) => setUptimeUrl(e.target.value)}
                  />
                  <small className="form-help">Monitora ativamente a latência e integridade da URL.</small>
                </div>

                <div className="form-group">
                  <label>Caminho/URL do Repositório GitHub</label>
                  <input 
                    type="text" 
                    placeholder="https://github.com/usuario/confia" 
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                  />
                  <small className="form-help">Necessário para que a IA analise arquivos e sugira correções de código.</small>
                </div>
              </div>

              <div className="obs-modal-footer">
                <button type="button" className="btn-modal-cancel" onClick={() => setShowCreateModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-premium-action" disabled={submitting}>
                  {submitting ? 'Cadastrando...' : 'Criar Projeto'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 2: Configurações e Integrações */}
      {showSettingsModal && selectedProject && createPortal(
        <div className="obs-modal-backdrop">
          <div className="obs-modal-content glass fade-in">
            <div className="obs-modal-header">
              <h2>Ajustes & Integrações: {selectedProject.name}</h2>
              <button className="btn-close-modal" onClick={() => setShowSettingsModal(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleSaveSettings}>
              <div className="obs-modal-body">
                <div className="form-group">
                  <label>Nome do Projeto</label>
                  <input 
                    type="text" 
                    value={settingsProjectName}
                    onChange={(e) => setSettingsProjectName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>URL de Uptime</label>
                  <input 
                    type="url" 
                    value={settingsUptimeUrl}
                    onChange={(e) => setSettingsUptimeUrl(e.target.value)}
                    placeholder="Nenhuma URL cadastrada"
                  />
                </div>

                <div className="form-group">
                  <label>Repositório GitHub</label>
                  <input 
                    type="text" 
                    value={settingsGithubUrl}
                    onChange={(e) => setSettingsGithubUrl(e.target.value)}
                    placeholder="Sem repositório associado"
                  />
                </div>

                <div className="row-form-group">
                  <div className="form-group flex-1">
                    <label>Sentry: Organização (Slug)</label>
                    <input 
                      type="text" 
                      placeholder="confia-saas" 
                      value={settingsSentryOrg}
                      onChange={(e) => setSettingsSentryOrg(e.target.value)}
                    />
                  </div>
                  <div className="form-group flex-1">
                    <label>Sentry: Projeto (Slug)</label>
                    <input 
                      type="text" 
                      placeholder="confia-nextjs" 
                      value={settingsSentryProject}
                      onChange={(e) => setSettingsSentryProject(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="obs-modal-footer space-between">
                <button 
                  type="button" 
                  className="btn-modal-danger" 
                  onClick={handleDeleteProject}
                >
                  <span className="material-symbols-outlined">delete</span>
                  Excluir Projeto
                </button>
                <div className="right-actions">
                  <button type="button" className="btn-modal-cancel" onClick={() => setShowSettingsModal(false)}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn-premium-action" disabled={submitting}>
                    {submitting ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 3: Token e Instruções de Integração */}
      {showTokenModal && selectedProject && createPortal(
        <div className="obs-modal-backdrop">
          <div className="obs-modal-content glass large fade-in">
            <div className="obs-modal-header">
              <h2>Chave de Integração: {selectedProject.name}</h2>
              <button className="btn-close-modal" onClick={() => setShowTokenModal(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="obs-modal-body">
              <div className="form-group">
                <label>Token de Ingestão Exclusivo (INGEST_SECRET)</label>
                <div className="token-display-box">
                  <code>{selectedProject.ingest_secret}</code>
                  <button 
                    className="btn-copy-token" 
                    onClick={() => {
                      navigator.clipboard.writeText(selectedProject.ingest_secret);
                      alert('Token copiado com sucesso!');
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>content_copy</span>
                    Copiar
                  </button>
                </div>
                <small className="form-help text-red">**AVISO**: Não compartilhe este token publicamente. Ele permite enviar logs para a sua timeline.</small>
              </div>

              <div className="integration-instructions">
                <h4>Instruções de Integração (SaaS Next.js / Node.js)</h4>
                <p>1. Adicione a chave no arquivo `.env` do seu SaaS:</p>
                <pre className="instruction-code">
                  <code>
                    {`NEBULA_URL=https://kejbqdeupmsvupvityrt.supabase.co/functions/v1/ingest-event\nNEBULA_INGEST_SECRET="${selectedProject.ingest_secret}"`}
                  </code>
                </pre>
                
                <p>2. Chame a função utilitária `logEvent` do seu backend em momentos críticos (criação de assinaturas, falhas no Pix, erros técnicos):</p>
                <pre className="instruction-code">
                  <code>
                    {`import { logEvent } from './lib/nebula-observability';\n\nawait logEvent({\n  service: 'billing',\n  level: 'critical',\n  message: 'Falha no processamento da assinatura do Pix',\n  trace_id: 'payment-trace-uuid-12345',\n  metadata: { amount: 150.00, client_name: 'Tiago' }\n});`}
                  </code>
                </pre>
              </div>
            </div>

            <div className="obs-modal-footer">
              <button className="btn-premium-action" onClick={() => setShowTokenModal(false)}>
                Entendido
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ProjectsListPage;
