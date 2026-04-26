import React, { useState } from 'react';
import './EngineerPage.css';

const EngineerPage = ({ config }) => {
  const [activeStep, setActiveStep] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [activeMentor, setActiveMentor] = useState(null);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);

  // Verifica se a IA Global está ativa
  const isGlobalIA = config?.global_ia_enabled;
  const globalModel = config?.global_model || 'GPT-4o';

  const steps = [
    {
      id: "nucleo",
      title: "Núcleo do Projeto",
      subtitle: "Fundação obrigatória",
      icon: "🏗️",
      items: [
        { 
          id: "readme",
          name: "README.md", 
          status: "obrigatório", 
          desc: "O cartão de visitas do seu projeto.",
          study: {
            why: "É o primeiro arquivo que qualquer pessoa (ou IA) lê. Sem ele, seu projeto é um mistério.",
            what: "Visão geral, guia de instalação, como rodar, stack tecnológica, screenshots e licença.",
            how: "Use Markdown. Seja direto e visual. Mostre o valor do projeto nos primeiros 3 segundos."
          }
        },
        { 
          id: "roadmap",
          name: "ROADMAP.md", 
          status: "obrigatório", 
          desc: "A visão de futuro e backlog.",
          study: {
            why: "Mantém o foco no que importa e evita o 'feature creep' (adicionar coisas inúteis).",
            what: "Divisão por fases (MVP, v1, v2), milestones alcançados e backlog de features.",
            how: "Organize por prioridade. Use check-boxes para mostrar progresso real."
          }
        },
        { 
          id: "architecture",
          name: "ARCHITECTURE.md", 
          status: "obrigatório", 
          desc: "O mapa mental do sistema.",
          study: {
            why: "Crucial para escalar. Ajuda novos devs (e IAs) a entenderem como os dados fluem.",
            what: "Diagramas C4, fluxo de dados entre frontend/backend/banco, decisões técnicas.",
            how: "Use Mermaid.js para diagramas em código. Foque nas integrações principais."
          }
        },
        { 
          id: "stack",
          name: "STACK.md", 
          status: "obrigatório", 
          desc: "As ferramentas escolhidas.",
          study: {
            why: "Justifica por que você escolheu a tecnologia X em vez da Y.",
            what: "Lista de linguagens, frameworks, bibliotecas principais e versões.",
            how: "Explique o benefício de cada escolha. Ex: 'React por ser baseado em componentes'."
          }
        },
        { 
          id: "changelog",
          name: "CHANGELOG.md", 
          status: "recomendado", 
          desc: "O histórico de evolução.",
          study: {
            why: "Transparência total. Ajuda a identificar quando um bug foi introduzido.",
            what: "Log de versões seguindo o padrão Keep a Changelog (Added, Changed, Fixed).",
            how: "Sempre que fizer um release, anote as mudanças principais. Não confie na memória."
          }
        },
        { 
          id: "env",
          name: ".env.example", 
          status: "obrigatório", 
          desc: "Guia de variáveis de ambiente.",
          study: {
            why: "Segurança e agilidade. Permite que outros configurem o projeto sem vazar senhas.",
            what: "Lista de chaves necessárias (API_KEY, DB_URL) com valores de exemplo ou vazios.",
            how: "NUNCA suba o .env original. O .example é o seu template público."
          }
        }
      ]
    },
    {
      id: "ide",
      title: "Regras para IA (IDE)",
      subtitle: "Sintonia Fina",
      icon: "🤖",
      items: [
        { 
          id: "cursor",
          name: ".cursorrules", 
          status: "IDE rule", 
          desc: "Domine o Cursor AI.",
          study: {
            why: "Faz a IA da IDE entender o seu contexto específico de código sem você precisar explicar toda vez.",
            what: "Instruções de estilo de código, patterns preferidos e pastas a ignorar.",
            how: "Seja específico. Ex: 'Sempre use hooks do React e siga o padrão Clean Code'."
          }
        },
        { 
          id: "claude",
          name: "CLAUDE.md", 
          status: "IDE rule", 
          desc: "Guia para o Claude Code.",
          study: {
            why: "Otimiza a performance do Claude ao trabalhar no seu terminal.",
            what: "Comandos de build, teste e regras de linting que a IA deve seguir.",
            how: "Mantenha atualizado com os comandos que você realmente usa no dia a dia."
          }
        },
        { 
          id: "windsurf",
          name: ".windsurfrules", 
          status: "IDE rule", 
          desc: "Regras para Windsurf.",
          study: {
            why: "Garante consistência na geração de código dentro do editor Windsurf.",
            what: "Preferências de estrutura de arquivos e convenções de nomenclatura.",
            how: "Replique as regras principais do seu projeto para evitar que a IA invente padrões."
          }
        },
        { 
          id: "sysprompt",
          name: "SYSTEM_PROMPT.md", 
          status: "IA prompt", 
          desc: "O DNA da IA no projeto.",
          study: {
            why: "É a 'personalidade' da IA dentro do seu projeto.",
            what: "Definição de papel, restrições, stack e tom de voz da IA.",
            how: "Crie um prompt que coloque a IA como um Arquiteto Sênior do seu projeto específico."
          }
        }
      ]
    },
    {
      id: "qualidade",
      title: "Qualidade e Padrões",
      subtitle: "Governança de Código",
      icon: "🛡️",
      items: [
        { 
          id: "contributing",
          name: "CONTRIBUTING.md", 
          status: "recomendado", 
          desc: "Como colaborar no projeto.",
          study: {
            why: "Padroniza como novos devs entram no projeto sem causar caos.",
            what: "Processo de PR, padrão de commits, como rodar testes locais.",
            how: "Seja acolhedor, mas firme nos padrões. Use templates de PR."
          }
        },
        { 
          id: "codestyle",
          name: "CODE_STYLE.md", 
          status: "recomendado", 
          desc: "O manual de estilo.",
          study: {
            why: "Garante que o código pareça ter sido escrito por uma única pessoa.",
            what: "Convenções de CamelCase vs snake_case, uso de aspas, indentação.",
            how: "Baseie-se em padrões famosos (Google, Airbnb) e adicione suas nuances."
          }
        },
        { 
          id: "testing",
          name: "TESTING.md", 
          status: "recomendado", 
          desc: "A estratégia de defesa.",
          study: {
            why: "Dá confiança para refatorar sem quebrar nada.",
            what: "Tipos de testes (unitário, integração, E2E), cobertura mínima, ferramentas.",
            how: "Explique como rodar os testes e como escrever um novo teste válido."
          }
        },
        { 
          id: "security",
          name: "SECURITY.md", 
          status: "recomendado", 
          desc: "Políticas de segurança.",
          study: {
            why: "Protege o projeto e os usuários de vulnerabilidades conhecidas.",
            what: "Como reportar vulnerabilidades, política de patches, melhores práticas.",
            how: "Foque na proteção de dados e autenticação segura."
          }
        },
        { 
          id: "editorconfig",
          name: ".editorconfig", 
          status: "obrigatório", 
          desc: "Consistência no editor.",
          study: {
            why: "Evita brigas de 'espaços vs tabs' no Git.",
            what: "Regras de indentação, charset, e final de linha automáticos.",
            how: "Coloque na raiz e deixe que o VS Code/Cursor faça o resto."
          }
        },
        { 
          id: "githubtemplates",
          name: ".github/templates", 
          status: "recomendado", 
          desc: "Automação de Issues/PRs.",
          study: {
            why: "Garante que todo report de bug ou PR venha com as informações certas.",
            what: "Checklists para PRs, formulários estruturados para Issues.",
            how: "Crie arquivos .md dentro de .github/ISSUE_TEMPLATE."
          }
        }
      ]
    },
    {
      id: "skills",
      title: "Skills da IA (Nebula)",
      subtitle: "Inteligência Contextual",
      icon: "🧠",
      items: [
        { 
          id: "skill-cr",
          name: "code-review.md", 
          status: "skill", 
          desc: "Revisão automática.",
          study: {
            why: "Economiza tempo humano pegando erros óbvios e sugerindo melhorias.",
            what: "Instruções para a IA auditar segurança, performance e estilo.",
            how: "Defina gatilhos para a IA rodar a cada novo PR."
          }
        },
        { 
          id: "skill-debug",
          name: "debug.md", 
          status: "skill", 
          desc: "Diagnóstico de precisão.",
          study: {
            why: "Resolve bugs complexos rastreando a causa raiz mais rápido.",
            what: "Metodologia de debug, ferramentas de logs e tratamento de erros.",
            how: "Ensine a IA a ler seus logs e sugerir o fix exato."
          }
        }
      ]
    },
    {
      id: "estrutura",
      title: "Estrutura de Pastas",
      subtitle: "Arquitetura Escalável",
      icon: "📂",
      type: "tree",
      content: `projeto/
├── .github/      # templates, actions, workflows
├── docs/         # ARCHITECTURE, STACK, ROADMAP
├── skills/       # skills da IA por contexto
├── src/          # código fonte
├── tests/        # testes unitários e integração
├── scripts/      # automações e utilitários
├── .cursorrules
├── .windsurfrules
├── CLAUDE.md
├── SYSTEM_PROMPT.md
├── README.md
├── CONTRIBUTING.md
├── CHANGELOG.md
└── .env.example`
    },
    {
      id: "automacao",
      title: "Automação e Scripts",
      subtitle: "Fluxo e Produtividade",
      icon: "⚙️",
      items: [
        { 
          id: "actions",
          name: "github-actions.yml", 
          status: "automação", 
          desc: "CI/CD no talo.",
          study: {
            why: "Garante que o código só entre em produção se estiver 100% testado.",
            what: "Pipelines de build, test e deploy automáticos no GitHub.",
            how: "Configure triggers em cada push para a branch main."
          }
        },
        { 
          id: "deploysh",
          name: "deploy.sh", 
          status: "recomendado", 
          desc: "Deploy em um clique.",
          study: {
            why: "Evita erros manuais no momento mais crítico do projeto.",
            what: "Comandos bash para subir a aplicação, migrar banco e limpar cache.",
            how: "Torne o script idempotente (pode rodar várias vezes sem quebrar)."
          }
        }
      ]
    }
  ];

  const handleToggleMentor = (e, stepId) => {
    e.stopPropagation();
    if (activeMentor === stepId) {
      setActiveMentor(null);
    } else {
      setActiveMentor(stepId);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;

    const newMessage = { role: 'user', text: chatMessage };
    setChatHistory([...chatHistory, newMessage]);
    setChatMessage('');

    // Resposta simulada do mentor
    setTimeout(() => {
      const mentorData = steps.find(s => s.id === activeMentor);
      let botText = `Olá! Sou seu Mentor especializado em ${mentorData.title}. Como posso ajudar com suas dúvidas sobre este tópico?`;
      
      if (isGlobalIA) {
        botText = `[🌐 IA Global - ${globalModel}] Olá! Como seu Mentor Mestre em ${mentorData.title}, estou usando todo o poder do ${globalModel} para te guiar nesta etapa da engenharia. O que vamos construir agora?`;
      }

      const botResponse = { 
        role: 'bot', 
        text: botText
      };
      setChatHistory(prev => [...prev, botResponse]);
    }, 1000);
  };

  const currentStepData = steps.find(s => s.id === activeStep);
  const currentItemData = currentStepData?.items?.find(i => i.id === selectedItem);
  const activeMentorData = steps.find(s => s.id === activeMentor);

  return (
    <div className="page-container engineer-page fade-in">
      <div className="engineer-header-compact">
        <div className="engineer-header-info">
          <h1>Engenharia <span>Master</span></h1>
          <p>O guia de projeto definitivo para a era da IA.</p>
        </div>
        {selectedItem ? (
          <button className="btn-back-steps" onClick={() => setSelectedItem(null)}>
            ← Voltar para {currentStepData.title}
          </button>
        ) : activeStep ? (
          <button className="btn-back-steps" onClick={() => setActiveStep(null)}>
            ← Voltar às etapas
          </button>
        ) : null}
      </div>

      {!activeStep ? (
        <div className="steps-selector-grid">
          {steps.map((step) => (
            <div key={step.id} className={`step-card glass ${activeMentor === step.id ? 'mentor-active' : ''}`} onClick={() => setActiveStep(step.id)}>
              <div className="step-card-header-actions">
                <div className={`mentor-toggle ${activeMentor === step.id ? 'active' : ''}`} 
                     onClick={(e) => handleToggleMentor(e, step.id)}
                     title="Ligar Mentor desta etapa">
                  <div className="toggle-dot"></div>
                </div>
              </div>
              <div className="step-icon-bg">{step.icon}</div>
              <div className="step-card-info">
                <h3>{step.title}</h3>
                <p>{step.subtitle}</p>
              </div>
              <div className="step-arrow">→</div>
            </div>
          ))}
        </div>
      ) : selectedItem ? (
        <div className="study-page fade-in">
          <div className="study-header">
            <div className="study-badge">{currentItemData.status}</div>
            <h2>Manual do Arquiteto: <span>{currentItemData.name}</span></h2>
            <p className="study-intro">{currentItemData.desc}</p>
          </div>

          <div className="study-content-grid">
            <div className="study-card glass why">
              <div className="study-card-icon">❓</div>
              <h4>Por que é importante?</h4>
              <p>{currentItemData.study.why}</p>
            </div>
            <div className="study-card glass what">
              <div className="study-card-icon">📄</div>
              <h4>O que deve conter?</h4>
              <p>{currentItemData.study.what}</p>
            </div>
            <div className="study-card glass how">
              <div className="study-card-icon">🚀</div>
              <h4>Como implementar?</h4>
              <p>{currentItemData.study.how}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="step-detail-view fade-in">
          <div className="step-detail-header">
            <div className="step-icon-large">{currentStepData.icon}</div>
            <div className="step-title-group">
              <h2>{currentStepData.title}</h2>
              <p>{currentStepData.subtitle}</p>
            </div>
          </div>

          {currentStepData.type === 'tree' ? (
            <div className="folder-structure-detail glass">
              <pre className="folder-tree-large">{currentStepData.content}</pre>
            </div>
          ) : (
            <div className="items-detail-grid">
              {currentStepData.items.map((item, i) => (
                <div key={i} className="detail-item-card glass" onClick={() => setSelectedItem(item.id)}>
                  <div className="item-card-header">
                    <span className="item-card-name">{item.name}</span>
                    <span className={`item-badge ${item.status.toLowerCase().replace(' ', '-')}`}>
                      {item.status}
                    </span>
                  </div>
                  <p className="item-card-desc">{item.desc}</p>
                  <div className="item-card-footer">
                    <span>Ver manual de estudo</span>
                    <small>📖</small>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Mentor IA Chat Section */}
      <div className={`mentor-chat-container glass ${activeMentor ? 'visible' : ''}`}>
        <div className="mentor-chat-header">
          <div className="mentor-avatar">🧠</div>
          <div className="mentor-info">
            <h4>
              Mentor Nebula: <span>{activeMentorData?.title || 'Selecione uma etapa'}</span>
              {isGlobalIA && <span className="global-badge-mini">🌐 IA Global</span>}
            </h4>
            <p>{isGlobalIA ? `Processando via ${globalModel}` : (activeMentor ? 'Especialista em modo de aula ativo' : 'Ligue um interruptor para conversar')}</p>
          </div>
          {activeMentor && (
            <button className="btn-close-mentor" onClick={() => setActiveMentor(null)}>×</button>
          )}
        </div>
        
        <div className="mentor-chat-messages">
          {chatHistory.length === 0 ? (
            <div className="chat-placeholder">
              O que você deseja aprender sobre <strong>{activeMentorData?.title}</strong> hoje?
            </div>
          ) : (
            chatHistory.map((msg, i) => (
              <div key={i} className={`chat-bubble ${msg.role}`}>
                {msg.text}
              </div>
            ))
          )}
        </div>

        <form className="mentor-chat-input" onSubmit={handleSendMessage}>
          <input 
            type="text" 
            placeholder={activeMentor ? "Tire sua dúvida com o mentor..." : "Ligue um mentor nos cards acima"} 
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            disabled={!activeMentor}
          />
          <button type="submit" disabled={!activeMentor || !chatMessage.trim()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 2L11 13M22 2L15 22L11 13M11 13L2 9L22 2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
};

export default EngineerPage;
