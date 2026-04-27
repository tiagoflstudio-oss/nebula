import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { trackUsage } from '../services/usageService';
import { skillService } from '../services/skillService';

const Chat = ({ ollamaConfig, setConfig, chatId, session, onChatCreated, globalSettings, onRequireAuth }) => {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Olá! Sou o Nebula AI. Como posso ajudar você hoje?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [skills, setSkills] = useState([]);
  const [showSkillsMenu, setShowSkillsMenu] = useState(false);
  const [placeholderText, setPlaceholderText] = useState('|');
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [selectorMode, setSelectorMode] = useState(ollamaConfig.global_ia_enabled ? 'global' : 'local');
  const [isListening, setIsListening] = useState(false);
  const scrollRef = useRef(null);
  const skipInitialFetch = useRef(false);

  // Sistema de Voz
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'pt-BR';

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(prev => prev + (prev ? ' ' : '') + transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Erro no reconhecimento de voz:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    // Carregar Skills do Banco
    fetchSkills();

    // Efeito de Placeholder Piscando
    const interval = setInterval(() => {
      setPlaceholderText(prev => prev === '|' ? ' ' : '|');
    }, 600);

    return () => clearInterval(interval);
  }, []);

  const fetchSkills = async () => {
    try {
      const data = await skillService.getSkills();
      setSkills(data || []);
    } catch (err) {
      console.error("Erro ao carregar skills no chat:", err);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      if (!recognitionRef.current) {
        alert("Seu navegador não suporta reconhecimento de voz.");
        return;
      }
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  // Carregar histórico quando o chat_id mudar
  useEffect(() => {
    if (chatId) {
      if (skipInitialFetch.current) {
        skipInitialFetch.current = false;
        return;
      }
      fetchMessages();
    } else {
      setMessages([{ role: 'assistant', content: 'Olá! Sou o Nebula AI. Como posso ajudar você hoje?' }]);
    }
  }, [chatId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (data && data.length > 0) {
        setMessages(data);
      } else {
        setMessages([{ role: 'assistant', content: 'Olá! Sou o Nebula AI. Como posso ajudar você hoje?' }]);
      }
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error.message);
    }
  };

  const saveMessage = async (role, content, currentChatId) => {
    if (!currentChatId) return null;
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([{ chat_id: currentChatId, role, content }])
        .select();
      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error('Erro ao salvar mensagem:', error.message);
      return null;
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    if (!session) {
      if (onRequireAuth) onRequireAuth();
      return;
    }

    let currentChatId = chatId;

    if (!currentChatId) {
      try {
        const { data, error } = await supabase
          .from('chats')
          .insert([{ user_id: session.user.id, title: input.substring(0, 30) + '...' }])
          .select();
        if (error) throw error;
        currentChatId = data[0].id;
        skipInitialFetch.current = true;
        if (onChatCreated) onChatCreated(currentChatId);
      } catch (error) {
        console.error('Erro ao criar chat automático:', error.message);
        return;
      }
    }

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    await saveMessage('user', input, currentChatId);

    try {
      // Lógica de Override do Cérebro Mestre (IA Global)
      const isGlobalIA = ollamaConfig.global_ia_enabled;
      
      // Se Global IA estiver ativo, usa as configs do ADMIN (globalSettings)
      // Caso contrário, usa as configs INDIVIDUAIS do usuário (ollamaConfig)
      const provider = isGlobalIA 
        ? (ollamaConfig.global_selected_provider || globalSettings?.global_provider || 'openai') 
        : (ollamaConfig.active_provider || 'ollama');
      
      const activeModel = isGlobalIA 
        ? (ollamaConfig.global_selected_model || globalSettings?.global_model || 'gpt-4o') 
        : (
          provider === 'openai' ? ollamaConfig.openai_model :
          provider === 'anthropic' ? ollamaConfig.anthropic_model :
          provider === 'google' ? ollamaConfig.google_model :
          provider === 'openrouter' ? ollamaConfig.openrouter_model :
          ollamaConfig.model
        );

      const activeKey = isGlobalIA ? (
          provider === 'openai' ? globalSettings?.openai_key :
          provider === 'anthropic' ? globalSettings?.anthropic_key :
          provider === 'google' ? globalSettings?.google_key :
          provider === 'openrouter' ? globalSettings?.openrouter_key :
          globalSettings?.global_api_key
        ) : (
          provider === 'openai' ? ollamaConfig.openai_key :
          provider === 'anthropic' ? ollamaConfig.anthropic_key :
          provider === 'google' ? ollamaConfig.google_key :
          provider === 'openrouter' ? ollamaConfig.openrouter_key :
          null
        );

      console.log(`%c[Nebula Engine] ${isGlobalIA ? '🌐 MODO GLOBAL ATIVO' : '🏠 Modo Local'}: ${provider.toUpperCase()} (${activeModel})`, 'color: #818cf8; font-weight: bold;');

      let projectContext = "";
      if (ollamaConfig.projectInstructions) {
        projectContext = `\nInstruções Adicionais do Projeto: ${ollamaConfig.projectInstructions}`;
      }

      let specializedContext = "";
      const lowerInput = input.toLowerCase();
      
      if (lowerInput.includes("contrato")) {
        specializedContext = "\nVocê é agora um especialista em Direito Civil Brasileiro. Analise o contrato focando em cláusulas abusivas, prazos, multas e rescisões. Explique de forma simples para um leigo.";
      } else if (lowerInput.includes("burocracia") || lowerInput.includes("receita") || lowerInput.includes("inss")) {
        specializedContext = "\nVocê é um consultor administrativo especialista em órgãos públicos brasileiros (Receita, DETRAN, INSS). Explique os termos técnicos da notificação e oriente o passo-a-passo para regularização.";
      } else if (lowerInput.includes("trabalhista")) {
        specializedContext = "\nVocê é um especialista em CLT e Direito do Trabalho. Explique os direitos do trabalhador de forma clara, mencionando verbas rescisórias, horas extras ou FGTS quando pertinente.";
      } else if (lowerInput.includes("reclamação") || lowerInput.includes("procon")) {
        specializedContext = "\nVocê é um mediador especialista em Direito do Consumidor. Ajude a redigir uma reclamação formal, clara e fundamentada para Procon ou Reclame Aqui, focando nos fatos e no pedido de solução.";
      }

      const systemMessage = {
        role: 'system',
        content: `Você é o Nebula AI, uma inteligência artificial minimalista e de alta performance instalada no Nebula OS. 
        Sua missão é ajudar o usuário com código, design, gestão de clientes e auxílio na Vida Burocrática Brasileira.${specializedContext}${projectContext}

        HABILIDADES DISPONÍVEIS (SKILLS):
        ${skills.map(s => `- /${s.name.toLowerCase().replace(/\s+/g, '')}: ${s.description} (Executa: ${s.command_template})`).join('\n')}

        INSTRUÇÕES DE EXECUÇÃO:
        - Quando o usuário usar um comando começado por '/', ou quando você perceber que uma das habilidades acima é necessária para resolver o problema, você deve responder confirmando que vai executar a ação.
        - Exemplo: "Entendido! Vou executar o [Nome da Skill] agora."

        REGRAS DE FORMATAÇÃO (OBRIGATÓRIO):
        1. Títulos de seção: sempre seguidos de uma linha em branco.
        2. Parágrafos: separados por uma linha em branco.
        3. Listas: use marcadores (- ou •), nunca texto corrido.
        4. Destaques: negrito APENAS para títulos, nunca no meio do texto.
        5. Comprimento: cada seção deve ter no máximo 3 linhas.
        6. Notícias: ### [Título] seguido de 1-2 frases explicativas.
        7. Espaçamento: nunca junte o fim de uma seção com o próximo título.

        Seja direto, técnico e sempre cordial.`
      };

      const payloadMessages = [
        systemMessage,
        ...messages.map(m => ({ role: m.role, content: m.content })),
        userMessage
      ];

      let assistantContent = '';
      let usageData = null;
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      if (provider === 'anthropic') {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': activeKey,
            'anthropic-version': '2023-06-01',
            'dangerously-allow-browser': 'true'
          },
          body: JSON.stringify({
            model: activeModel,
            max_tokens: 4096,
            messages: payloadMessages.filter(m => m.role !== 'system'),
            system: systemMessage.content,
            stream: true
          })
        });

        if (!response.ok) throw new Error('Falha na API da Anthropic. Verifique sua chave.');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const json = JSON.parse(line.substring(6));
                if (json.type === 'content_block_delta') {
                  const text = json.delta?.text || '';
                  assistantContent += text;
                  setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1].content = assistantContent;
                    return newMessages;
                  });
                } else if (json.type === 'message_delta' && json.usage) {
                  usageData = {
                    prompt_tokens: json.usage.input_tokens || 0,
                    completion_tokens: json.usage.output_tokens || 0
                  };
                } else if (json.type === 'message_start' && json.message?.usage) {
                  usageData = {
                    prompt_tokens: json.message.usage.input_tokens || 0,
                    completion_tokens: json.message.usage.output_tokens || 0
                  };
                }
              } catch (e) {}
            }
          }
        }
      }
      else if (provider === 'google') {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:streamGenerateContent?key=${activeKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: payloadMessages.filter(m => m.role !== 'system').map(m => ({
              role: m.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: m.content }]
            })),
            systemInstruction: { parts: [{ text: systemMessage.content }] }
          })
        });

        if (!response.ok) throw new Error('Falha na API do Google Gemini. Verifique sua chave.');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.trim().startsWith('{') || line.trim().startsWith(',')) {
              try {
                const cleanLine = line.trim().startsWith(',') ? line.trim().substring(1) : line.trim();
                const json = JSON.parse(cleanLine);
                const text = json.candidates[0]?.content?.parts[0]?.text || '';
                assistantContent += text;
                
                // Google usage metadata
                if (json.usageMetadata) {
                   usageData = {
                     prompt_tokens: json.usageMetadata.promptTokenCount || 0,
                     completion_tokens: json.usageMetadata.candidatesTokenCount || 0
                   };
                }

                setMessages(prev => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1].content = assistantContent;
                  return newMessages;
                });
              } catch (e) {}
            }
          }
        }
      }
      else if (provider === 'openai') {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${activeKey}`
          },
          body: JSON.stringify({
            model: activeModel,
            messages: payloadMessages,
            stream: true,
            stream_options: { include_usage: true }
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`OpenAI Error ${response.status}: ${errorData.error?.message || response.statusText}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
              try {
                const json = JSON.parse(line.substring(6));
                const text = json.choices[0]?.delta?.content || '';
                assistantContent += text;
                
                if (json.usage) {
                  usageData = {
                    prompt_tokens: json.usage.prompt_tokens || 0,
                    completion_tokens: json.usage.completion_tokens || 0
                  };
                }
                setMessages(prev => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1].content = assistantContent;
                  return newMessages;
                });
              } catch (e) {}
            }
          }
        }
      }
      else if (provider === 'openrouter') {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${activeKey}`,
            'HTTP-Referer': window.location.origin,
            'X-Title': 'Nebula AI'
          },
          body: JSON.stringify({
            model: activeModel,
            messages: payloadMessages,
            stream: true
          })
        });

        if (!response.ok) {
           const errorData = await response.json().catch(() => ({}));
           throw new Error(`OpenRouter Error: ${errorData.error?.message || response.statusText}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
              try {
                const json = JSON.parse(line.substring(6));
                const text = json.choices[0]?.delta?.content || '';
                assistantContent += text;

                if (json.usage) {
                  usageData = {
                    prompt_tokens: json.usage.prompt_tokens || 0,
                    completion_tokens: json.usage.completion_tokens || 0
                  };
                }
                setMessages(prev => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1].content = assistantContent;
                  return newMessages;
                });
              } catch (e) {}
            }
          }
        }
      }
      else {
        const response = await fetch(`http://${ollamaConfig.ip}:${ollamaConfig.port}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: activeModel,
            messages: payloadMessages,
            stream: true
          })
        });

        if (!response.ok) throw new Error('Falha na conexão com Ollama');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const json = JSON.parse(line);
              if (json.message?.content) {
                assistantContent += json.message.content;
                setMessages(prev => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1].content = assistantContent;
                  return newMessages;
                });
              }
            } catch (e) {}
          }
        }
      }

      await saveMessage('assistant', assistantContent, currentChatId);

      // Track usage in background
      if (usageData && session?.user?.id) {
        trackUsage(session.user.id, provider, activeModel, usageData);
      }

    } catch (error) {
      console.error('❌ [Nebula Engine Error]:', error);
      const errorMsg = `🛑 Erro no Motor: ${error.message}. Verifique as configurações de IP/Porta ou sua API Key no painel de Integrações.`;
      setMessages(prev => [...prev, { role: 'assistant', content: errorMsg }]);
      await saveMessage('assistant', errorMsg, currentChatId);
    } finally {
      setLoading(false);
    }
  };

  const renderContent = (content) => {
    // Primeiro isolamos os blocos de código
    const parts = content.split(/(```[\s\S]*?```)/g);
    
    return parts.map((part, idx) => {
      if (part.startsWith('```')) {
        const match = part.match(/```(\w+)?\n?([\s\S]*?)```/);
        const lang = match[1] || 'code';
        const code = match[2];
        return (
          <div key={idx} className="code-block">
            <div className="code-header">
              <span className="code-lang">{lang}</span>
              <button className="btn-copy" onClick={() => navigator.clipboard.writeText(code)}>Copiar</button>
            </div>
            <pre><code>{code}</code></pre>
          </div>
        );
      }
      
      // Processamento simples de Markdown para o texto
      let formattedText = part
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Negrito
        .replace(/\*(.*?)\*/g, '<em>$1</em>') // Itálico
        .replace(/^\s*-\s+(.*)$/gm, '<li>$1</li>') // Listas com hífen
        .replace(/^\s*\d+\.\s+(.*)$/gm, '<li>$1</li>'); // Listas numeradas

      // Envolver listas em <ul> se houver <li>
      if (formattedText.includes('<li>')) {
        formattedText = formattedText.replace(/(<li>.*<\/li>)/gs, '<ul class="chat-list">$1</ul>');
      }

      return (
        <div 
          key={idx} 
          className="markdown-text" 
          dangerouslySetInnerHTML={{ __html: formattedText.replace(/\n/g, '<br/>') }}
        />
      );
    });
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    const name = session?.user?.user_metadata?.full_name?.split(' ')[0] || 
                 session?.user?.email?.split('@')[0] || 
                 'Visitante';
                 
    let timeGreeting = "Boa noite";
    if (hour >= 5 && hour < 12) timeGreeting = "Bom dia";
    else if (hour >= 12 && hour < 18) timeGreeting = "Boa tarde";
    
    return `${timeGreeting}, ${name}`;
  };

  const getCurrentModelDisplay = () => {
    const format = (m) => m?.split('/').pop().replace(/-\d{4}-\d{2}-\d{2}$/, '').toUpperCase();
    
    if (ollamaConfig.global_ia_enabled) {
      return `🌐 ${format(ollamaConfig.global_selected_model) || 'MESTRE'}`;
    }
    const provider = ollamaConfig.active_provider || 'ollama';
    if (provider === 'openai') return format(ollamaConfig.openai_model) || 'GPT-4O';
    if (provider === 'anthropic') return 'CLAUDE 3.5';
    if (provider === 'google') return 'GEMINI 1.5 PRO';
    if (provider === 'openrouter') return format(ollamaConfig.openrouter_model) || 'OPENROUTER';
    return ollamaConfig.model?.charAt(0).toUpperCase() + ollamaConfig.model?.slice(1);
  };

  const getProvidersForConfig = (configSource, mode = 'local') => {
    if (!configSource) return [];
    
    // Função auxiliar para formatar e limpar nomes de modelos
    const formatModelName = (m) => {
      let name = m.split('/').pop(); // Remove o provedor se houver (ex: openai/...)
      name = name.replace(/-\d{4}-\d{2}-\d{2}$/, ''); // Remove datas (ex: -2024-05-13)
      return name.split('-').join(' ').toUpperCase();
    };

    const list = [
      { id: 'ollama', name: 'Ollama (Local)', models: ['llama3', 'mistral', 'phi3'] },
    ];
    
    const openaiKey = mode === 'global' ? configSource.global_openai_key : configSource.openai_key;
    if (openaiKey) {
      const rawModels = (mode === 'global' ? configSource.fetched_global_openai_models : configSource.fetched_openai_models) || ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'];
      // Deduplicação inteligente
      const seen = new Set();
      const uniqueModels = [];
      rawModels.forEach(m => {
        const display = formatModelName(m);
        if (!seen.has(display)) {
          seen.add(display);
          uniqueModels.push(m);
        }
      });
      list.push({ id: 'openai', name: 'OpenAI', models: uniqueModels, key: mode === 'global' ? 'global_openai_key' : 'openai_key' });
    }
    const anthropicKey = mode === 'global' ? configSource.global_anthropic_key : configSource.anthropic_key;
    if (anthropicKey) {
      const models = (mode === 'global' ? configSource.fetched_global_anthropic_models : configSource.fetched_anthropic_models) || ['claude-3-5-sonnet-20240620', 'claude-3-opus-20240229'];
      list.push({ id: 'anthropic', name: 'Anthropic', models, key: mode === 'global' ? 'global_anthropic_key' : 'anthropic_key' });
    }
    const googleKey = mode === 'global' ? configSource.global_google_key : configSource.google_key;
    if (googleKey) {
      const models = (mode === 'global' ? configSource.fetched_global_google_models : configSource.fetched_google_models) || ['gemini-1.5-pro', 'gemini-1.5-flash'];
      list.push({ id: 'google', name: 'Google Gemini', models, key: mode === 'global' ? 'global_google_key' : 'google_key' });
    }
    const openrouterKey = mode === 'global' ? configSource.global_openrouter_key : configSource.openrouter_key;
    if (openrouterKey) {
      const rawModels = (mode === 'global' ? configSource.fetched_global_openrouter_models : configSource.fetched_openrouter_models) || ['meta-llama/llama-3-70b-instruct'];
      const seen = new Set();
      const uniqueModels = [];
      rawModels.forEach(m => {
        const display = formatModelName(m);
        if (!seen.has(display)) {
          seen.add(display);
          uniqueModels.push(m);
        }
      });
      list.push({ id: 'openrouter', name: 'OpenRouter', models: uniqueModels, key: mode === 'global' ? 'global_openrouter_key' : 'openrouter_key' });
    }
    
    return list;
  };


  return (
    <div className={`chat-container fade-in ${!chatId ? 'home-view' : 'active-view'}`}>
      {!chatId && messages.length <= 1 && (
        <div className="gemini-greeting fade-in">
          <h1>
            <span className="sparkle">✦</span> {getGreeting()}
          </h1>
          <h2>Por onde começamos?</h2>
        </div>
      )}

      <div className="chat-input-area">
        <div className="gemini-input-card glass">
          <div className="input-top">
            <textarea
              rows="1"
              value={input}
              onChange={(e) => {
                const val = e.target.value;
                setInput(val);
                setShowSkillsMenu(val.endsWith('/'));
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Digite um comando ou pergunta..."
              autoFocus
            />
            {showSkillsMenu && (
              <div className="skills-command-menu glass fade-in">
                {skills.map(s => (
                  <div 
                    key={s.id} 
                    className="skill-option"
                    onClick={() => {
                      setInput(prev => prev.replace(/\/$/, '') + `/${s.name.toLowerCase().replace(/\s+/g, '')} `);
                      setShowSkillsMenu(false);
                    }}
                  >
                    <span className="skill-cmd">/{s.name.toLowerCase().replace(/\s+/g, '')}</span>
                    <span className="skill-desc">{s.description.substring(0, 40)}...</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="input-bottom">
            <div className="bottom-tools-left">
              <button className="btn-icon-tool" title="Adicionar arquivo">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
              </button>
              <button className={`btn-icon-tool ${isListening ? 'listening' : ''}`} onClick={toggleListening} title="Voz">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/>
                </svg>
              </button>
              <button className="btn-text-tool">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h7"/></svg>
                Ferramentas
              </button>
            </div>
            
            <div className="bottom-tools-right">
              <div className="dual-selector-pill">
                <div 
                  className={`pill-option ${ollamaConfig.global_ia_enabled ? 'active global' : ''}`}
                  onClick={() => { setSelectorMode('global'); setShowModelSelector(true); }}
                >
                  🌐 Mestre
                </div>
                <div 
                  className={`pill-option ${!ollamaConfig.global_ia_enabled ? 'active' : ''}`}
                  onClick={() => { setSelectorMode('local'); setShowModelSelector(true); }}
                >
                  👤 Pessoal
                </div>

                {showModelSelector && (
                  <div className="model-dropdown-portal glass fade-in">
                    <div className="dropdown-header">
                      <h3>{selectorMode === 'global' ? '🧠 IAs do Mestre' : '🔑 Minhas Integrações'}</h3>
                      <button onClick={() => setShowModelSelector(false)}>✕</button>
                    </div>
                    {getProvidersForConfig(selectorMode === 'global' ? globalSettings : ollamaConfig, selectorMode).map(p => (
                      <div key={p.id} className="provider-group">
                        <label>{p.name}</label>
                        <div className="models-list">
                          {p.models.map(m => (
                            <button
                              key={m}
                              className="model-option"
                              onClick={() => {
                                const newConfig = { ...ollamaConfig };
                                if (selectorMode === 'global') {
                                  newConfig.global_ia_enabled = true;
                                  newConfig.global_selected_provider = p.id;
                                  newConfig.global_selected_model = m;
                                } else {
                                  newConfig.global_ia_enabled = false;
                                  newConfig.active_provider = p.id;
                                  if (p.id === 'ollama') newConfig.model = m;
                                  if (p.id === 'openai') newConfig.openai_model = m;
                                  if (p.id === 'anthropic') newConfig.anthropic_model = m;
                                  if (p.id === 'google') newConfig.google_model = m;
                                  if (p.id === 'openrouter') newConfig.openrouter_model = m;
                                }
                                setConfig(newConfig);
                                setShowModelSelector(false);
                              }}
                            >
                              {m.split('/').pop().toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button className="btn-send-circle" onClick={handleSend} disabled={loading || !input.trim()}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        {!chatId && messages.length <= 1 && (
          <div className="suggestion-chips fade-in">
            <button className="chip"><span className="emoji">🖼️</span> Criar imagem</button>
            <button className="chip"><span className="emoji">🎸</span> Criar música</button>
            <button className="chip">Melhore meu dia</button>
            <button className="chip">Me ajude a aprender</button>
            <button className="chip">Escrever algo</button>
          </div>
        )}
      </div>

      {chatId && (
        <>
          <div className="chat-messages" ref={scrollRef}>
            {messages.map((msg, idx) => (
              <div key={idx} className={`message-wrapper ${msg.role}`}>
                <div className={`message ${msg.role} glass`}>
                  {msg.role === 'assistant' ? renderContent(msg.content) : msg.content}
                </div>
              </div>
            ))}
            {loading && messages[messages.length-1].role === 'user' && (
              <div className="message-wrapper assistant">
                <div className="message assistant loading">
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                </div>
              </div>
            )}
          </div>
          
          <div className="chat-input-area active-chat">
            <div className="gemini-input-card glass">
              <div className="input-top">
                <textarea
                  rows="1"
                  value={input}
                  onChange={(e) => {
                    const val = e.target.value;
                    setInput(val);
                    setShowSkillsMenu(val.endsWith('/'));
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="digite"
                  autoFocus
                />
                {showSkillsMenu && (
                  <div className="skills-command-menu glass bottom-mode fade-in">
                    {skills.map(s => (
                      <div 
                        key={s.id} 
                        className="skill-option"
                        onClick={() => {
                          setInput(prev => prev.replace(/\/$/, '') + `/${s.name.toLowerCase().replace(/\s+/g, '')} `);
                          setShowSkillsMenu(false);
                        }}
                      >
                        <span className="skill-cmd">/{s.name.toLowerCase().replace(/\s+/g, '')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="input-bottom">
                <div className="bottom-tools-left">
                  <button className="btn-icon-tool" title="Analisar Contrato" onClick={() => setInput("Analisar Contrato: ")}>📄</button>
                  <button className={`btn-icon-tool ${isListening ? 'listening' : ''}`} onClick={toggleListening} title="Voz">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/>
                    </svg>
                  </button>
                </div>
                
                <div className="bottom-tools-right">
                  <div className="dual-selector-pill">
                    <div 
                      className={`pill-option ${ollamaConfig.global_ia_enabled ? 'active global' : ''}`}
                      onClick={() => { setSelectorMode('global'); setShowModelSelector(true); }}
                    >
                      🌐
                    </div>
                    <div 
                      className={`pill-option ${!ollamaConfig.global_ia_enabled ? 'active' : ''}`}
                      onClick={() => { setSelectorMode('local'); setShowModelSelector(true); }}
                    >
                      👤
                    </div>

                    {showModelSelector && (
                      <div className="model-dropdown-portal glass bottom-mode fade-in">
                        <div className="dropdown-header">
                          <h3>{selectorMode === 'global' ? '🧠 Mestre' : '🔑 Pessoal'}</h3>
                          <button onClick={() => setShowModelSelector(false)}>✕</button>
                        </div>
                        {getProvidersForConfig(selectorMode === 'global' ? globalSettings : ollamaConfig, selectorMode).map(p => (
                          <div key={p.id} className="provider-group">
                            <label>{p.name}</label>
                            <div className="models-list">
                              {p.models.map(m => (
                                <button
                                  key={m}
                                  className="model-option"
                                  onClick={() => {
                                    const newConfig = { ...ollamaConfig };
                                    if (selectorMode === 'global') {
                                      newConfig.global_ia_enabled = true;
                                      newConfig.global_selected_provider = p.id;
                                      newConfig.global_selected_model = m;
                                    } else {
                                      newConfig.global_ia_enabled = false;
                                      newConfig.active_provider = p.id;
                                      if (p.id === 'ollama') newConfig.model = m;
                                      if (p.id === 'openai') newConfig.openai_model = m;
                                      if (p.id === 'anthropic') newConfig.anthropic_model = m;
                                      if (p.id === 'google') newConfig.google_model = m;
                                      if (p.id === 'openrouter') newConfig.openrouter_model = m;
                                    }
                                    setConfig(newConfig);
                                    setShowModelSelector(false);
                                  }}
                                >
                                  {m.split('/').pop().toUpperCase()}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <button className="btn-send-circle" onClick={handleSend} disabled={loading || !input.trim()}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Chat;
