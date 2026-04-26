import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState(null);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: { full_name: fullName }
          }
        });
        if (error) throw error;
        alert('Verifique seu e-mail para confirmar o cadastro!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-overlay">
      <div className="auth-nebula-glow"></div>
      <div className="auth-card glass fade-in">
        <div className="auth-header">
          <div className="auth-logo">
            <span className="star-icon">✴</span>
            <h2>Nebula <span>AI</span></h2>
          </div>
          <p>{isSignUp ? 'Crie sua conta no ecossistema' : 'Bem-vindo de volta ao futuro'}</p>
        </div>

        <form className="auth-form" onSubmit={handleAuth}>
          {isSignUp && (
            <div className="auth-field">
              <label>Nome Completo</label>
              <div className="input-with-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
                <input
                  type="text"
                  placeholder="Seu nome"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required={isSignUp}
                />
              </div>
            </div>
          )}

          <div className="auth-field">
            <label>E-mail Corporativo</label>
            <div className="input-with-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
              </svg>
              <input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="auth-field">
            <label>Sua Senha</label>
            <div className="input-with-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {error && <div className="auth-error-message">{error}</div>}

          <button type="submit" className="btn-auth-premium" disabled={loading}>
            {loading ? (
              <span className="loader-dots">
                <span></span><span></span><span></span>
              </span>
            ) : (
              <>{isSignUp ? 'Finalizar Cadastro' : 'Entrar no Sistema'}</>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>{isSignUp ? 'Já possui acesso?' : 'Ainda não tem uma conta?'}</p>
          <button className="btn-toggle-auth" onClick={() => setIsSignUp(!isSignUp)}>
            {isSignUp ? 'Faça login aqui' : 'Solicite acesso agora'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
