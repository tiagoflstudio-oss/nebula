import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { supabase } from './lib/supabaseClient.js';
import './App.css';
import Background from './components/Background.jsx';
import Chat from './components/Chat.jsx';
import AdminPanel from './components/AdminPanel.jsx';
import Navbar from './components/Navbar.jsx';
import Sidebar from './components/Sidebar.jsx';
import Auth from './components/Auth.jsx';
import AdminPage from './pages/AdminPage.jsx';

function App() {
  const [session, setSession] = useState(null);
  const [chats, setChats] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [config, setConfig] = useState({
    ip: 'localhost',
    port: '11434',
    model: 'llama3'
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      fetchChats();
    }
  }, [session]);

  const fetchChats = async () => {
    try {
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      setChats(data || []);
    } catch (error) {
      console.error('Erro:', error.message);
    }
  };

  const handleNewChat = async () => {
    try {
      const { data, error } = await supabase
        .from('chats')
        .insert([{ user_id: session.user.id, title: 'Nova Conversa' }])
        .select();
      if (error) throw error;
      if (data) {
        setSelectedChatId(data[0].id);
        fetchChats();
      }
    } catch (error) {
      console.error('Erro:', error.message);
    }
  };

  const handleDeleteChat = async (id) => {
    if (!window.confirm('Excluir?')) return;
    try {
      await supabase.from('chats').delete().eq('id', id);
      if (selectedChatId === id) setSelectedChatId(null);
      fetchChats();
    } catch (error) {}
  };

  return (
    <Router>
      <div className="app-container">
        <Background />
        {session && (
          <Sidebar 
            session={session}
            chats={chats}
            selectedChatId={selectedChatId}
            onSelectChat={setSelectedChatId}
            onNewChat={handleNewChat}
            onDeleteChat={handleDeleteChat}
            onRenameChat={()=>{}}
            onPinChat={()=>{}}
          />
        )}
        <div className="main-wrapper">
          <Navbar session={session} />
          <div className="main-content">
            {!session ? (
              <Auth />
            ) : (
              <Routes>
                <Route path="/" element={
                  <>
                    <header className="fade-in">
                      <h1>Nebula <span>AI</span></h1>
                      <p>Minimalista</p>
                    </header>
                    <Chat ollamaConfig={config} chatId={selectedChatId} session={session} />
                    <AdminPanel config={config} setConfig={setConfig} />
                  </>
                } />
                <Route path="/admin" element={
                  session.user.email === 'tiagoflstudio@gmail.com' ? (
                    <AdminPage config={config} />
                  ) : (
                    <div>Acesso Negado</div>
                  )
                } />
              </Routes>
            )}
          </div>
        </div>
      </div>
    </Router>
  );
}

export default App;
