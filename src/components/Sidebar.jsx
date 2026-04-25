import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const Sidebar = ({ 
  onSelectChat, 
  selectedChatId, 
  onNewChat, 
  session, 
  chats,
  onDeleteChat,
  onRenameChat,
  onPinChat
}) => {
  const handleRename = (e, id, currentTitle) => {
    e.stopPropagation();
    const newTitle = prompt('Novo título da conversa:', currentTitle);
    if (newTitle && newTitle !== currentTitle) {
      onRenameChat(id, newTitle);
    }
  };

  return (
    <aside className="sidebar glass">
      <button className="btn-new-chat" onClick={onNewChat}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Nova Conversa
      </button>

      <div className="sidebar-history">
        <p className="sidebar-label">Histórico</p>
        {!chats || chats.length === 0 ? (
          <div className="sidebar-empty">Nenhuma conversa ainda.</div>
        ) : (
          chats.map((chat) => (
            <div
              key={chat.id}
              className={`sidebar-item ${selectedChatId === chat.id ? 'active' : ''} ${chat.is_pinned ? 'pinned' : ''}`}
              onClick={() => onSelectChat(chat.id)}
            >
              <div className="sidebar-item-main">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="chat-icon">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <span title={chat.title}>{chat.title}</span>
              </div>

              <div className="sidebar-actions">
                <button 
                  onClick={(e) => { e.stopPropagation(); onPinChat(chat.id, chat.is_pinned); }} 
                  title={chat.is_pinned ? 'Desafixar' : 'Fixar'}
                  className={chat.is_pinned ? 'active' : ''}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v8m0 0l-4 4m4-4l4 4m-4-12v12" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button onClick={(e) => handleRename(e, chat.id, chat.title)} title="Renomear">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button onClick={(e) => { e.stopPropagation(); onDeleteChat(chat.id); }} title="Excluir" className="btn-delete">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
