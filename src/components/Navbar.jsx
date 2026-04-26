import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const Navbar = ({ session, onHome, selectedPage, onSelectPage }) => {
  const location = useLocation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <nav className="navbar glass">
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
