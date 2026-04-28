import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import './ProjectPage.css';

const ProjectPage = ({ projectId, onSelectChat }) => {
  const [project, setProject] = useState(null);
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isEditing, setIsEditing] = useState(false);
  const [instructions, setInstructions] = useState('');

  useEffect(() => {
    let mounted = true;
    const fetchProjectData = async () => {
      setLoading(true);
      try {
        const { data: projData, error: projError } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .single();
        
        if (projError) throw projError;
        if (!mounted) return;
        setProject(projData);
        setInstructions(projData.instructions || '');

        const { data: chatData, error: chatError } = await supabase
          .from('chats')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false });
        
        if (chatError) throw chatError;
        if (mounted) setChats(chatData);

      } catch (error) {
        console.error('Erro ao buscar dados do projeto:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    if (projectId) {
      fetchProjectData();
    }
    
    return () => { mounted = false; };
  }, [projectId]);

  const handleSaveInstructions = async () => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({ instructions })
        .eq('id', projectId);
      
      if (error) throw error;
      setProject({ ...project, instructions });
      setIsEditing(false);
    } catch (error) {
      alert('Erro ao salvar instruções');
      console.error(error);
    }
  };

  if (loading) return <div className="project-page loading">Carregando Projeto...</div>;

  return (
    <div className="project-page fade-in">
      <header className="project-header">
        <div className="project-title-area">
          <div className="project-icon glass">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <h1>{project?.title}</h1>
        </div>
        <button className="btn-primary" onClick={() => onSelectChat(null)}>
          Novo chat no projeto
        </button>
      </header>

      <div className="project-grid">
        <section className="project-section glass">
          <div className="section-header">
            <h3>Instruções do Projeto</h3>
            {isEditing ? (
              <button className="btn-text save" onClick={handleSaveInstructions}>Salvar</button>
            ) : (
              <button className="btn-text" onClick={() => setIsEditing(true)}>Editar</button>
            )}
          </div>
          <p className="section-description">
            Defina como o Nebula AI deve se comportar e quais diretrizes seguir dentro deste projeto.
          </p>
          <div className="instruction-content">
            {isEditing ? (
              <textarea 
                className="edit-instructions-area"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Ex: Neste projeto, você é um especialista em marketing jurídico..."
              />
            ) : (
              <div className="instruction-box">
                {project?.instructions || 'Nenhuma instrução definida. Adicione diretrizes para personalizar a inteligência do projeto.'}
              </div>
            )}
          </div>
        </section>

        <section className="project-section glass">
          <div className="section-header">
            <h3>Conhecimento</h3>
            <button className="btn-text">Adicionar Arquivos</button>
          </div>
          <p className="section-description">
            Suba documentos, PDFs ou arquivos de texto para que a IA os use como referência.
          </p>
          <div className="knowledge-list">
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M13 2v7h7"/>
              </svg>
              <span>Nenhum arquivo adicionado ainda.</span>
            </div>
          </div>
        </section>

        <section className="project-section glass wide">
          <div className="section-header">
            <h3>Conversas Recentes</h3>
          </div>
          <div className="recent-chats-grid">
            {chats.length > 0 ? chats.map(chat => (
              <div key={chat.id} className="project-chat-card glass" onClick={() => onSelectChat(chat.id)}>
                <h4>{chat.title}</h4>
                <span>{new Date(chat.created_at).toLocaleDateString()}</span>
              </div>
            )) : (
              <div className="empty-state">Inicie sua primeira conversa neste projeto.</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default ProjectPage;
