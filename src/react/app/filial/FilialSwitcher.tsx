import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building, ChevronDown, X, Check } from 'lucide-react';

import { useAuthStore } from '../useAuthStore';
import { useFilialStore } from '../useFilialStore';
import { useRoleStore } from '../useRoleStore';
import { getSupabaseConfig } from '../supabaseConfig';
import { listUserFiliais } from '../../features/auth/services/authApi';
import type { Filial } from '../../../types/domain';

export function FilialSwitcher({ variant = 'dark', collapsed = false, isTopbar = false }: { variant?: 'dark' | 'light'; collapsed?: boolean; isTopbar?: boolean }) {
  const [open, setOpen] = useState(false);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const session = useAuthStore((s) => s.session);
  const filialId = useFilialStore((s) => s.filialId);
  const filiaisPermitidas = useFilialStore((s) => s.filiaisPermitidas);
  const setFilial = useFilialStore((s) => s.setFilial);
  const setRole = useRoleStore((s) => s.setRole);
  const setPermissoes = useRoleStore((s) => s.setPermissoes);
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

  useEffect(() => {
    void loadFiliais();
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
      
      // Update role and permissions context
      const newCtx = filiaisPermitidas.find(f => f.filial_id === id);
      if (newCtx) {
        setRole(newCtx.cargo_id || 'operador');
        setPermissoes(newCtx.permissoes || []);
      }
      
      navigate('/app/dashboard', { replace: true });
    }
    handleClose();
  }

  const isDark = variant === 'dark';

  return (
    <>
      <div className={`flex flex-col gap-1 ${collapsed ? 'items-center' : 'items-start'} ${isTopbar ? 'w-auto' : 'w-full'}`}>
        {!collapsed && !isTopbar && <div className="text-[10px] uppercase font-black tracking-[0.15em] text-slate-600 ml-1 mb-1">Filial ativa</div>}
        <button
          className={`flex items-center justify-center gap-2 rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50 disabled:cursor-not-allowed group ${
            collapsed 
              ? "w-12 h-12 hover:bg-slate-800 text-slate-400 hover:text-white"
              : isTopbar
                ? "px-4 h-10 bg-black/20 border border-white/5 text-slate-300 hover:bg-black/40 hover:border-white/10"
                : "w-full px-4 py-3 border shadow-sm bg-slate-800/40 border-slate-700/50 text-slate-300 hover:bg-slate-800 hover:border-slate-600 focus-visible:ring-slate-500"
          }`}
          type="button"
          onClick={handleOpen}
          disabled={!session}
          aria-haspopup="dialog"
          aria-expanded={open}
          title={collapsed ? displayName : "Trocar filial ativa"}
        >
          <Building size={collapsed ? 24 : 16} className="text-[#C5A059] drop-shadow-[0_0_8px_rgba(197,160,89,0.3)] flex-shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 text-[14px] font-bold tracking-tight truncate text-left">{displayName}</span>
              <ChevronDown size={14} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
            </>
          )}
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={handleClose} />
          <div
            className="relative w-full max-w-sm bg-slate-900 rounded-xl shadow-2xl border border-white/10 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
            role="dialog"
            aria-modal="true"
            aria-label="Trocar filial"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-white/5">
              <span className="text-base font-bold text-white">Trocar filial</span>
              <button
                className="p-1.5 rounded-md text-slate-500 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
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
                <div className="p-4 text-center text-sm font-medium text-rose-400 bg-rose-400/10 rounded-lg m-2 border border-rose-400/20">{error}</div>
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
                          ? 'bg-blue-500/10 text-white shadow-sm ring-1 ring-blue-500/20'
                          : 'hover:bg-white/5 text-slate-400 hover:text-slate-200'
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
                        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">
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
