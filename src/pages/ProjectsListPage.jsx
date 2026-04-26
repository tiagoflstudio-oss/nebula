import React from 'react';

const ProjectsListPage = ({ projects, onCreateProject, onSelectProject, onDeleteProject }) => {
  return (
    <div className="projects-list-page fade-in">
      <header className="projects-header">
        <div className="projects-info">
          <h1>Seus <span>Projetos</span></h1>
          <p>Gerencie seus clientes e ambientes de desenvolvimento em um só lugar.</p>
        </div>
        <button className="btn-primary" onClick={onCreateProject}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Novo Projeto
        </button>
      </header>

      <div className="projects-grid">
        {projects.length === 0 ? (
          <div className="empty-projects glass">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
            <p>Nenhum projeto encontrado. Comece criando um novo!</p>
          </div>
        ) : (
          projects.map(project => (
            <div 
              key={project.id} 
              className="project-folder-card glass"
              onClick={() => onSelectProject(project.id)}
            >
              <button 
                className="btn-delete-project"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteProject(project.id, project.title);
                }}
                title="Excluir Projeto"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              <div className="folder-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <div className="project-details">
                <h3>{project.title}</h3>
                <p>{new Date(project.created_at).toLocaleDateString('pt-BR')}</p>
              </div>
              <div className="project-arrow">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m9 18 6-6-6-6"/>
                </svg>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ProjectsListPage;
