import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const Chat = ({ ollamaConfig, chatId, session, onChatCreated }) => {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Olá! Sou o Nebula AI. Como posso ajudar você hoje?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

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

    // Se não houver chatId, cria um novo chat automaticamente
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

    // Salvar mensagem do usuário no banco
    await saveMessage('user', input, currentChatId);

    try {
      // 1. Auditoria do Motor: Determinar Provedor
      let provider = 'ollama';
      if (ollamaConfig.anthropic_key) provider = 'anthropic';
      else if (ollamaConfig.google_key) provider = 'google';
      else if (ollamaConfig.openai_key) provider = 'openai';
      
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

      // --- ROTA ANTHROPIC ---
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
            model: 'claude-3-5-sonnet-20240620',
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
      // --- ROTA GOOGLE (GEMINI) ---
      else if (provider === 'google') {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:streamGenerateContent?key=${ollamaConfig.google_key}`, {
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
      // --- ROTA OPENAI ---
      else if (provider === 'openai') {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ollamaConfig.openai_key}`
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: payloadMessages,
            stream: true
          })
        });

        if (!response.ok) throw new Error('Falha na API da OpenAI. Verifique sua chave.');

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
      // --- ROTA OLLAMA (Local) ---
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

      // Salvar resposta completa da IA no banco
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
              <button 
                className="btn-copy" 
                onClick={() => navigator.clipboard.writeText(code)}
              >
                Copiar
              </button>
            </div>
            <pre><code>{code}</code></pre>
          </div>
        );
      }
      return <p key={idx} style={{ whiteSpace: 'pre-wrap', marginBottom: '10px' }}>{part}</p>;
    });
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    const name = session?.user?.user_metadata?.full_name?.split(' ')[0] || 'Tiago';
    if (hour < 12) return `Bom dia, ${name}`;
    if (hour < 18) return `Boa tarde, ${name}`;
    return `Boa noite, ${name}`;
  };

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
            </div>
            
            <div className="controls-right">
              <div className="model-selector-mini glass">
                <span>Nebula Pro</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </div>
              
              <button 
                className={`send-btn ${input.trim() ? 'active' : ''}`}
                onClick={handleSend}
                disabled={!input.trim()}
              >
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
      )}
      
      {chatId && (
        <div className="chat-input-wrapper bottom glass">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Pergunte qualquer coisa..."
            autoFocus
          />
          <button onClick={handleSend} disabled={loading}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default Chat;
