import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
// import ReactMarkdown from 'react-markdown';

const RoadmapPage = ({ ollamaConfig, session }) => {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Olá! Sou o seu especialista em Roadmaps. Vamos transformar sua ideia em um planejamento estratégico completo. Qual projeto vamos estruturar hoje?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef(null);

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

      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const systemPrompt = `Você é um Especialista em Gestão de Projetos e Roadmaps Estratégicos. 
      Seu objetivo é ajudar o usuário a criar cronogramas, identificar marcos (milestones), definir MVPs e estruturar a trajetória de sucesso de um projeto.
      Sempre use uma linguagem profissional, estratégica e utilize formatação Markdown (tabelas, listas, negrito) para tornar o Roadmap visualmente claro.
      Foque em passos acionáveis e prazos sugeridos.`;

      const provider = ollamaConfig.active_provider || 'ollama';
      let response;

      if (provider === 'ollama') {
        response = await fetch(`http://${ollamaConfig.ip}:${ollamaConfig.port}/api/chat`, {
          method: 'POST',
          body: JSON.stringify({
            model: ollamaConfig.model,
            messages: [
              { role: 'system', content: systemPrompt },
              ...messages,
              userMsg
            ],
            stream: false
          })
        });
        const data = await response.json();
        setMessages(prev => [...prev, { role: 'assistant', content: data.message.content }]);
      } else if (provider === 'openai') {
        response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ollamaConfig.openai_key}`
          },
          body: JSON.stringify({
            model: ollamaConfig.openai_model,
            messages: [
              { role: 'system', content: systemPrompt },
              ...messages,
              userMsg
            ]
          })
        });
        const data = await response.json();
        setMessages(prev => [...prev, { role: 'assistant', content: data.choices[0].message.content }]);
      }
      // Outros provedores podem ser adicionados aqui seguindo a lógica do Chat.jsx
      
    } catch (error) {
      console.error('Erro no Roadmap Engine:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: '❌ Erro ao gerar Roadmap. Verifique sua conexão ou API Key.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderContent = (content) => {
    let formattedText = content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^\s*-\s+(.*)$/gm, '<li>$1</li>')
      .replace(/^\s*\d+\.\s+(.*)$/gm, '<li>$1</li>');

    if (formattedText.includes('<li>')) {
      formattedText = formattedText.replace(/(<li>.*<\/li>)/gs, '<ul class="chat-list">$1</ul>');
    }

    return (
      <div 
        className="markdown-text" 
        dangerouslySetInnerHTML={{ __html: formattedText.replace(/\n/g, '<br/>') }}
      />
    );
  };

  return (
    <div className="roadmap-page fade-in">
      <div className="roadmap-container glass">
        <header className="roadmap-header">
          <div className="roadmap-icon">🗺️</div>
          <div className="roadmap-title">
            <h1>Roadmap Estratégico</h1>
            <p>IA especializada em planejamento e cronogramas</p>
          </div>
        </header>

        <div className="roadmap-chat-area">
          <div className="roadmap-messages">
            {messages.map((msg, idx) => (
              <div key={idx} className={`roadmap-msg-wrapper ${msg.role}`}>
                <div className="roadmap-msg-content">
                  {renderContent(msg.content)}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="roadmap-msg-wrapper assistant">
                <div className="roadmap-msg-content loading">
                  <span className="dot"></span><span className="dot"></span><span className="dot"></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="roadmap-input-area">
            <div className="roadmap-input-wrapper glass">
              <input 
                type="text" 
                placeholder="Descreva seu projeto ou peça um cronograma..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              />
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
              <button onClick={handleSend} disabled={isLoading} className="roadmap-send-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoadmapPage;
