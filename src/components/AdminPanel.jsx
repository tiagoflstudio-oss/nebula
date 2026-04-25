import React, { useState } from 'react';

const AdminPanel = ({ config, setConfig }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        className="admin-toggle glass" 
        onClick={() => setIsOpen(!isOpen)}
        title="Configurações"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
        </svg>
      </button>

      <div className={`admin-panel glass ${isOpen ? 'open' : ''}`}>
        <h3>Configurações AI</h3>
        
        <div className="input-group">
          <label>IP do Servidor</label>
          <input 
            type="text" 
            value={config.ip} 
            onChange={(e) => setConfig({...config, ip: e.target.value})}
            placeholder="Ex: 192.168.1.100"
          />
        </div>

        <div className="input-group">
          <label>Porta</label>
          <input 
            type="text" 
            value={config.port} 
            onChange={(e) => setConfig({...config, port: e.target.value})}
            placeholder="Padrão: 11434"
          />
        </div>

        <div className="input-group">
          <label>Modelo</label>
          <select 
            value={config.model} 
            onChange={(e) => setConfig({...config, model: e.target.value})}
          >
            <option value="llama3">Llama 3</option>
            <option value="mistral">Mistral</option>
            <option value="phi3">Phi-3</option>
          </select>
        </div>

        <p className="status-hint">
          As alterações são salvas automaticamente.
        </p>
      </div>
    </>
  );
};

export default AdminPanel;
