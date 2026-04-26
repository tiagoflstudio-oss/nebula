import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import './AllChatsPage.css';

const AllChatsPage = ({ session, onSelectChat }) => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchGlobalChats();
  }, [session]);

  const fetchGlobalChats = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('chats')
        .select(`
          *,
          projects:project_id (title)
        `)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setChats(data || []);
    } catch (error) {
      console.error('Erro ao buscar conversas:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredChats = chats.filter(chat => 
    chat.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (chat.projects?.title || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="all-chats-page fade-in">
      <header className="all-chats-header">
        <div className="header-info">
          <h1>Histórico de Conversas</h1>
          <p>Gerencie todas as suas interações no Nebula AI</p>
        </div>
        <div className="header-search glass">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
          <input 
            type="text" 
            placeholder="Pesquisar em todas as conversas..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      <div className="chats-grid">
        {loading ? (
          <div className="loading-state">Carregando histórico...</div>
        ) : filteredChats.length === 0 ? (
          <div className="empty-state glass">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <p>Nenhuma conversa encontrada.</p>
          </div>
        ) : (
          filteredChats.map(chat => (
            <div 
              key={chat.id} 
              className="chat-card glass fade-in"
              onClick={() => onSelectChat(chat.id)}
            >
              <div className="chat-card-header">
                <div className="chat-project-badge">
                  {chat.projects?.title || 'Sem Projeto'}
                </div>
                {chat.is_pinned && (
                  <div className="pin-icon">
                    <svg viewBox="0 0 24 24" fill="currentColor" width="14">
                      <path d="M12 2v8m0 0l-4 4m4-4l4 4m-4-12v12" />
                    </svg>
                  </div>
                )}
              </div>
              <h3 className="chat-card-title">{chat.title}</h3>
              <div className="chat-card-footer">
                <span className="chat-date">{formatDate(chat.created_at)}</span>
                <div className="chat-arrow">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14">
                    <path d="m9 18 6-6-6-6"/>
                  </svg>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AllChatsPage;
