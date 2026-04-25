import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navbar = () => {
  const location = useLocation();

  return (
    <nav className="navbar glass">
      <div className="nav-brand">
        Nebula <span>AI</span>
      </div>
      <div className="nav-links">
        <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
          Chat
        </Link>
        <Link to="/admin" className={location.pathname === '/admin' ? 'active' : ''}>
          Painel Admin
        </Link>
      </div>
      <div className="nav-user">
        <div className="user-avatar glass">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <span>Admin User</span>
      </div>
    </nav>
  );
};

export default Navbar;
