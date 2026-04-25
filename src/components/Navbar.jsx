import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const Navbar = ({ session }) => {
  const location = useLocation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <nav className="navbar glass">
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
