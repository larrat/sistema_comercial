type AppContentProps = {
  kicker?: string;
  title: string;
  description: string;
};

export function AppContent({ kicker = 'Base criada', title, description }: AppContentProps) {
  return (
    <main className="rf-content">
      <section className="rf-panel rf-panel--hero">
        <div className="rf-panel__kicker">{kicker}</div>
        <h2 className="rf-panel__title">{title}</h2>
        <p className="rf-panel__copy">{description}</p>
      </section>

      <section className="rf-content__grid">
        <section className="rf-panel">
          <div className="rf-panel__kicker">Status</div>
          <h2 className="rf-panel__title">Layout principal ativo</h2>
          <p className="rf-panel__copy">
            Sidebar, topbar, outlet e superfícies globais agora fazem parte do shell React.
          </p>
        </section>

        <section className="rf-panel">
          <div className="rf-panel__kicker">Próximo encaixe</div>
          <h2 className="rf-panel__title">Fase 1 consolidada</h2>
          <p className="rf-panel__copy">
            O shell React já controla a onda 1. As próximas rodadas focam em reduzir dependências
            transitórias e migrar os módulos ainda legados.
          </p>
        </section>
      </section>
    </main>
  );
}
