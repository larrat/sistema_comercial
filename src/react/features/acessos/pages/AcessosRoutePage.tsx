import { PageHeader } from '../../../shared/ui';

export function AcessosRoutePage() {
  return (
    <div className="w-full flex flex-col gap-8">
      <PageHeader
        kicker="Administração"
        title="Acessos"
        description="Perfis de usuário, vínculos a filiais, convites e auditoria."
      />

      <div className="rf-card-premium p-10 max-w-lg border-white/5 bg-surface-card/40 backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] hover:border-white/10 hover:shadow-teal-500/5 active:scale-[0.99]">
        <div className="text-4xl mb-6">🔒</div>
        <h2 className="text-xl font-black text-white uppercase tracking-tight mb-2">Em implantação</h2>
        <p className="text-slate-400 font-medium leading-relaxed">
          O módulo de Acessos está sendo preparado. Em breve você poderá gerenciar perfis,
          vínculos por filial, enviar convites e consultar o histórico de auditoria.
        </p>
      </div>
    </div>
  );
}
