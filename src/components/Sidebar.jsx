import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const Sidebar = ({ 
  onSelectChat, 
  selectedChatId, 
  onNewChat, 
  chats,
  projects,
  selectedProjectId,
  onSelectProject,
  onCreateProject,
  selectedPage,
  onSelectPage,
  onDeleteChat,
  onRenameChat,
  onPinChat
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredChats = chats?.filter(chat => 
    chat.title.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleRename = (e, id, currentTitle) => {
    e.stopPropagation();
    const newTitle = prompt('Novo título da conversa:', currentTitle);
    if (newTitle && newTitle !== currentTitle) {
      onRenameChat(id, newTitle);
    }
  };

  return (
    <aside className="sidebar glass">
      <div className="sidebar-header" onClick={() => {
        onSelectPage('home');
        onSelectProject(null);
        onSelectChat(null);
      }} style={{ cursor: 'pointer' }}>
        <div className="sidebar-logo">
          Nebula <span>AI</span>
        </div>
      </div>

      <div className="sidebar-top-actions">
        <button className="btn-new-chat" onClick={onNewChat}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Novo bate-papo
        </button>

        <div className="sidebar-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
          <input 
            type="text" 
            placeholder="Procurar" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <nav className="sidebar-main-nav">
          <button className={`nav-item ${!selectedProjectId ? 'active' : ''}`} onClick={() => onSelectProject(null)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            Conversas
          </button>
          
          <button 
            className={`nav-item ${selectedPage === 'projects-list' ? 'active' : ''}`}
            onClick={() => onSelectPage('projects-list')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
            Projetos
          </button>

          <button 
            className={`nav-item ${selectedPage === 'optimizer' ? 'active' : ''}`}
            onClick={() => onSelectPage('optimizer')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Otimizador
          </button>
        </nav>
      </div>

      <div className="sidebar-history">
        <p className="sidebar-label">Recentes</p>
        {filteredChats.length === 0 ? (
          <div className="sidebar-empty">Nada encontrado.</div>
        ) : (
          filteredChats.map((chat) => (
            <div
              key={chat.id}
              className={`sidebar-item ${selectedChatId === chat.id ? 'active' : ''} ${chat.is_pinned ? 'pinned' : ''}`}
              onClick={() => onSelectChat(chat.id)}
            >
              <div className="sidebar-item-main">
                <span>{chat.title}</span>
              </div>

              <div className="sidebar-actions">
                <button 
                  onClick={(e) => { e.stopPropagation(); onPinChat(chat.id, chat.is_pinned); }} 
                  title={chat.is_pinned ? 'Desafixar' : 'Fixar'}
                  className={chat.is_pinned ? 'active' : ''}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 2v8m0 0l-4 4m4-4l4 4m-4-12v12" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button onClick={(e) => handleRename(e, chat.id, chat.title)} title="Renomear">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button onClick={(e) => { e.stopPropagation(); onDeleteChat(chat.id); }} title="Excluir" className="btn-delete">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="sidebar-footer">
        <button className="btn-all-chats">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>
          </svg>
          Todas as conversas
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="chevron">
            <path d="m6 9 6 6 6-6"/>
          </svg>
        </button>

        <div className="user-profile" onClick={() => onSelectChat('settings')}>
          <div className="user-avatar">T</div>
          <div className="user-info">
            <span className="user-name">tiago</span>
            <span className="user-plan">plano Gratuito</span>
          </div>
          <div className="user-actions">
            <button title="Download"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg></button>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="selector"><path d="m7 15 5 5 5-5M7 9l5-5 5 5"/></svg>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
