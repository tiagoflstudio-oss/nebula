import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { extractTextFromFile } from '../services/documentParser';
import './RagMasterPage.css';

const RagMasterPage = () => {
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [bases, setBases] = useState([]);
  const [selectedBaseId, setSelectedBaseId] = useState(null);
  const [loadingBases, setLoadingBases] = useState(true);

  useEffect(() => {
    fetchBases();
  }, []);

  const fetchBases = async () => {
    setLoadingBases(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data, error } = await supabase
        .from('knowledge_bases')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBases(data || []);

      if (data && data.length > 0 && !selectedBaseId) {
        setSelectedBaseId(data[0].id);
        fetchDocuments(data[0].id);
      }
    } catch (err) {
      console.error("Erro ao buscar bases:", err);
    } finally {
      setLoadingBases(false);
    }
  };

  const fetchDocuments = async (baseId) => {
    try {
      const { data, error } = await supabase
        .from('knowledge_documents')
        .select('id, filename, file_type, file_size, status')
        .eq('kb_id', baseId);

      if (error) throw error;
      
      if (data) {
        setFiles(data.map(d => ({
          id: d.id,
          name: d.filename,
          type: d.file_type,
          size: (d.file_size / 1024 / 1024).toFixed(2) + ' MB',
          status: 'ready', // already processed
          isStored: true
        })));
      } else {
        setFiles([]);
      }
    } catch (err) {
      console.error("Erro ao buscar documentos:", err);
    }
  };

  const handleCreateBase = async () => {
    const name = prompt("Nome da nova base de conhecimento:");
    if (!name) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase
        .from('knowledge_bases')
        .insert([{ user_id: session.user.id, name }])
        .select();

      if (error) throw error;
      
      if (data && data.length > 0) {
        setBases([data[0], ...bases]);
        setSelectedBaseId(data[0].id);
        setFiles([]);
      }
    } catch (err) {
      console.error("Erro ao criar base:", err);
      alert("Erro ao criar base: " + err.message);
    }
  };

  const handleSelectBase = (id) => {
    setSelectedBaseId(id);
    fetchDocuments(id);
  };

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
    if (!selectedBaseId) {
      alert("Por favor, crie ou selecione uma base de conhecimento primeiro.");
      return;
    }

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
        type: f.type || 'unknown',
        rawSize: f.size,
        size: (f.size / 1024 / 1024).toFixed(2) + ' MB',
        status: 'pending',
        content: null,
        isStored: false
      }))]);
    } else {
      alert("Formato não suportado. Envie PDF, TXT, CSV ou DOCX.");
    }
  };

  const removeFile = async (index) => {
    const fileToRemove = files[index];
    
    if (fileToRemove.isStored && fileToRemove.id) {
      if (!confirm("Remover este documento do banco de dados?")) return;
      try {
        const { error } = await supabase
          .from('knowledge_documents')
          .delete()
          .eq('id', fileToRemove.id);
        if (error) throw error;
      } catch (err) {
        console.error("Erro ao deletar documento:", err);
        alert("Erro ao excluir: " + err.message);
        return;
      }
    }
    
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const processFiles = async () => {
    setIsProcessing(true);
    
    const updatedFiles = [...files];
    const { data: { session } } = await supabase.auth.getSession();
    
    for (let i = 0; i < updatedFiles.length; i++) {
      if (updatedFiles[i].status !== 'pending' || updatedFiles[i].isStored) continue;
      
      updatedFiles[i].status = 'processing';
      setFiles([...updatedFiles]);
      
      try {
        const text = await extractTextFromFile(updatedFiles[i].file);
        
        // Salvar no Supabase
        const { data, error } = await supabase
          .from('knowledge_documents')
          .insert([{
            kb_id: selectedBaseId,
            user_id: session.user.id,
            filename: updatedFiles[i].name,
            file_type: updatedFiles[i].type,
            file_size: updatedFiles[i].rawSize,
            content: text
          }])
          .select();
          
        if (error) throw error;

        updatedFiles[i].id = data[0].id;
        updatedFiles[i].content = text;
        updatedFiles[i].status = 'ready';
        updatedFiles[i].isStored = true;
        
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
            {loadingBases ? (
              <div style={{color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', padding: '10px'}}>Carregando...</div>
            ) : bases.length === 0 ? (
              <div style={{color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', padding: '10px'}}>Nenhuma base criada.</div>
            ) : (
              bases.map(base => (
                <div 
                  key={base.id} 
                  className={`kb-item ${selectedBaseId === base.id ? 'active' : ''}`}
                  onClick={() => handleSelectBase(base.id)}
                >
                  <span className="material-symbols-outlined">folder_open</span>
                  <div className="kb-info">
                    <span className="kb-name">{base.name}</span>
                  </div>
                </div>
              ))
            )}
            <button className="btn-new-kb" onClick={handleCreateBase}>
              <span className="material-symbols-outlined">add</span>
              Nova Base
            </button>
          </div>
        </div>

        <div className="rag-main">
          {!selectedBaseId ? (
             <div className="upload-zone">
               <span className="material-symbols-outlined upload-icon">arrow_back</span>
               <h3>Selecione ou crie uma Base</h3>
               <p>Você precisa de uma base de conhecimento para armazenar documentos.</p>
             </div>
          ) : (
            <>
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
                        {f.status === 'ready' && <span className="status-badge ready">Salvo no DB</span>}
                        {f.status === 'error' && <span className="status-badge error" style={{background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444'}}>Erro</span>}
                        <button className="btn-remove-file" onClick={() => removeFile(i)}>
                          <span className="material-symbols-outlined">close</span>
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  {files.some(f => !f.isStored) && (
                    <div className="rag-actions">
                      <button 
                        className="btn-process" 
                        disabled={isProcessing}
                        onClick={processFiles}
                      >
                        <span className="material-symbols-outlined">
                          {isProcessing ? 'sync' : 'memory'}
                        </span>
                        {isProcessing ? 'Salvando no Banco...' : 'Extrair Texto e Salvar'}
                      </button>
                    </div>
                  )}
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
                        Olá! Eu tenho acesso a {files.filter(f => f.status === 'ready').length} documentos salvos nesta base. O que você gostaria de saber sobre eles?
                      </div>
                    </div>
                    <div className="preview-input-container">
                      <input type="text" placeholder="Pergunte sobre os documentos..." className="preview-input" />
                      <button className="btn-send-preview"><span className="material-symbols-outlined">send</span></button>
                    </div>
                  </div>
                ) : (
                  <div className="preview-empty">
                    <p>Processe e salve alguns documentos primeiro para começar a conversar com eles.</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RagMasterPage;
