import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const Chat = ({ ollamaConfig, setConfig, chatId, session, onChatCreated }) => {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Olá! Sou o Nebula AI. Como posso ajudar você hoje?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const scrollRef = useRef(null);

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
  }, []);

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

    let currentChatId = chatId;

    if (!currentChatId) {
      try {
        const { data, error } = await supabase
          .from('chats')
          .insert([{ user_id: session.user.id, title: input.substring(0, 30) + '...' }])
          .select();
        if (error) throw error;
        currentChatId = data[0].id;
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
      const provider = ollamaConfig.active_provider || 'ollama';
      console.log(`%c[Nebula Engine] Motor Ativo: ${provider.toUpperCase()}`, 'color: #818cf8; font-weight: bold;');

      let projectContext = "";
      if (ollamaConfig.projectInstructions) {
        projectContext = `\nInstruções Adicionais do Projeto: ${ollamaConfig.projectInstructions}`;
      }

      const systemMessage = {
        role: 'system',
        content: `Você é o Nebula AI, uma inteligência artificial minimalista e de alta performance. 
        Sua missão é ajudar o usuário com código, design e gestão de clientes. 
        Seja direto, técnico quando necessário e sempre cordial.${projectContext}`
      };

      const payloadMessages = [
        systemMessage,
        ...messages.map(m => ({ role: m.role, content: m.content })),
        userMessage
      ];

      let assistantContent = '';
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      if (provider === 'anthropic') {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': ollamaConfig.anthropic_key,
            'anthropic-version': '2023-06-01',
            'dangerously-allow-browser': 'true'
          },
          body: JSON.stringify({
            model: ollamaConfig.anthropic_model || 'claude-3-5-sonnet-20240620',
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
                }
              } catch (e) {}
            }
          }
        }
      }
      else if (provider === 'google') {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${ollamaConfig.google_model || 'gemini-1.5-pro'}:streamGenerateContent?key=${ollamaConfig.google_key}`, {
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
            'Authorization': `Bearer ${ollamaConfig.openai_key}`
          },
          body: JSON.stringify({
            model: ollamaConfig.openai_model || 'gpt-4o',
            messages: payloadMessages,
            stream: true
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
            model: ollamaConfig.model,
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
    const name = session?.user?.user_metadata?.full_name?.split(' ')[0] || 'Tiago';
    if (hour < 12) return `Bom dia, ${name}`;
    if (hour < 18) return `Boa tarde, ${name}`;
    return `Boa noite, ${name}`;
  };

  const getCurrentModelDisplay = () => {
    const provider = ollamaConfig.active_provider || 'ollama';
    if (provider === 'openai') return ollamaConfig.openai_model || 'GPT-4o';
    if (provider === 'anthropic') return 'Claude 3.5';
    if (provider === 'google') return 'Gemini 1.5 Pro';
    return ollamaConfig.model.charAt(0).toUpperCase() + ollamaConfig.model.slice(1);
  };

  const providers = [
    { id: 'ollama', name: 'Ollama (Local)', models: ['llama3', 'mistral', 'phi3'] },
    { id: 'openai', name: 'OpenAI', models: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'], key: 'openai_key' },
    { id: 'anthropic', name: 'Anthropic', models: ['claude-3-5-sonnet-20240620', 'claude-3-opus-20240229'], key: 'anthropic_key' },
    { id: 'google', name: 'Google Gemini', models: ['gemini-1.5-pro', 'gemini-1.5-flash'], key: 'google_key' }
  ];

  return (
    <div className={`chat-container fade-in ${!chatId ? 'home-view' : 'active-view'}`}>
      {!chatId && (
        <div className="home-welcome-section">
          <div className="greeting-wrapper">
            <span className="star-icon">✴</span>
            <h1>{getGreeting()}</h1>
          </div>
          
          <div className="home-input-container">
            <div className="chat-input-wrapper large glass">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Digite / para habilidades"
                autoFocus
              />
              <div className="chat-input-controls">
                <div className="controls-left">
                  <button className="input-action-btn" title="Anexar arquivo">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </button>
                  <button 
                    className={`voice-btn ${isListening ? 'listening' : ''}`} 
                    onClick={toggleListening} 
                    title={isListening ? "Ouvindo..." : "Usar Microfone"}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/>
                    </svg>
                  </button>
                </div>
                
                <div className="controls-right">
                  <div className="model-selector-container">
                    <div 
                      className="model-selector-mini glass" 
                      onClick={() => setShowModelSelector(!showModelSelector)}
                      title="Clique para trocar o motor"
                    >
                      <span className="dot-engine"></span>
                      <span>{getCurrentModelDisplay()}</span>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: showModelSelector ? 'rotate(180deg)' : 'none' }}>
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </div>

                    {showModelSelector && (
                      <div className="model-dropdown-portal glass fade-in">
                        {providers.map(p => (
                          <div key={p.id} className="provider-group">
                            <label className={(!p.key || ollamaConfig[p.key]) ? '' : 'locked'}>
                              {p.name} {(!p.key || ollamaConfig[p.key]) ? '' : '🔒'}
                            </label>
                            <div className="models-list">
                              {p.models.map(m => (
                                <button
                                  key={m}
                                  className={`model-option ${((p.id === 'ollama' && ollamaConfig.model === m) || 
                                              (p.id === 'openai' && ollamaConfig.openai_model === m) ||
                                              (p.id === 'anthropic' && ollamaConfig.anthropic_model === m) ||
                                              (p.id === 'google' && ollamaConfig.google_model === m)) && 
                                              ollamaConfig.active_provider === p.id ? 'active' : ''}`}
                                  disabled={p.key && !ollamaConfig[p.key]}
                                  onClick={() => {
                                    const newConfig = { ...ollamaConfig, active_provider: p.id };
                                    if (p.id === 'ollama') newConfig.model = m;
                                    if (p.id === 'openai') newConfig.openai_model = m;
                                    if (p.id === 'anthropic') newConfig.anthropic_model = m;
                                    if (p.id === 'google') newConfig.google_model = m;
                                    setConfig(newConfig);
                                    setShowModelSelector(false);
                                  }}
                                >
                                  {m.split('-').slice(0, 2).join(' ').toUpperCase()}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <button className={`send-btn ${input.trim() ? 'active' : ''}`} onClick={handleSend} disabled={!input.trim()}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <div className="skills-row">
              <button className="skill-btn"><span className="icon">{"</>"}</span> Código</button>
              <button className="skill-btn"><span className="icon">📈</span> Estratégias</button>
              <button className="skill-btn"><span className="icon">✨</span> Criar</button>
              <button className="skill-btn"><span className="icon">✍️</span> Escrever</button>
              <button className="skill-btn"><span className="icon">🎓</span> Aprender</button>
            </div>
          </div>
        </div>
      )}

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
          <div className="chat-input-wrapper bottom glass">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Pergunte qualquer coisa..."
              autoFocus
            />
            <div className="bottom-input-actions">
              <button 
                className={`voice-btn-mini ${isListening ? 'listening' : ''}`} 
                onClick={toggleListening}
                title={isListening ? "Ouvindo..." : "Usar Microfone"}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/>
                </svg>
              </button>
            </div>
            <div className="model-selector-container mini-bottom">
               <div 
                  className="model-selector-mini glass" 
                  onClick={() => setShowModelSelector(!showModelSelector)}
                >
                  <span className="dot-engine"></span>
                  <span>{getCurrentModelDisplay()}</span>
                </div>
                {showModelSelector && (
                  <div className="model-dropdown-portal glass bottom-mode fade-in">
                     {providers.map(p => (
                          <div key={p.id} className="provider-group">
                            <label className={(!p.key || ollamaConfig[p.key]) ? '' : 'locked'}>
                              {p.name} {(!p.key || ollamaConfig[p.key]) ? '' : '🔒'}
                            </label>
                            <div className="models-list">
                              {p.models.map(m => (
                                <button
                                  key={m}
                                  className={`model-option ${((p.id === 'ollama' && ollamaConfig.model === m) || 
                                              (p.id === 'openai' && ollamaConfig.openai_model === m) ||
                                              (p.id === 'anthropic' && ollamaConfig.anthropic_model === m) ||
                                              (p.id === 'google' && ollamaConfig.google_model === m)) && 
                                              ollamaConfig.active_provider === p.id ? 'active' : ''}`}
                                  disabled={p.key && !ollamaConfig[p.key]}
                                  onClick={() => {
                                    const newConfig = { ...ollamaConfig, active_provider: p.id };
                                    if (p.id === 'ollama') newConfig.model = m;
                                    if (p.id === 'openai') newConfig.openai_model = m;
                                    if (p.id === 'anthropic') newConfig.anthropic_model = m;
                                    if (p.id === 'google') newConfig.google_model = m;
                                    setConfig(newConfig);
                                    setShowModelSelector(false);
                                  }}
                                >
                                  {m.split('-').slice(0, 2).join(' ').toUpperCase()}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                  </div>
                )}
            </div>
            <button className="send-btn-circle" onClick={handleSend} disabled={loading}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default Chat;
