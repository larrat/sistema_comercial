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
    <div className="min-h-screen w-full flex bg-[#030712] text-slate-200">
      {/* Left Panel: Branding & Ambient */}
      <div className="hidden lg:flex flex-col flex-1 relative overflow-hidden bg-slate-900 border-r border-white/5">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 via-slate-900 to-slate-900 z-0"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E')] opacity-[0.03] z-0 mix-blend-overlay"></div>
        
        {/* Glow Effects */}
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-teal-500/20 blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-[10%] right-[10%] w-[30%] h-[30%] rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none"></div>

        <div className="relative z-10 flex flex-col justify-between h-full p-12">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center shadow-[0_0_20px_rgba(20,184,166,0.3)]">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight leading-none uppercase font-['Plus_Jakarta_Sans']">Nexus</h1>
              <p className="mt-1 text-sm font-medium text-slate-400">Industrial</p>
            </div>
          </div>

          <div className="max-w-md">
            <h2 className="text-4xl font-black text-white leading-[1.1] tracking-tight mb-4 font-['Plus_Jakarta_Sans']">
              Inteligência comercial <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400">em tempo real.</span>
            </h2>
            <p className="text-slate-400 text-lg font-medium leading-relaxed">
              Plataforma de gestão integrada para operações complexas. Controle de estoque, pedidos e analytics.
            </p>
          </div>
          
          <div className="flex items-center gap-4 text-sm font-semibold text-slate-500">
            <span>&copy; {new Date().getFullYear()} Nexus Inc.</span>
            <span className="w-1 h-1 rounded-full bg-slate-700"></span>
            <span>v2.0.0</span>
          </div>
        </div>
      </div>

      {/* Right Panel: Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 relative z-10">
        <div className="w-full max-w-[400px] flex flex-col gap-8">
          
          {/* Mobile Branding (Visible only on small screens) */}
          <div className="flex lg:hidden items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight uppercase font-['Plus_Jakarta_Sans']">Nexus</h1>
              <p className="text-sm font-medium text-slate-400">Industrial</p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-bold text-white font-['Plus_Jakarta_Sans']">Bem-vindo de volta</h2>
            <p className="text-slate-400">Insira suas credenciais para acessar o sistema.</p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
            <Input
              label="E-mail corporativo"
              id="auth-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              placeholder="seu.nome@empresa.com"
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
              placeholder="••••••••"
              required
            />

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 text-sm text-rose-400 font-medium" role="alert">
                {error}
              </div>
            )}

            <Button
              variant="primary"
              className="w-full mt-2 h-12 text-[15px]"
              type="submit"
              loading={loading}
            >
              Entrar na Plataforma
            </Button>
          </form>
          
          <p className="text-center text-sm text-slate-500 font-medium">
            Esqueceu sua senha? <a href="#" className="text-teal-400 hover:text-teal-300 transition-colors">Recuperar acesso</a>
          </p>
        </div>
      </div>
    </div>
  );
}
