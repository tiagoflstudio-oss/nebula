import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const Sidebar = ({ onSelectChat, selectedChatId, onNewChat, session, chats }) => {
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
              className={`sidebar-item ${selectedChatId === chat.id ? 'active' : ''}`}
              onClick={() => onSelectChat(chat.id)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span>{chat.title}</span>
            </div>
          ))
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
