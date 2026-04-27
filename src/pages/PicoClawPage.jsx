import React, { useState, useEffect } from 'react';
import { bridgeService } from '../services/bridgeService';
import { skillService } from '../services/skillService';
import { supabase } from '../lib/supabaseClient';
import './PicoClawPage.css';

const PicoClawPage = ({ config, session, onSelectPage }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [activeView, setActiveView] = useState('grid'); // 'grid', 'terminal', 'audit', 'cron', 'skills'
  const [logs, setLogs] = useState([]);
  const [terminalOutput, setTerminalOutput] = useState([
    { type: 'info', content: 'Nebula Engine Terminal [Versão 1.0.4]' },
    { type: 'info', content: '(c) 2024 Nebula Corp. Todos os direitos reservados.' },
    { type: 'info', content: 'Conectado ao PicoClaw Core via Bridge Local.' },
    { type: 'output', content: 'Pronto para receber comandos. Digite "help" para ajuda.' }
  ]);
  const [command, setCommand] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [cronTasks, setCronTasks] = useState([]);
  const [newCron, setNewCron] = useState({ name: '', schedule: '0 0 * * *', command: '' });
  const [skills, setSkills] = useState([]);
  const [newSkill, setNewSkill] = useState({ name: '', description: '', command_template: '', category: 'utility' });

  useEffect(() => {
    if (activeView === 'audit') fetchLogs();
    if (activeView === 'cron') fetchTasks();
    if (activeView === 'skills') fetchSkills();
    if (activeView === 'terminal') {
      setTimeout(() => {
        const input = document.querySelector('.terminal-input input');
        if (input) input.focus();
      }, 100);
    }
  }, [activeView]);

  const fetchLogs = async () => {
    try {
      // Agora buscamos diretamente do Supabase para persistência eterna
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;

      // Mapeia para o formato da UI
      const formattedLogs = data.map(log => ({
        id: log.id,
        timestamp: log.created_at,
        message: log.message,
        type: log.status || 'info'
      }));

      setLogs(formattedLogs);
    } catch (e) {
      console.error('Erro ao buscar logs do Supabase:', e);
    }
  };

  const fetchTasks = async () => {
    try {
      const data = await bridgeService.getCronTasks();
      setCronTasks(data);
    } catch (e) {
      console.error('Erro ao buscar tarefas:', e);
    }
  };

  const handleAddCron = async (e) => {
    e.preventDefault();
    if (!newCron.name || !newCron.command) return alert('Preencha nome e comando');
    
    try {
      const res = await bridgeService.addCronTask({
        id: `cron-${Date.now()}`,
        ...newCron
      });
      if (res.success) {
        fetchTasks();
        setNewCron({ name: '', schedule: '0 0 * * *', command: '' });
        alert('Tarefa agendada com sucesso!');
      }
    } catch (e) {
      alert('Erro ao agendar: ' + e.message);
    }
  };

  const handleDeleteCron = async (id) => {
    if (!confirm('Excluir este agendamento?')) return;
    try {
      const res = await bridgeService.deleteCronTask(id);
      if (res.success) fetchTasks();
    } catch (e) {
      alert('Erro ao excluir: ' + e.message);
    }
  };

  const fetchSkills = async () => {
    try {
      const data = await skillService.getSkills();
      setSkills(data);
    } catch (e) {
      console.error('Erro ao buscar skills:', e);
    }
  };

  const handleAddSkill = async (e) => {
    e.preventDefault();
    if (!newSkill.name || !newSkill.command_template) return alert('Preencha nome e comando');
    
    try {
      const res = await skillService.createSkill(newSkill);
      if (res.success) {
        fetchSkills();
        setNewSkill({ name: '', description: '', command_template: '', category: 'utility' });
        alert('Skill cadastrada com sucesso!');
      }
    } catch (e) {
      alert('Erro ao cadastrar: ' + e.message);
    }
  };

  const handleDeleteSkill = async (id) => {
    if (!confirm('Remover esta skill permanentemente?')) return;
    try {
      const res = await skillService.deleteSkill(id);
      if (res.success) fetchSkills();
    } catch (e) {
      alert('Erro ao excluir: ' + e.message);
    }
  };

  const handleExecute = async (e) => {
    e.preventDefault();
    if (!command.trim()) return;

    setIsExecuting(true);
    setTerminalOutput(prev => [...prev, { type: 'input', content: command }]);
    
    try {
      const res = await bridgeService.executeCommand(command);
      let output = '';
      let status = 'success';

      if (res.stdout) {
        setTerminalOutput(prev => [...prev, { type: 'output', content: res.stdout }]);
        output = res.stdout;
      }
      if (res.stderr) {
        setTerminalOutput(prev => [...prev, { type: 'error', content: res.stderr }]);
        output = res.stderr;
        status = 'warning';
      }
      if (res.error) {
        setTerminalOutput(prev => [...prev, { type: 'error', content: res.error }]);
        output = res.error;
        status = 'error';
      }

      // GRAVAÇÃO NO SUPABASE (Auditoria Eterna)
      await supabase.from('audit_logs').insert([{
        user_id: session?.user?.id,
        action_type: 'terminal_cmd',
        message: `Executou: ${command}`,
        status: status,
        metadata: {
          command: command,
          output: output.substring(0, 1000) // Limita tamanho do log
        }
      }]);

    } catch (err) {
      setTerminalOutput(prev => [...prev, { type: 'error', content: err.message }]);
      
      await supabase.from('audit_logs').insert([{
        user_id: session?.user?.id,
        action_type: 'terminal_cmd',
        message: `Falha ao executar: ${command}`,
        status: 'error',
        metadata: { error: err.message }
      }]);
    } finally {
      setIsExecuting(false);
      setCommand('');
      // Atualiza a lista de logs se estiver na aba de auditoria
      if (activeView === 'audit') fetchLogs();
    }
  };

  const tools = [
    {
      id: 'search',
      name: 'Web Intelligence',
      icon: '🌐',
      description: 'Busca em tempo real usando DuckDuckGo, Tavily e Perplexity.',
      status: 'Ativo',
      capabilities: ['Pesquisa Profunda', 'Extração de Conteúdo', 'Análise de Tendências']
    },
    {
      id: 'mcp',
      name: 'MCP Protocol',
      icon: '🔌',
      description: 'Conectividade nativa com Model Context Protocol para ferramentas externas.',
      status: 'Pronto',
      capabilities: ['Servidores Stdio', 'Integração Local', 'Bridge de Dados']
    },
    {
      id: 'engineer',
      name: 'Full-Stack Engine',
      icon: '💻',
      description: 'Execução de código, deploy automatizado e gestão de infraestrutura.',
      status: 'Ativo',
      capabilities: ['Sandbox Segura', 'Multi-linguagem', 'Hot-Reload']
    },
    {
      id: 'vision',
      name: 'Vision Pipeline',
      icon: '👁️',
      description: 'Processamento multimodal de imagens e documentos complexos.',
      status: 'Otimizado',
      capabilities: ['OCR Avançado', 'Análise Espacial', 'Descrição de Imagem']
    },
    {
      id: 'cron',
      name: 'Automated Cron',
      icon: '⏰',
      description: 'Agendamento de tarefas recorrentes e lembretes inteligentes.',
      status: 'Ativo',
      capabilities: ['Agendamento Cron', 'Lembretes NLP', 'Workflows Recorrentes']
    },
    {
      id: 'steering',
      name: 'Steering Protocol',
      icon: '🎯',
      description: 'Supervisão e correção de agentes em tempo real (PicoClaw Control).',
      status: 'Monitorando',
      capabilities: ['Steering em Tempo Real', 'Auto-Auditoria', 'Safe-Guard']
    },
    {
      id: 'skills',
      name: 'Nebula Skill Builder',
      icon: '🧠',
      description: 'Criação e gestão de habilidades práticas para a Nebula aprender.',
      status: 'Novo',
      capabilities: ['Habilidades Custom', 'Comandos Shell', 'Exposure']
    },
    {
      id: 'orch',
      name: 'Orchestration Hub',
      icon: '🧠',
      description: 'Gestão de enxames de sub-agentes especialistas para tarefas complexas.',
      status: 'Pronto',
      capabilities: ['Swarm Intel', 'Paralelismo', 'Baton-Passing']
    },
    {
      id: 'sandbox',
      name: 'Code Sandbox',
      icon: '⚡',
      description: 'IDE segura para prototipagem rápida e execução de scripts em ambiente isolado.',
      status: 'Ativo',
      capabilities: ['Hot-Reload', 'Isolated', 'Multi-Lang']
    }
  ];

  const stats = [
    { label: 'RAM Usage', value: '< 10MB', sub: 'Ultra-Eficiente' },
    { label: 'Boot Time', value: '< 1s', sub: 'Instantâneo' },
    { label: 'Arquitetura', value: 'Go Native', sub: 'Zero Dependência' },
    { label: 'Conexões', value: '17+', sub: 'Canais Ativos' }
  ];

  return (
    <div className="picoclaw-page fade-in">
      <div className="picoclaw-hero">
        <div className="hero-content">
          <div className="badge-pico">PICO CLAW CORE</div>
          <h1>Supervisão & Orquestração</h1>
          <p>Potencializando o Nebula com a eficiência e segurança do ecossistema PicoClaw.</p>
        </div>
        <div className="hero-stats">
          {stats.map((stat, i) => (
            <div key={i} className="stat-card glass">
              <span className="stat-value">{stat.value}</span>
              <span className="stat-label">{stat.label}</span>
              <span className="stat-sub">{stat.sub}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="picoclaw-nav glass">
        <button className={activeView === 'grid' ? 'active' : ''} onClick={() => setActiveView('grid')}>
          <span className="material-symbols-outlined">grid_view</span> Ferramentas
        </button>
        <button className={activeView === 'terminal' ? 'active' : ''} onClick={() => setActiveView('terminal')}>
          <span className="material-symbols-outlined">terminal</span> Terminal
        </button>
        <button className={activeView === 'cron' ? 'active' : ''} onClick={() => setActiveView('cron')}>
          <span className="material-symbols-outlined">schedule</span> Agendamentos
        </button>
        <button className={activeView === 'audit' ? 'active' : ''} onClick={() => setActiveView('audit')}>
          <span className="material-symbols-outlined">description</span> Auditoria
        </button>
        <button className={activeView === 'skills' ? 'active' : ''} onClick={() => setActiveView('skills')}>
          <span className="material-symbols-outlined">psychology</span> Skills
        </button>
      </div>

      {activeView === 'grid' && (
        <div className="picoclaw-grid">
          {tools.map((tool) => (
            <div key={tool.id} className="tool-card glass-premium">
              <div className="tool-header">
                <span className="tool-icon">{tool.icon}</span>
                <span className={`status-badge ${tool.status.toLowerCase()}`}>{tool.status}</span>
              </div>
              <div className="tool-body">
                <h3>{tool.name}</h3>
                <p>{tool.description}</p>
                <div className="capability-tags">
                  {tool.capabilities.map((cap, j) => (
                    <span key={j} className="cap-tag">{cap}</span>
                  ))}
                </div>
              </div>
              <div className="tool-footer">
                <button 
                  className="btn-action-pico"
                  onClick={() => {
                    if (tool.id === 'cron') setActiveView('cron');
                    else if (tool.id === 'engineer') setActiveView('terminal');
                    else onSelectPage(tool.id);
                  }}
                >
                  Abrir Ferramenta
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeView === 'terminal' && (
        <div className="terminal-container glass fade-in">
          <div className="terminal-header">
            <h3>Nebula Engine Terminal</h3>
            <div className="terminal-controls">
              <span className="dot red"></span>
              <span className="dot yellow"></span>
              <span className="dot green"></span>
            </div>
          </div>
          <div className="terminal-body">
            {terminalOutput.map((line, i) => (
              <div key={i} className={`terminal-line ${line.type}`}>
                {line.type === 'input' && <span className="prompt">$</span>}
                <pre>{line.content}</pre>
              </div>
            ))}
            {isExecuting && <div className="terminal-line info"><span className="nebula-spinner small"></span> Executando...</div>}
          </div>
          <form className="terminal-input" onSubmit={handleExecute}>
            <span className="prompt">nebula@root:~$</span>
            <input 
              type="text" 
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="Digite um comando shell..."
              autoFocus
            />
          </form>
        </div>
      )}

      {activeView === 'audit' && (
        <div className="audit-container glass fade-in">
          <div className="section-header">
            <h3>Logs de Auditoria PicoClaw</h3>
            <button className="btn-refresh" onClick={fetchLogs}><span className="material-symbols-outlined">sync</span></button>
          </div>
           <div className="audit-list">
             {logs.length === 0 ? (
               <div className="empty-logs">Nenhum log de auditoria encontrado na nuvem.</div>
             ) : (
               logs.map((log) => (
                 <div key={log.id} className={`audit-item ${log.type}`}>
                   <span className="timestamp">[{new Date(log.timestamp).toLocaleString()}]</span>
                   <span className="message">{log.message}</span>
                   <span className="type-badge">{log.type}</span>
                 </div>
               ))
             )}
           </div>
        </div>
      )}

      {activeView === 'cron' && (
        <div className="cron-container glass fade-in">
          <div className="cron-layout">
            <div className="cron-form glass">
              <h4>Novo Agendamento</h4>
              <form onSubmit={handleAddCron}>
                <div className="form-group">
                  <label>Nome da Tarefa</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Backup Diário"
                    value={newCron.name}
                    onChange={e => setNewCron({...newCron, name: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Expressão Cron (Minute Hour Day Month DayOfWeek)</label>
                  <input 
                    type="text" 
                    placeholder="0 22 * * *"
                    value={newCron.schedule}
                    onChange={e => setNewCron({...newCron, schedule: e.target.value})}
                  />
                  <small>Ex: "0 0 * * *" = Meia-noite todo dia.</small>
                </div>
                <div className="form-group">
                  <label>Comando Shell</label>
                  <textarea 
                    placeholder="Ex: copy C:\data C:\backup"
                    value={newCron.command}
                    onChange={e => setNewCron({...newCron, command: e.target.value})}
                  />
                </div>
                <button type="submit" className="btn-action-pico">Agendar Tarefa</button>
              </form>
            </div>

            <div className="cron-list-section">
              <h4>Tarefas Ativas</h4>
              <div className="cron-list">
                {cronTasks.length === 0 ? (
                  <p className="empty-state">Nenhuma tarefa agendada.</p>
                ) : (
                  cronTasks.map(task => (
                    <div key={task.id} className="cron-item glass">
                      <div className="task-info">
                        <strong>{task.name}</strong>
                        <code>{task.schedule}</code>
                      </div>
                      <button className="btn-delete-cron" onClick={() => handleDeleteCron(task.id)}>
                        <span className="material-symbols-outlined">delete</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeView === 'skills' && (
        <div className="cron-container glass fade-in">
          <div className="cron-layout">
            <div className="cron-form glass">
              <h4>Nebula Skill Builder</h4>
              <p style={{fontSize: '0.8rem', color: '#94a3b8', marginBottom: '1.5rem'}}>
                Crie habilidades que a Nebula poderá aprender e usar no chat.
              </p>
              <form onSubmit={handleAddSkill}>
                <div className="form-group">
                  <label>Nome da Habilidade</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Otimizador de Sistema"
                    value={newSkill.name}
                    onChange={e => setNewSkill({...newSkill, name: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Descrição para a IA</label>
                  <textarea 
                    placeholder="Explique o que essa skill faz para que a Nebula saiba quando usá-la."
                    value={newSkill.description}
                    onChange={e => setNewSkill({...newSkill, description: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Comando Shell (Template)</label>
                  <input 
                    type="text" 
                    placeholder="Ex: sfc /scannow"
                    value={newSkill.command_template}
                    onChange={e => setNewSkill({...newSkill, command_template: e.target.value})}
                  />
                </div>
                <button type="submit" className="btn-action-pico">Criar Skill</button>
              </form>
            </div>

            <div className="cron-list-section">
              <h4>Músculos da Nebula</h4>
              <div className="cron-list">
                {skills.length === 0 ? (
                  <p className="empty-state">Nenhuma skill aprendida.</p>
                ) : (
                  skills.map(skill => (
                    <div key={skill.id} className="cron-item glass">
                      <div className="task-info">
                        <strong>{skill.name}</strong>
                        <small style={{color: '#94a3b8', display: 'block'}}>{skill.description.substring(0, 50)}...</small>
                        <code>{skill.command_template}</code>
                      </div>
                      <button className="btn-delete-cron" onClick={() => handleDeleteSkill(skill.id)}>
                        <span className="material-symbols-outlined">delete</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PicoClawPage;
