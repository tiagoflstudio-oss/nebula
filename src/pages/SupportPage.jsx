import React, { useState, useEffect } from 'react';
const SupportPage = ({ config }) => {
  const [mode, setMode] = useState('menu'); // menu, dialogue, decision, journal
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const modes = [
    { id: 'dialogue', title: 'Ponte de Diálogo', icon: '💬', desc: 'Prepare-se para conversas difíceis com chefes ou familiares.' },
    { id: 'decision', title: 'Matriz de Decisão', icon: '⚖️', desc: 'Liste prós e contras para tomar decisões com clareza.' },
    { id: 'journal', title: 'Diário Reflexivo', icon: '📖', desc: 'Deixe a IA guiar sua autodescoberta com perguntas profundas.' }
  ];

  const handleModeSelect = (selectedMode) => {
    setMode(selectedMode);
    let initialMessage = '';
    if (selectedMode === 'dialogue') initialMessage = 'Com quem você precisa conversar e qual o assunto principal? Vou te ajudar a estruturar isso da melhor forma.';
    if (selectedMode === 'decision') initialMessage = 'Qual decisão está pesando no seu coração hoje? Vamos listar os prós e contras juntos.';
    if (selectedMode === 'journal') initialMessage = 'Como você está se sentindo agora? Me conte um pouco sobre o seu dia e eu te ajudarei a processar isso.';
    
    setMessages([{ role: 'assistant', content: initialMessage }]);
  };

  const scrollRef = React.useRef(null);

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
      let systemPrompt = "Você é um assistente de organização emocional calmo, empático e estruturado. Seu objetivo não é substituir um terapeuta, mas ajudar o usuário a organizar pensamentos e ações.";
      
      if (mode === 'dialogue') systemPrompt += " Foque em Comunicação Não-Violenta e em como expressar sentimentos e necessidades de forma clara.";
      if (mode === 'decision') systemPrompt += " Ajude o usuário a ver todos os ângulos de uma decisão, focando em valores e consequências de longo prazo.";
      if (mode === 'journal') systemPrompt += " Faça perguntas reflexivas que ajudem o usuário a aprofundar seu autoconhecimento. Seja um espelho empático.";

      const response = await fetch(`http://${config.ip}:${config.port}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages.map(m => ({ role: m.role, content: m.content })),
            userMessage
          ],
          stream: false
        })
      });

      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.message.content }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Desculpe, tive um problema ao me conectar. Verifique se o seu motor de IA está ligado.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container support-page fade-in">
      <button className="btn-back-zen" onClick={() => setMode('menu')} style={{ display: mode === 'menu' ? 'none' : 'flex' }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        Sair do Modo Zen
      </button>

      <div className="page-header center-text">
        <h1>Suporte Emocional <span>Zen</span></h1>
        <p>Organização emocional e clareza mental assistida por IA.</p>
      </div>

      {mode === 'menu' ? (
        <div className="support-menu-compact fade-in">
          {modes.map(m => (
            <div key={m.id} className="support-card-horizontal glass" onClick={() => handleModeSelect(m.id)}>
              <div className="card-icon-mini">{m.icon}</div>
              <div className="card-content-mini">
                <h3>{m.title}</h3>
                <p>{m.desc}</p>
              </div>
              <div className="card-arrow">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="support-chat-container glass fade-in">
          <div className="support-chat-messages" ref={scrollRef}>
            {messages.map((m, i) => (
              <div key={i} className={`support-msg ${m.role}`}>
                <div className="support-msg-content">
                  {m.content}
                </div>
              </div>
            ))}
            {loading && <div className="support-msg assistant loading">Nebula está pensando...</div>}
          </div>
          <div className="support-chat-input">
            <input 
              type="text" 
              placeholder="Digite seus pensamentos..." 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            />
            <button onClick={handleSend} disabled={loading}>Enviar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupportPage;
