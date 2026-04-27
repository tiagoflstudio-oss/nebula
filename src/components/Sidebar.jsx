import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import './SidebarMinimal.css';

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
  onPinChat,
  isCollapsed,
  onToggle,
  session,
  userRole,
  config
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredChats = chats?.filter(chat => 
    chat.title.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <aside className={`sidebar glass ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <button className="btn-sidebar-toggle" onClick={onToggle} title={isCollapsed ? "Expandir" : "Recolher"}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="sidebar-top-actions">
        <button className="btn-new-chat" onClick={onNewChat} title="Nova conversa">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {!isCollapsed && <span>Nova conversa</span>}
        </button>

        {!isCollapsed && (
          <div className="sidebar-search fade-in">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
            </svg>
            <input 
              type="text" 
              placeholder="Procurar" 
              autoComplete="off"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        )}

        <nav className="sidebar-main-nav">
          <button 
            className={`nav-item ${!selectedProjectId && selectedPage === 'home' && !selectedChatId ? 'active' : ''}`} 
            onClick={() => {
              onSelectProject(null);
              onSelectChat(null);
              onSelectPage('home');
            }}
            title="Conversas"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            {!isCollapsed && <span>Conversas</span>}
          </button>
          
          <button 
            className={`nav-item ${selectedPage === 'projects-list' ? 'active' : ''}`}
            onClick={() => onSelectPage('projects-list')}
            title="Projetos"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
            {!isCollapsed && <span>Projetos</span>}
          </button>

          <button 
            className={`nav-item ${selectedPage === 'quota' ? 'active' : ''}`}
            onClick={() => onSelectPage('quota')}
            title="Rastreador de Cota"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {!isCollapsed && <span>Rastreador de Cota</span>}
          </button>

          <button 
            className={`nav-item ${selectedPage === 'optimizer' ? 'active' : ''}`}
            onClick={() => onSelectPage('optimizer')}
            title="Otimizador"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {!isCollapsed && <span>Otimizador</span>}
          </button>

          <button 
            className={`nav-item ${selectedPage === 'engineer' ? 'active' : ''}`}
            onClick={() => onSelectPage('engineer')}
            title="Engenheiro"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.77 3.77z"/>
            </svg>
            {!isCollapsed && <span>Engenheiro</span>}
          </button>


        </nav>
      </div>

      <div className="sidebar-history">
        {!isCollapsed && <p className="sidebar-label">Recentes</p>}
        {filteredChats.length === 0 ? (
          !isCollapsed && <div className="sidebar-empty">Nada encontrado.</div>
        ) : (
          filteredChats.map((chat) => (
            <div
              key={chat.id}
              className={`sidebar-item ${selectedChatId === chat.id ? 'active' : ''} ${chat.is_pinned ? 'pinned' : ''}`}
              onClick={() => onSelectChat(chat.id)}
              title={isCollapsed ? chat.title : ""}
            >
              <div className="sidebar-item-main">
                {isCollapsed ? (
                   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: '18px', opacity: 0.6}}>
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                   </svg>
                ) : (
                  <span>{chat.title}</span>
                )}
              </div>

              {!isCollapsed && (
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
                  <button onClick={(e) => { e.stopPropagation(); onRenameChat(chat.id, chat.title); }} title="Renomear">
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
              )}
            </div>
          ))
        )}
      </div>

      <div className="sidebar-footer">
        <button 
          className={`btn-all-chats ${selectedPage === 'all-chats' ? 'active' : ''}`} 
          title="Todas as conversas"
          onClick={() => onSelectPage('all-chats')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>
          </svg>
          {!isCollapsed && <span>Todas as conversas</span>}
          {!isCollapsed && (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="chevron">
              <path d="m6 9 6 6 6-6"/>
            </svg>
          )}
        </button>

        <div className="user-profile">
          <div className="user-avatar" onClick={() => onSelectPage('settings')} style={{ cursor: 'pointer' }}>
            {session?.user?.email?.[0].toUpperCase()}
          </div>
          {!isCollapsed && (
            <div className="user-info" onClick={() => onSelectPage('settings')} style={{ cursor: 'pointer' }}>
              <span className="user-name">{session?.user?.email?.split('@')[0]}</span>
              <span className="user-plan">{userRole === 'vip' ? 'Plano VIP' : 'Plano Gratuito'}</span>
            </div>
          )}
          {!isCollapsed && (
            <div className="user-actions">
              <button 
                title="Sair" 
                className="btn-logout"
                onClick={async () => {
                  const { error } = await supabase.auth.signOut();
                  if (error) console.error('Erro ao sair:', error.message);
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
