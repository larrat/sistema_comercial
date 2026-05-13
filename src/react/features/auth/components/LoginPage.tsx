import { useState } from 'react';
import { Button, Input } from '../../../shared/ui';
import { useNavigate } from 'react-router-dom';

import { useAuthStore } from '../../../app/useAuthStore';
import { useFilialStore } from '../../../app/useFilialStore';
import { useRoleStore } from '../../../app/useRoleStore';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { getMeuPerfil, signInWithPassword } from '../services/authApi';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setSession = useAuthStore((s) => s.setSession);
  const clearFilial = useFilialStore((s) => s.clearFilial);
  const setRole = useRoleStore((s) => s.setRole);
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
      const userId = String((session.user as Record<string, unknown>)?.id ?? '');
      if (userId) {
        const perfil = await getMeuPerfil(cfg, session.access_token, userId);
        if (perfil?.papel) setRole(perfil.papel);
      }
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
          <Input
            label="E-mail"
            id="auth-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            required
          />

          <Input
            label="Senha"
            id="auth-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            required
          />

          {error && <div className="auth-form__error" role="alert">{error}</div>}

          <Button
            variant="primary"
            className="w-full mt-2"
            type="submit"
            loading={loading}
          >
            Entrar
          </Button>
        </form>
      </div>
    </div>
  );
}
