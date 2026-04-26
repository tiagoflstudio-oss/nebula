import React, { useState, useEffect } from 'react';

const Modal = ({ isOpen, title, message, type = 'confirm', initialValue = '', onConfirm, onClose }) => {
  const [inputValue, setInputValue] = useState(initialValue);

  useEffect(() => {
    if (isOpen) setInputValue(initialValue);
  }, [isOpen, initialValue]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay fade-in">
      <div className="modal-content glass slide-up">
        <div className="modal-header">
          <h3>{title}</h3>
        </div>
        <div className="modal-body">
          {message && <p>{message}</p>}
          {type === 'prompt' && (
            <input 
              className="modal-input"
              type="text" 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              autoFocus
              onKeyPress={(e) => e.key === 'Enter' && onConfirm(inputValue)}
            />
          )}
        </div>
        <div className="modal-footer">
          <button className="btn-modal-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-modal-primary" onClick={() => onConfirm(type === 'prompt' ? inputValue : true)}>
            {type === 'prompt' ? 'Confirmar' : 'Sim, Excluir'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
