import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building, ChevronDown, X, Check } from 'lucide-react';

import { useAuthStore } from '../useAuthStore';
import { useFilialStore } from '../useFilialStore';
import { getSupabaseConfig } from '../supabaseConfig';
import { listUserFiliais } from '../../features/auth/services/authApi';
import type { Filial } from '../../../types/domain';

export function FilialSwitcher({ variant = 'light', collapsed = false }: { variant?: 'dark' | 'light'; collapsed?: boolean }) {
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

  const isDark = variant === 'dark';

  return (
    <>
      <div className={`flex flex-col gap-1 ${collapsed ? 'items-center' : 'items-start'} w-full`}>
        {!collapsed && <div className={`text-[10px] uppercase font-bold tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-500'} ml-1`}>Filial ativa</div>}
        <button
          className={`flex items-center justify-center gap-2 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50 disabled:cursor-not-allowed group ${
            collapsed 
              ? `w-10 h-10 ${isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-600'}`
              : `w-full px-3 py-2 border shadow-sm ${
                  isDark 
                    ? 'bg-slate-800/50 border-slate-700/50 text-slate-300 hover:bg-slate-800 hover:border-slate-600 focus-visible:ring-slate-500' 
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-blue-200 focus-visible:ring-blue-500'
                }`
          }`}
          type="button"
          onClick={handleOpen}
          disabled={!session}
          aria-haspopup="dialog"
          aria-expanded={open}
          title={collapsed ? displayName : "Trocar filial ativa"}
        >
          <Building size={collapsed ? 20 : 16} className={`${isDark ? 'text-[#C5A059]' : 'text-blue-600'} flex-shrink-0`} />
          {!collapsed && (
            <>
              <span className="flex-1 text-sm font-semibold truncate text-left">{displayName}</span>
              <ChevronDown size={14} className={`${isDark ? 'text-slate-500 group-hover:text-slate-400' : 'text-slate-400 group-hover:text-blue-500'} transition-colors`} />
            </>
          )}
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={handleClose} />
          <div
            className="relative w-full max-w-sm bg-white rounded-xl shadow-2xl border border-slate-200/60 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
            role="dialog"
            aria-modal="true"
            aria-label="Trocar filial"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
              <span className="text-base font-bold text-slate-800">Trocar filial</span>
              <button
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                type="button"
                aria-label="Fechar"
                onClick={handleClose}
              >
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto max-h-[60vh] p-2 flex flex-col gap-1 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
              {loading && <div className="p-4 text-center text-sm text-slate-500">Carregando…</div>}
              {error && (
                <div className="p-4 text-center text-sm font-medium text-red-600 bg-red-50 rounded-lg m-2">{error}</div>
              )}
              {!loading && !error && filiais.length === 0 && (
                <div className="p-4 text-center text-sm text-slate-500">Nenhuma filial disponível.</div>
              )}
              {!loading &&
                filiais.map((f) => {
                  const isActive = f.id === filialId;
                  return (
                    <button
                      key={f.id}
                      className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                        isActive
                          ? 'bg-blue-50 text-blue-900 shadow-sm shadow-blue-100/50'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                      type="button"
                      onClick={() => handleSelect(f.id)}
                    >
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm"
                        style={{ background: f.cor ?? '#163F80' }}
                      />
                      <span className={`flex-1 text-sm ${isActive ? 'font-bold' : 'font-medium'}`}>{f.nome}</span>
                      {isActive && (
                        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-100/80 px-2 py-0.5 rounded-md">
                          <Check size={10} strokeWidth={3} /> Ativa
                        </span>
                      )}
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
