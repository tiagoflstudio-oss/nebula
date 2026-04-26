import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState(null);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
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
<<<<<<< HEAD
    <div className="auth-container glass fade-in">
      <div className="auth-header">
        <h2>Nebula <span>AI</span></h2>
        <p>Acesse seu painel pessoal</p>
=======
    <div className="auth-container glass glass-card fade-in">
      <div className="auth-header">
        <h2>{isSignUp ? 'Criar Conta' : 'Boas-vindas'}</h2>
        <p>{isSignUp ? 'Junte-se à inteligência do Nebula' : 'Acesse seu painel pessoal'}</p>
>>>>>>> a9f69f60651e849b991e733636d692f1d68c0024
      </div>

      <form className="auth-form" onSubmit={handleAuth}>
        <div className="auth-input-group">
          <label>E-mail</label>
          <input
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="auth-input-group">
          <label>Senha</label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && <div className="auth-error">{error}</div>}

<<<<<<< HEAD
        <button type="submit" className="btn-auth" disabled={loading}>
          {loading ? 'Processando...' : isSignUp ? 'Criar Conta' : 'Entrar'}
        </button>
      </form>

      <p className="auth-footer">
        {isSignUp ? 'Já tem conta?' : 'Ainda não tem conta?'}
        <button onClick={() => setIsSignUp(!isSignUp)}>
          {isSignUp ? 'Faça login' : 'Cadastre-se'}
        </button>
      </p>
=======
        <button className="btn-auth" type="submit" disabled={loading}>
          {loading ? 'Processando...' : isSignUp ? 'Cadastrar' : 'Entrar'}
        </button>
      </form>

      <div className="auth-footer">
        {isSignUp ? 'Já tem uma conta?' : 'Ainda não tem conta?'}
        <button onClick={() => setIsSignUp(!isSignUp)}>
          {isSignUp ? 'Faça Login' : 'Cadastre-se'}
        </button>
      </div>
>>>>>>> a9f69f60651e849b991e733636d692f1d68c0024
    </div>
  );
};

export default Auth;
