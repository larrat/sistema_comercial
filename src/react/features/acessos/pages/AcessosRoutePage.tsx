import { PageHeader } from '../../../shared/ui';

export function AcessosRoutePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex flex-col gap-6">
      <PageHeader
        kicker="Administração"
        title="Acessos"
        description="Perfis de usuário, vínculos a filiais, convites e auditoria."
      />

      <div className="card" style={{ padding: '32px 28px', maxWidth: 520 }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
        <h2 style={{ margin: '0 0 8px', fontSize: 18 }}>Em implantação</h2>
        <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.6 }}>
          O módulo de Acessos está sendo preparado. Em breve você poderá gerenciar perfis,
          vínculos por filial, enviar convites e consultar o histórico de auditoria.
        </p>
      </div>
    </div>
  );
}
