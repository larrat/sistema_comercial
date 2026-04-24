import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { Filial } from '../../../../../types/domain';
import { useAuthStore } from '../../../app/useAuthStore';
import { useFilialStore } from '../../../app/useFilialStore';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { listUserFiliais } from '../../auth/services/authApi';
import { getDefaultAppPath } from '../../../app/router/routes';

export function SetupPage() {
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const session = useAuthStore((s) => s.session);
  const clearSession = useAuthStore((s) => s.clearSession);
  const setFilial = useFilialStore((s) => s.setFilial);
  const navigate = useNavigate();

  useEffect(() => {
    if (!session?.access_token || !session.user) return;

    const userId = String((session.user as Record<string, unknown>).id ?? '');
    if (!userId) {
      setError('Sessão inválida. Faça login novamente.');
      setLoading(false);
      return;
    }

    const cfg = getSupabaseConfig();
    listUserFiliais(cfg, session.access_token, userId)
      .then((list) => {
        setFiliais(list);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Erro ao carregar filiais.');
        setLoading(false);
      });
  }, [session]);

  function handleSelect(filialId: string) {
    setFilial(filialId);
    navigate(getDefaultAppPath(), { replace: true });
  }

  function handleLogout() {
    clearSession();
    navigate('/login', { replace: true });
  }

  return (
    <div className="rf-shell-state">
      <div className="setup-card-react">
        <div className="auth-card__kicker">Configuração</div>
        <div className="auth-card__title">Escolha a filial</div>
        <p className="auth-card__sub">Selecione a filial para iniciar a operação.</p>

        {loading && (
          <div className="setup-loading">
            <div className="sk-card" style={{ width: '100%' }}>
              <div className="sk-line" />
              <div className="sk-line" />
            </div>
          </div>
        )}

        {error && <div className="auth-form__error" role="alert">{error}</div>}

        {!loading && !error && filiais.length === 0 && (
          <p className="setup-empty">Nenhuma filial disponível para este usuário.</p>
        )}

        {!loading && filiais.length > 0 && (
          <div className="setup-filiais">
            {filiais.map((fil) => (
              <button
                key={fil.id}
                type="button"
                className="setup-filial-btn"
                onClick={() => handleSelect(fil.id)}
              >
                <span className="setup-filial-btn__name">{fil.nome}</span>
                {fil.cidade && (
                  <span className="setup-filial-btn__meta">{fil.cidade}</span>
                )}
              </button>
            ))}
          </div>
        )}

        <button type="button" className="btn btn-gh setup-logout-btn" onClick={handleLogout}>
          Sair
        </button>
      </div>
    </div>
  );
}
