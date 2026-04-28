import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { extractTextFromFile } from '../services/documentParser';
import './RagMasterPage.css';

const RagMasterPage = () => {
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = (newFiles) => {
    const validFiles = Array.from(newFiles).filter(file => 
      file.type === 'application/pdf' || 
      file.type === 'text/plain' || 
      file.type === 'text/csv' ||
      file.name.endsWith('.docx')
    );
    
    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles.map(f => ({
        file: f,
        name: f.name,
        size: (f.size / 1024 / 1024).toFixed(2) + ' MB',
        status: 'pending', // pending, processing, ready, error
        content: null
      }))]);
    } else {
      alert("Formato não suportado. Envie PDF, TXT, CSV ou DOCX.");
    }
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const processFiles = async () => {
    setIsProcessing(true);
    
    const updatedFiles = [...files];
    
    for (let i = 0; i < updatedFiles.length; i++) {
      if (updatedFiles[i].status !== 'pending') continue;
      
      updatedFiles[i].status = 'processing';
      setFiles([...updatedFiles]);
      
      try {
        const text = await extractTextFromFile(updatedFiles[i].file);
        updatedFiles[i].content = text;
        updatedFiles[i].status = 'ready';
        
        // Aqui enviaríamos para o Supabase (Tabela knowledge_documents)
        // Por enquanto estamos mantendo no estado (Opção A rápida)
        
      } catch (err) {
        console.error("Erro ao processar arquivo:", updatedFiles[i].name, err);
        updatedFiles[i].status = 'error';
      }
      
      setFiles([...updatedFiles]);
    }
    
    setIsProcessing(false);
  };

  return (
    <div className="rag-page glass fade-in">
      <div className="rag-header">
        <div className="rag-title">
          <span className="material-symbols-outlined icon">library_books</span>
          <h2>RAG Mestre</h2>
        </div>
        <p>Faça upload de PDFs, planilhas e contratos. Converse com seus documentos em tempo real e de forma segura.</p>
      </div>

      <div className="rag-content">
        <div className="rag-sidebar">
          <h3>Bases de Conhecimento</h3>
          <p className="rag-subtitle">Agrupe seus documentos</p>
          
          <div className="kb-list">
            <div className="kb-item active">
              <span className="material-symbols-outlined">folder_open</span>
              <div className="kb-info">
                <span className="kb-name">Sessão Atual</span>
                <span className="kb-count">{files.filter(f => f.status === 'ready').length} documentos prontos</span>
              </div>
            </div>
          </div>
        </div>

        <div className="rag-main">
          <div 
            className={`upload-zone ${dragActive ? 'active' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <span className="material-symbols-outlined upload-icon">cloud_upload</span>
            <h3>Arraste seus arquivos para cá</h3>
            <p>PDF, DOCX, TXT ou CSV (Máx 25MB por arquivo)</p>
            <input 
              type="file" 
              multiple 
              accept=".pdf,.txt,.csv,.docx"
              onChange={handleChange}
              id="file-upload"
              className="file-input"
            />
            <label htmlFor="file-upload" className="btn-browse">Procurar Arquivos</label>
          </div>

          {files.length > 0 && (
            <div className="files-list">
              <h4>Arquivos na base ({files.length})</h4>
              <div className="files-grid">
                {files.map((f, i) => (
                  <div key={i} className="file-card">
                    <span className="material-symbols-outlined file-type-icon">description</span>
                    <div className="file-details">
                      <span className="file-name" title={f.name}>{f.name}</span>
                      <span className="file-size">{f.size}</span>
                    </div>
                    {f.status === 'pending' && <span className="status-badge pending">Pendente</span>}
                    {f.status === 'processing' && <span className="status-badge processing" style={{background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6'}}>Lendo...</span>}
                    {f.status === 'ready' && <span className="status-badge ready">Pronto</span>}
                    {f.status === 'error' && <span className="status-badge error" style={{background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444'}}>Erro</span>}
                    <button className="btn-remove-file" onClick={() => removeFile(i)}>
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>
                ))}
              </div>
              
              <div className="rag-actions">
                <button 
                  className="btn-process" 
                  disabled={files.length === 0 || isProcessing || !files.some(f => f.status === 'pending')}
                  onClick={processFiles}
                >
                  <span className="material-symbols-outlined">
                    {isProcessing ? 'sync' : 'memory'}
                  </span>
                  {isProcessing ? 'Processando...' : 'Processar e Extrair Texto'}
                </button>
              </div>
            </div>
          )}

          <div className="rag-chat-preview">
            <div className="preview-header">
              <span className="material-symbols-outlined">chat_bubble</span>
              <h3>Teste a Base de Conhecimento</h3>
            </div>
            
            {files.some(f => f.status === 'ready') ? (
              <div className="preview-chat-area">
                <div className="preview-messages">
                  <div className="message assistant">
                    Olá! Eu li {files.filter(f => f.status === 'ready').length} documentos que você processou. O que você gostaria de saber sobre eles?
                  </div>
                </div>
                <div className="preview-input-container">
                  <input type="text" placeholder="Pergunte sobre os documentos..." className="preview-input" />
                  <button className="btn-send-preview"><span className="material-symbols-outlined">send</span></button>
                </div>
              </div>
            ) : (
              <div className="preview-empty">
                <p>Processe alguns documentos primeiro para começar a conversar com eles.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RagMasterPage;
