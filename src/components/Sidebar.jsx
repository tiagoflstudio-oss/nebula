import React, { useState, useEffect, useRef } from 'react';
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
  config,
  onToggleTheme
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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
            className={`nav-item ${selectedPage === 'observability' ? 'active' : ''}`}
            onClick={() => onSelectPage('observability')}
            title="Observabilidade"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {!isCollapsed && <span>Observabilidade</span>}
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

        <div className="user-menu-wrapper" ref={menuRef}>
          {isUserMenuOpen && session && !isCollapsed && (
            <div className="user-menu-popover">
              <div className="user-menu-item" onClick={() => { setIsUserMenuOpen(false); onSelectPage('settings'); }}>
                <span className="material-symbols-outlined">settings</span>
                Configurações
              </div>
              <div className="user-menu-item" onClick={() => { setIsUserMenuOpen(false); if (onToggleTheme) onToggleTheme(); }}>
                <span className="material-symbols-outlined">palette</span>
                Tema
              </div>
              <div className="user-menu-item" onClick={() => { setIsUserMenuOpen(false); onSelectPage('observability'); }}>
                <span className="material-symbols-outlined">monitoring</span>
                Observabilidade
              </div>
              <div className="user-menu-item" onClick={() => { setIsUserMenuOpen(false); onSelectPage('settings-conexoes'); }}>
                <span className="material-symbols-outlined">person</span>
                Contexto Pessoal
              </div>
              
              <div className="user-menu-divider"></div>
              
              <div className="user-menu-item" onClick={() => { setIsUserMenuOpen(false); onSelectPage('support'); }}>
                <span className="material-symbols-outlined">help</span>
                Ajuda
              </div>
              
              <div className="user-menu-divider"></div>
              
              <div className="user-menu-item logout" onClick={async () => {
                setIsUserMenuOpen(false);
                const { error } = await supabase.auth.signOut();
                if (error) console.error('Erro ao sair:', error.message);
              }}>
                <span className="material-symbols-outlined">logout</span>
                Sair
              </div>
            </div>
          )}

          <div 
            className="user-profile" 
            onClick={() => {
              if (!session) return;
              if (isCollapsed) {
                onToggle();
                setTimeout(() => setIsUserMenuOpen(true), 300);
              } else {
                setIsUserMenuOpen(!isUserMenuOpen);
              }
            }} 
            style={{ cursor: session ? 'pointer' : 'default' }}
          >
            <div className="user-avatar">
              {session ? session.user?.email?.[0].toUpperCase() : '?'}
            </div>
            {!isCollapsed && (
              <div className="user-info">
                <span className="user-name">{session ? session.user?.email?.split('@')[0] : 'Visitante'}</span>
                <span className="user-plan">{session ? (userRole === 'vip' ? 'Plano VIP' : 'Plano Gratuito') : 'Modo Demonstração'}</span>
              </div>
            )}
            {!isCollapsed && session && (
               <svg className="menu-expand-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                 <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round"/>
               </svg>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
