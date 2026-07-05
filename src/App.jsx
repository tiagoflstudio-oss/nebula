import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { supabase } from './lib/supabaseClient';
import './App.css';
import Background from './components/Background.jsx';
import Chat from './components/Chat.jsx';
import AdminPanel from './components/AdminPanel.jsx';
import Navbar from './components/Navbar.jsx';
import Sidebar from './components/Sidebar';
import Auth from './components/Auth';
const AdminPage = lazy(() => import('./pages/AdminPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const ProjectPage = lazy(() => import('./pages/ProjectPage'));
const ProjectsListPage = lazy(() => import('./pages/ProjectsListPage'));
const AllChatsPage = lazy(() => import('./pages/AllChatsPage'));
const SupportPage = lazy(() => import('./pages/SupportPage'));
const ObservabilityPage = lazy(() => import('./pages/ObservabilityPage'));
import Modal from './components/Modal';
import { masterService } from './services/masterService';

function App() {
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState('user');
  const [globalSettings, setGlobalSettings] = useState(null);
  const [masterStats, setMasterStats] = useState({ userCount: 0 });
  const [chats, setChats] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [selectedPage, setSelectedPage] = useState('home');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
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
    onConfirm: () => { }
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

      // Busca perfil do usuário atual
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
      }

      // Busca configuração global (Prioridade: Admin > Primeiro VIP)
      // Busca até 5 admins/vips para encontrar aquele que realmente tem as chaves configuradas
      const { data: globalAdmins } = await supabase
        .from('profiles')
        .select('settings')
        .or('role.eq.admin,role.eq.vip')
        .order('role', { ascending: true }) // admin vem antes de vip alfabeticamente
        .order('created_at', { ascending: true })
        .limit(5);

      if (globalAdmins && globalAdmins.length > 0) {
        // Prioriza encontrar um admin que já tenha configurado o Cérebro Mestre (global_api_key)
        const activeGlobalAdmin = globalAdmins.find(admin => admin.settings && admin.settings.global_api_key);
        
        if (activeGlobalAdmin) {
          console.log("🌐 Nebula: Cérebro Mestre Global ativo detectado");
          setGlobalSettings(activeGlobalAdmin.settings);
        } else if (globalAdmins[0].settings) {
          console.log("🌐 Nebula: Cérebro Mestre Global base detectado");
          setGlobalSettings(globalAdmins[0].settings);
        }
      }

      // Busca estatísticas para o Master OS (Apenas para Admin/VIP)
      if (data?.role === 'admin' || data?.role === 'vip') {
        const { count } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        setMasterStats({ userCount: count || 0 });
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

      // Sincroniza com a infraestrutura do Master OS
      if (newConfig.global_api_key && newConfig.global_provider && session?.user?.id) {
        await masterService.saveProviderConnection(
          session.user.id,
          newConfig.global_provider,
          newConfig.global_api_key,
          newConfig.fetched_global_models || []
        );
      }

      setConfig(newConfig);
      setGlobalSettings(newConfig);
      console.log("✅ Nebula: Configurações e Infraestrutura sincronizadas");
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

  const [theme, setTheme] = useState(() => localStorage.getItem('nebula_theme') || 'dark');

  useEffect(() => {
    localStorage.setItem('nebula_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'pastel' : 'dark');

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
        } catch (error) { }
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
          console.log(`🔥 Nebula: Executando DELETE em cascata para chats do projeto: ${id}`);
          await supabase.from('chats').delete().eq('project_id', id);

          console.log(`🔥 Nebula: Executando DELETE no Supabase para ID: ${id}`);
          const { error } = await supabase.from('projects').delete().eq('id', id);
          if (error) throw error;

          console.log(`✅ Nebula: Projeto ${id} excluído com sucesso.`);

          // Atualização otimista da UI
          setProjects(prev => prev.filter(p => p.id !== id));

          if (selectedProjectId === id) setSelectedProjectId(null);
          setModalConfig(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          console.error('❌ Nebula: Erro ao excluir projeto:', error.message);
          alert('Erro ao excluir projeto: ' + error.message);
        }
      }
    });
  };

  const renderContent = () => {
    if (selectedChatId === 'settings' || selectedPage === 'settings' || selectedPage === 'settings-conexoes') {
      return (
        <SettingsPage
          initialSection={selectedPage === 'settings-conexoes' ? 'conexoes' : 'geral'}
          config={config}
          setConfig={setConfig}
          userRole={userRole}
          session={session}
          onSave={handleSaveConfig}
          setModalConfig={setModalConfig}
          globalSettings={globalSettings}
        />
      );
    }
    if (selectedPage === 'support') return <SupportPage config={config} session={session} />;
    if (selectedPage === 'observability') return <ObservabilityPage />;
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
          onRequireAuth={() => setIsAuthModalOpen(true)}
          globalSettings={globalSettings}
        />
      </div>
    );
  };

  return (
    <Router>
      <div className={`app-container ${isSidebarCollapsed ? 'sidebar-collapsed' : ''} theme-${theme}`}>
        <Background />
        {(!session && isAuthModalOpen) && (
          <Auth onClose={() => setIsAuthModalOpen(false)} />
        )}

        <Sidebar
          session={session}
          userRole={userRole}
          config={config}
          chats={chats}
          projects={projects}
          onToggleTheme={toggleTheme}
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
        <div className={`main-wrapper theme-${theme}`}>
          <Navbar
            session={session}
            userRole={userRole}
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
            onLoginClick={() => setIsAuthModalOpen(true)}
            theme={theme}
            onToggleTheme={toggleTheme}
          />
          <div className="main-content">
            <Suspense fallback={<div className="page-loading" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="nebula-spinner"></div></div>}>
              {renderContent()}
            </Suspense>
          </div>
        </div>
      </div>
      <Modal
        {...modalConfig}
        onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
      />
    </Router>
  );
}

export default App;
