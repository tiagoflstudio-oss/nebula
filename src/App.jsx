import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
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
import AllChatsPage from './pages/AllChatsPage';
import RoadmapPage from './pages/RoadmapPage';
import Modal from './components/Modal';

function App() {
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState('user');
  const [chats, setChats] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [selectedPage, setSelectedPage] = useState('home');
  const [config, setConfig] = useState(() => {
    const saved = localStorage.getItem('nebula_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("❌ Erro ao parsear config do LocalStorage");
      }
    }
    return {
      ip: 'localhost',
      port: '11434',
      model: 'llama3',
      openai_key: '',
      anthropic_key: '',
      google_key: '',
      opencode_key: '',
      active_provider: 'ollama',
      openai_model: 'gpt-4o',
      anthropic_model: 'claude-3-5-sonnet-20240620',
      google_model: 'gemini-1.5-pro',
      ssh_key: '',
      user_photo: null
    };
  });

  const [modalConfig, setModalConfig] = useState({ 
    isOpen: false, 
    title: '', 
    message: '', 
    type: 'confirm', 
    initialValue: '', 
    onConfirm: () => {} 
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

  // Salvar configurações sempre que houver alteração (LocalStorage como backup rápido)
  useEffect(() => {
    localStorage.setItem('nebula_config', JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    if (session) {
      fetchProfile();
      fetchChats();
      fetchProjects();
    } else {
      setUserRole('user');
    }
  }, [session, selectedProjectId]);

  const fetchProfile = async () => {
    if (!session?.user) return;
    try {
      console.log("🔍 Nebula: Buscando perfil e configurações para:", session.user.email);
      const { data, error } = await supabase
        .from('profiles')
        .select('role, full_name, settings')
        .eq('id', session.user.id)
        .single();
      
      if (error) {
        console.error("❌ Nebula: Erro ao buscar perfil:", error.message);
      }

      if (data) {
        console.log("✅ Nebula: Cargo detectado:", data.role);
        setUserRole(data.role || 'user');
        if (data.settings) {
          console.log("✅ Nebula: Configurações sincronizadas da nuvem");
          setConfig(prev => ({ ...prev, ...data.settings }));
        }
      } else {
        console.warn("⚠️ Nebula: Perfil não encontrado no banco.");
      }
    } catch (error) {
      console.error('❌ Nebula: Erro crítico:', error);
    }
  };

  const handleSaveConfig = async (newConfig) => {
    if (!session?.user) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ settings: newConfig })
        .eq('id', session.user.id);
      
      if (error) throw error;
      console.log("✅ Nebula: Configurações salvas no Supabase");
      return true;
    } catch (error) {
      console.error("❌ Nebula: Erro ao salvar config:", error.message);
      return false;
    }
  };

  const fetchChats = async () => {
    if (!session) return;
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
    if (!session) return;
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    if (!error) setProjects(data || []);
  };

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const toggleSidebar = () => setIsSidebarCollapsed(!isSidebarCollapsed);

  const handleCreateProject = () => {
    setModalConfig({
      isOpen: true,
      title: 'Novo Projeto',
      message: 'Como você quer chamar o novo ambiente de cliente?',
      type: 'prompt',
      initialValue: '',
      onConfirm: async (title) => {
        if (!title) return;
        try {
          const { data, error } = await supabase
            .from('projects')
            .insert([{ user_id: session.user.id, title }])
            .select();
          if (error) throw error;
          setProjects([data[0], ...projects]);
          setModalConfig(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          console.error(error);
        }
      }
    });
  };

  const handleNewChat = () => {
    setSelectedChatId(null);
    setSelectedPage('home');
  };

  const handleDeleteChat = (id) => {
    setModalConfig({
      isOpen: true,
      title: 'Excluir Conversa',
      message: 'Tem certeza que deseja apagar este histórico permanentemente? Esta ação não pode ser desfeita.',
      type: 'confirm',
      onConfirm: async () => {
        try {
          await supabase.from('chats').delete().eq('id', id);
          if (selectedChatId === id) setSelectedChatId(null);
          fetchChats();
          setModalConfig(prev => ({ ...prev, isOpen: false }));
        } catch (error) {}
      }
    });
  };

  const handleRenameChat = (id, currentTitle) => {
    setModalConfig({
      isOpen: true,
      title: 'Renomear Conversa',
      message: 'Como você deseja chamar esta conversa?',
      type: 'prompt',
      initialValue: currentTitle,
      onConfirm: async (newTitle) => {
        if (!newTitle || newTitle === currentTitle) return;
        try {
          const { error } = await supabase
            .from('chats')
            .update({ title: newTitle })
            .eq('id', id);
          if (error) throw error;
          fetchChats();
          setModalConfig(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          console.error('Erro ao renomear:', error.message);
        }
      }
    });
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

  const handleDeleteProject = (id, title) => {
    console.log(`🗑️ Nebula: Solicitando exclusão do projeto: ${title} (${id})`);
    setModalConfig({
      isOpen: true,
      title: 'Excluir Projeto',
      message: `Tem certeza que deseja apagar o projeto "${title}"? Todas as conversas vinculadas a ele serão perdidas permanentemente.`,
      type: 'confirm',
      onConfirm: async () => {
        try {
          console.log(`🔥 Nebula: Executando DELETE no Supabase para ID: ${id}`);
          const { error } = await supabase.from('projects').delete().eq('id', id);
          if (error) throw error;
          
          console.log(`✅ Nebula: Projeto ${id} excluído com sucesso.`);
          if (selectedProjectId === id) setSelectedProjectId(null);
          fetchProjects();
          setModalConfig(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          console.error('❌ Nebula: Erro ao excluir projeto:', error.message);
        }
      }
    });
  };

  const renderContent = () => {
    if (selectedChatId === 'settings' || selectedPage === 'settings') {
      return (
        <SettingsPage 
          config={config} 
          setConfig={setConfig} 
          userRole={userRole} 
          session={session} 
          onSave={handleSaveConfig}
        />
      );
    }
    if (selectedPage === 'optimizer') return <OptimizerPage />;
    if (selectedPage === 'roadmap') return <RoadmapPage ollamaConfig={config} session={session} />;
    if (selectedPage === 'admin') return <AdminPage config={config} />;
    if (selectedPage === 'all-chats') {
      return (
        <AllChatsPage 
          session={session} 
          onSelectChat={(id) => {
            setSelectedChatId(id);
            setSelectedPage('home');
          }} 
        />
      );
    }
    if (selectedPage === 'projects-list') {
      return (
        <ProjectsListPage 
          projects={projects} 
          onCreateProject={handleCreateProject}
          onDeleteProject={handleDeleteProject}
          onSelectProject={(id) => {
            setSelectedProjectId(id);
            setSelectedPage('home');
          }}
        />
      );
    }
    
    if (selectedProjectId && !selectedChatId) {
      return <ProjectPage projectId={selectedProjectId} onSelectChat={setSelectedChatId} />;
    }
    
    return (
      <div className="chat-container">
        {!selectedChatId && (
          <div className="home-header fade-in">
          </div>
        )}
          <Chat 
            ollamaConfig={config} 
            setConfig={setConfig}
            chatId={selectedChatId} 
            session={session} 
            onChatCreated={(id) => {
              setSelectedChatId(id);
              fetchChats();
            }}
          />
        </div>
    );
  };

  return (
    <Router>
      <div className={`app-container ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Background />
        {!session ? (
          <Auth />
        ) : (
          <>
            <Sidebar 
              session={session}
              userRole={userRole}
              config={config}
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
              onNewChat={handleNewChat}
              selectedPage={selectedPage}
              onSelectPage={(page) => {
                setSelectedPage(page);
                setSelectedChatId(null);
                setSelectedProjectId(null);
              }}
              onDeleteChat={handleDeleteChat}
              onRenameChat={handleRenameChat}
              onPinChat={handlePinChat}
              isCollapsed={isSidebarCollapsed}
              onToggle={toggleSidebar}
            />
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
                {renderContent()}
              </div>
            </div>
          </>
        )}
        <Modal 
          {...modalConfig} 
          onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))} 
        />
      </div>
    </Router>
  );
}

export default App;
