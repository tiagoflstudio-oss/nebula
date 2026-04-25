import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import Background from './components/Background';
import Chat from './components/Chat';
import AdminPanel from './components/AdminPanel';
import Navbar from './components/Navbar';
import AdminPage from './pages/AdminPage';

function App() {
  const [config, setConfig] = useState({
    ip: 'localhost',
    port: '11434',
    model: 'llama3'
  });

  return (
    <Router>
      <div className="app-container">
        <Background />
        <Navbar />
        
        <div className="main-content">
          <Routes>
            <Route path="/" element={
              <>
                <header className="fade-in">
                  <h1>Nebula <span>AI</span></h1>
                  <p>Inteligência Artificial Minimalista</p>
                </header>
                <Chat ollamaConfig={config} />
                <AdminPanel config={config} setConfig={setConfig} />
              </>
            } />
            <Route path="/admin" element={<AdminPage config={config} />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
