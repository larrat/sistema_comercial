import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuthStore } from '../../../app/useAuthStore';
import { useFilialStore } from '../../../app/useFilialStore';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { signInWithPassword } from '../services/authApi';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setSession = useAuthStore((s) => s.setSession);
  const clearFilial = useFilialStore((s) => s.clearFilial);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const cfg = getSupabaseConfig();
      if (!cfg.ready) throw new Error('Configuração do servidor não encontrada.');
      clearFilial();
      const session = await signInWithPassword(cfg, email.trim(), password);
      setSession(session);
      navigate('/setup', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao entrar.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rf-shell-state">
      <div className="auth-card">
        <div className="auth-card__kicker">Acesso</div>
        <div className="auth-card__title">Sistema Comercial</div>
        <p className="auth-card__sub">Entre com sua conta para acessar a operação.</p>

        <form onSubmit={handleSubmit} noValidate className="auth-form">
          <div className="fg">
            <label className="fl" htmlFor="auth-email">E-mail</label>
            <input
              id="auth-email"
              className="inp"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="fg">
            <label className="fl" htmlFor="auth-password">Senha</label>
            <input
              id="auth-password"
              className="inp"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          {error && <div className="auth-form__error" role="alert">{error}</div>}

          <button className="btn btn-p btn-block-center" type="submit" disabled={loading}>
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
