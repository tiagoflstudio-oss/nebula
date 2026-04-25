import React, { useState, useRef, useEffect } from 'react';

const Chat = ({ ollamaConfig }) => {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Olá! Sou o Nebula AI. Como posso ajudar você hoje?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch(`http://${ollamaConfig.ip}:${ollamaConfig.port}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: ollamaConfig.model,
          messages: [...messages, userMessage],
          stream: false // Para simplicidade inicial
        })
      });

      if (!response.ok) throw new Error('Falha na conexão com Ollama');

      const data = await response.json();
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: data.message.content 
      }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Erro: Não foi possível conectar ao servidor Ollama. Verifique o IP e a Porta no painel de configurações.' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-container fade-in">
      <div className="chat-messages" ref={scrollRef}>
        {messages.map((msg, idx) => (
          <div key={idx} className={`message-wrapper ${msg.role}`}>
            <div className={`message glass ${msg.role}`}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="message-wrapper assistant">
            <div className="message glass assistant loading">
              <span>●</span><span>●</span><span>●</span>
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
