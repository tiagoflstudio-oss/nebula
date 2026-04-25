import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { supabase } from './lib/supabaseClient';
import './App.css';
import Background from './components/Background';
import Chat from './components/Chat';
import AdminPanel from './components/AdminPanel';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Auth from './components/Auth';
import AdminPage from './pages/AdminPage';

function App() {
  const [session, setSession] = useState(null);
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

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleNewChat = async () => {
    try {
      const { data, error } = await supabase
        .from('chats')
        .insert([{ user_id: session.user.id, title: 'Nova Conversa' }])
        .select();

      if (error) throw error;
      if (data) setSelectedChatId(data[0].id);
    } catch (error) {
      console.error('Erro ao criar novo chat:', error.message);
    }
  };

  return (
    <Router>
      <div className="app-container">
        <Background />
        
        {session && (
          <Sidebar 
            session={session}
            selectedChatId={selectedChatId}
            onSelectChat={setSelectedChatId}
            onNewChat={handleNewChat}
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
                      <p>Inteligência Artificial Minimalista</p>
                    </header>
                    <Chat 
                      ollamaConfig={config} 
                      chatId={selectedChatId} 
                      session={session}
                    />
                    <AdminPanel config={config} setConfig={setConfig} />
                  </>
                } />
                <Route path="/admin" element={
                  session.user.email === 'tiagoflstudio@gmail.com' ? (
                    <AdminPage config={config} />
                  ) : (
                    <div className="glass glass-card fade-in" style={{ padding: '40px', textAlign: 'center', maxWidth: '400px' }}>
                      <h2>Acesso Negado</h2>
                      <p style={{ margin: '15px 0', color: 'var(--text-secondary)' }}>Você não tem permissão para acessar esta área.</p>
                      <button className="btn-auth" onClick={() => window.location.href = '/'}>Voltar ao Chat</button>
                    </div>
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
