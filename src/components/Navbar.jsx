import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

<<<<<<< HEAD
const Navbar = ({ session, onHome, selectedPage, onSelectPage }) => {
=======
const Navbar = ({ session }) => {
>>>>>>> a9f69f60651e849b991e733636d692f1d68c0024
  const location = useLocation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <nav className="navbar glass">
<<<<<<< HEAD
      <div className="nav-brand" onClick={onHome} style={{ cursor: 'pointer' }}>
        Nebula <span>AI</span>
      </div>
      
      <div className="nav-links">
        {session && (
          <>
            <button className="nav-home-btn" onClick={onHome} title="Nova Conversa">
              N
            </button>
            
            {session.user.email === 'tiagoflstudio@gmail.com' && (
              <button 
                className={`nav-btn-link ${selectedPage === 'admin' ? 'active' : ''}`}
                onClick={() => onSelectPage('admin')}
              >
                God Mode
              </button>
=======
      <div className="nav-brand">
        Nebula <span>AI</span>
      </div>
      <div className="nav-links">
        {session && (
          <>
            <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
              Chat
            </Link>
            {/* O painel admin só aparece para um e-mail específico por enquanto */}
            {session.user.email === 'tiagoflstudio@gmail.com' && (
              <Link to="/admin" className={location.pathname === '/admin' ? 'active' : ''}>
                Painel Admin
              </Link>
>>>>>>> a9f69f60651e849b991e733636d692f1d68c0024
            )}
          </>
        )}
      </div>
      <div className="nav-user">
        {session ? (
          <>
            <div className="user-avatar glass" style={{ cursor: 'pointer' }} onClick={handleLogout} title="Sair">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
            </div>
            <span>{session.user.email.split('@')[0]}</span>
          </>
        ) : (
          <span>Desconectado</span>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
