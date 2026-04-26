import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

<<<<<<< HEAD
const Chat = ({ ollamaConfig, chatId, session, onChatCreated }) => {
=======
const Chat = ({ ollamaConfig, chatId, session }) => {
>>>>>>> a9f69f60651e849b991e733636d692f1d68c0024
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
<<<<<<< HEAD
        if (onChatCreated) onChatCreated(currentChatId);
=======
        // O App.jsx vai receber esse ID via trigger ou podemos lidar aqui
        // Mas para simplicidade, vamos assumir que o usuário deve clicar em "Nova Conversa" primeiro ou fazemos o redirect
>>>>>>> a9f69f60651e849b991e733636d692f1d68c0024
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
      const response = await fetch(`http://${ollamaConfig.ip}:${ollamaConfig.port}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: ollamaConfig.model,
          messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
          stream: true
        })
      });

      if (!response.ok) throw new Error('Falha na conexão com Ollama');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';

      // Adicionar mensagem vazia do assistente para ir preenchendo
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const json = JSON.parse(line);
            if (json.message && json.message.content) {
              assistantContent += json.message.content;
              setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1].content = assistantContent;
                return newMessages;
              });
            }
          } catch (e) {
            console.warn('Erro ao processar chunk:', e);
          }
        }
      }

      // Salvar resposta completa da IA no banco
      await saveMessage('assistant', assistantContent, currentChatId);

    } catch (error) {
      console.error(error);
      const errorMsg = 'Erro: Não foi possível conectar ao servidor Ollama. Verifique o painel de configurações.';
      setMessages(prev => [...prev, { role: 'assistant', content: errorMsg }]);
      await saveMessage('assistant', errorMsg, currentChatId);
    } finally {
      setLoading(false);
    }
  };

<<<<<<< HEAD
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

=======
>>>>>>> a9f69f60651e849b991e733636d692f1d68c0024
  return (
    <div className="chat-container fade-in">
      <div className="chat-messages" ref={scrollRef}>
        {messages.map((msg, idx) => (
          <div key={idx} className={`message-wrapper ${msg.role}`}>
<<<<<<< HEAD
            <div className={`message ${msg.role} ${msg.role === 'user' ? 'glass' : ''}`}>
              {msg.role === 'assistant' ? renderContent(msg.content) : msg.content}
=======
            <div className={`message glass ${msg.role}`}>
              {msg.content}
>>>>>>> a9f69f60651e849b991e733636d692f1d68c0024
            </div>
          </div>
        ))}
        {loading && messages[messages.length-1].role === 'user' && (
          <div className="message-wrapper assistant">
<<<<<<< HEAD
            <div className="message assistant loading">
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
=======
            <div className="message glass assistant loading">
              <span>●</span><span>●</span><span>●</span>
>>>>>>> a9f69f60651e849b991e733636d692f1d68c0024
            </div>
          </div>
        )}
      </div>
      
      <div className="chat-input-wrapper glass">
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
    </div>
  );
};

export default Chat;
