export function AcessosRoutePage() {
  return (
    <div className="rf-content">
      <div className="rf-ui-page-header">
        <div className="rf-ui-page-header__copy">
          <div className="rf-ui-page-header__kicker">Administração</div>
          <h1 className="rf-ui-page-header__title">Acessos</h1>
          <p className="rf-ui-page-header__description">
            Perfis de usuário, vínculos a filiais, convites e auditoria.
          </p>
        </div>
      </div>

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
