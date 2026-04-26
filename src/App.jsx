import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { supabase } from './lib/supabaseClient';
import './App.css';
import Background from './components/Background.jsx';
import Chat from './components/Chat.jsx';
import AdminPanel from './components/AdminPanel.jsx';
import Navbar from './components/Navbar.jsx';
import Sidebar from './components/Sidebar';
import Auth from './components/Auth';
import AdminPage from './pages/AdminPage';
import SettingsPage from './pages/SettingsPage';
import ProjectPage from './pages/ProjectPage';
import OptimizerPage from './pages/OptimizerPage';
import ProjectsListPage from './pages/ProjectsListPage';

function App() {
  const [session, setSession] = useState(null);
  const [chats, setChats] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [selectedPage, setSelectedPage] = useState('home');
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
      fetchProjects();
    }
  }, [session, selectedProjectId]);

  const fetchChats = async () => {
    let query = supabase
      .from('chats')
      .select('*')
      .eq('user_id', session.user.id);
    
    if (selectedProjectId) {
      query = query.eq('project_id', selectedProjectId);
    }

    const { data, error } = await query.order('is_pinned', { ascending: false }).order('created_at', { ascending: false });
    if (!error) setChats(data || []);
  };

  const fetchProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    if (!error) setProjects(data || []);
  };

  const handleCreateProject = async () => {
    const title = prompt('Nome do novo projeto:');
    if (!title) return;
    try {
      const { data, error } = await supabase
        .from('projects')
        .insert([{ user_id: session.user.id, title }])
        .select();
      if (error) throw error;
      setProjects([data[0], ...projects]);
    } catch (error) {
      alert('Dica: Você precisa criar a tabela "projects" no seu Supabase com as colunas: id, user_id, title, created_at.');
      console.error(error);
    }
  };

  const handleNewChat = async () => {
    try {
      const { data, error } = await supabase
        .from('chats')
        .insert([{ user_id: session.user.id, title: 'Nova Conversa', project_id: selectedProjectId }])
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

  const handleRenameChat = async (id, newTitle) => {
    try {
      const { error } = await supabase
        .from('chats')
        .update({ title: newTitle })
        .eq('id', id);
      if (error) throw error;
      fetchChats();
    } catch (error) {
      console.error('Erro ao renomear:', error.message);
    }
  };

  const handlePinChat = async (id, isPinned) => {
    try {
      const { error } = await supabase
        .from('chats')
        .update({ is_pinned: !isPinned })
        .eq('id', id);
      if (error) throw error;
      fetchChats();
    } catch (error) {
      console.error('Erro ao fixar:', error.message);
    }
  };

  const renderContent = () => {
    if (selectedChatId === 'settings') return <SettingsPage />;
    if (selectedPage === 'optimizer') return <OptimizerPage />;
    if (selectedPage === 'admin') return <AdminPage config={config} />;
    if (selectedPage === 'projects-list') {
      return (
        <ProjectsListPage 
          projects={projects} 
          onCreateProject={handleCreateProject}
          onSelectProject={(id) => {
            setSelectedProjectId(id);
            setSelectedPage('home');
          }}
        />
      );
    }
    
    // Se um projeto está selecionado MAS não há um chat selecionado, mostra o Dashboard do Projeto
    if (selectedProjectId && !selectedChatId) {
      return <ProjectPage projectId={selectedProjectId} onSelectChat={setSelectedChatId} />;
    }
    
    // Se nada for selecionado, mostra o Chat ou a Home
    return (
      <div className="chat-container">
        {!selectedChatId && (
          <div className="home-header fade-in">
            <p>Inteligência Minimalista</p>
          </div>
        )}
        <Chat 
          ollamaConfig={config} 
          chatId={selectedChatId} 
          session={session} 
          onChatCreated={(id) => {
            setSelectedChatId(id);
            fetchChats();
          }}
        />
        <AdminPanel config={config} setConfig={setConfig} />
      </div>
    );
  };

  return (
    <Router>
      <div className="app-container">
        <Background />
        {session && (
          <Sidebar 
            session={session}
            chats={chats}
            projects={projects}
            selectedProjectId={selectedProjectId}
            onSelectProject={(id) => {
              setSelectedProjectId(id);
              setSelectedChatId(null);
              setSelectedPage('home');
            }}
            onCreateProject={handleCreateProject}
            selectedChatId={selectedChatId}
            onSelectChat={(id) => {
              setSelectedChatId(id);
              setSelectedPage('home');
            }}
            onNewChat={() => {
              setSelectedChatId(null);
              setSelectedPage('home');
            }}
            selectedPage={selectedPage}
            onSelectPage={(page) => {
              setSelectedPage(page);
              setSelectedChatId(null);
              setSelectedProjectId(null);
            }}
            onDeleteChat={handleDeleteChat}
            onRenameChat={handleRenameChat}
            onPinChat={handlePinChat}
          />
        )}
        <div className="main-wrapper">
          <Navbar 
            session={session} 
            selectedPage={selectedPage}
            onSelectPage={(page) => {
              setSelectedPage(page);
              setSelectedChatId(null);
              setSelectedProjectId(null);
            }}
            onHome={() => {
              setSelectedChatId(null);
              setSelectedProjectId(null);
              setSelectedPage('home');
            }} 
          />
          <div className="main-content">
            {!session ? (
              <Auth />
            ) : (
              renderContent()
            )}
          </div>
        </div>
      </div>
    </Router>
  );
}

export default App;
