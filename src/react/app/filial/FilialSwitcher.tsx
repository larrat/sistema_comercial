import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuthStore } from '../useAuthStore';
import { useFilialStore } from '../useFilialStore';
import { getSupabaseConfig } from '../supabaseConfig';
import { listUserFiliais } from '../../features/auth/services/authApi';
import type { Filial } from '../../../types/domain';

export function FilialSwitcher() {
  const [open, setOpen] = useState(false);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const session = useAuthStore((s) => s.session);
  const filialId = useFilialStore((s) => s.filialId);
  const setFilial = useFilialStore((s) => s.setFilial);
  const navigate = useNavigate();

  const currentFilial = filiais.find((f) => f.id === filialId);
  const displayName = currentFilial?.nome ?? (filialId ? '…' : 'Sem filial');

  async function loadFiliais() {
    if (!session?.access_token) return;
    const userId = String((session.user as Record<string, unknown>)?.id ?? '');
    const cfg = getSupabaseConfig();
    if (!cfg.ready || !userId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listUserFiliais(
        { url: cfg.url, key: cfg.key },
        session.access_token,
        userId
      );
      setFiliais(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar filiais.');
    } finally {
      setLoading(false);
    }
  }

  // Carrega filiais em background para mostrar o nome na topbar imediatamente
  useEffect(() => {
    void loadFiliais();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token]);

  function handleOpen() {
    setOpen(true);
    if (!filiais.length) void loadFiliais();
  }

  const handleClose = useCallback(() => {
    setOpen(false);
    setError(null);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, handleClose]);

  function handleSelect(id: string) {
    if (id !== filialId) {
      setFilial(id);
      navigate('/app/dashboard', { replace: true });
    }
    handleClose();
  }

  return (
    <>
      <div className="rf-filial-sw">
        <div className="rf-filial-sw__label">Filial ativa</div>
        <button
          className="rf-filial-sw__btn"
          type="button"
          onClick={handleOpen}
          disabled={!session}
          aria-haspopup="dialog"
          aria-expanded={open}
          title="Trocar filial ativa"
        >
          <span className="rf-filial-sw__name">{displayName}</span>
          <span className="rf-filial-sw__caret" aria-hidden="true">▾</span>
        </button>
      </div>

      {open && (
        <div className="rf-filial-modal-wrap" style={{ display: 'flex' }}>
          <div className="rf-filial-modal-bg" onClick={handleClose} />
          <div
            className="rf-filial-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Trocar filial"
          >
            <div className="rf-filial-modal__head">
              <span className="rf-filial-modal__title">Trocar filial</span>
              <button
                className="rf-filial-modal__close"
                type="button"
                aria-label="Fechar"
                onClick={handleClose}
              >
                ✕
              </button>
            </div>
            <div className="rf-filial-modal__list">
              {loading && <div className="rf-filial-modal__hint">Carregando…</div>}
              {error && (
                <div className="rf-filial-modal__hint rf-filial-modal__hint--err">{error}</div>
              )}
              {!loading && !error && filiais.length === 0 && (
                <div className="rf-filial-modal__hint">Nenhuma filial disponível.</div>
              )}
              {!loading &&
                filiais.map((f) => (
                  <button
                    key={f.id}
                    className={`rf-filial-modal__item${f.id === filialId ? ' is-active' : ''}`}
                    type="button"
                    onClick={() => handleSelect(f.id)}
                  >
                    <span
                      className="rf-filial-modal__cor"
                      style={{ background: f.cor ?? '#163F80' }}
                    />
                    <span className="rf-filial-modal__nome">{f.nome}</span>
                    {f.id === filialId && (
                      <span className="rf-filial-modal__badge">ativa</span>
                    )}
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
