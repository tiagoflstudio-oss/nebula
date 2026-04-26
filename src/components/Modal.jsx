import React, { useState, useEffect } from 'react';

const Modal = ({ isOpen, title, message, type = 'confirm', initialValue = '', onConfirm, onClose }) => {
  const [inputValue, setInputValue] = useState(initialValue);

  useEffect(() => {
    if (isOpen) setInputValue(initialValue);
  }, [isOpen, initialValue]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="btn-modal-close" onClick={onClose} title="Fechar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        <div className="modal-body">
          {message && <p>{message}</p>}
          {type === 'prompt' && (
            <input 
              className="modal-input"
              type="text" 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Digite aqui..."
              autoFocus
              onKeyPress={(e) => e.key === 'Enter' && onConfirm(inputValue)}
            />
          )}
        </div>
        <div className="modal-footer">
          <button className="btn-modal-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-modal-primary" onClick={() => onConfirm(type === 'prompt' ? inputValue : true)}>
            {type === 'prompt' ? 'Confirmar' : (title.toLowerCase().includes('excluir') ? 'Sim, Excluir' : 'Confirmar')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
