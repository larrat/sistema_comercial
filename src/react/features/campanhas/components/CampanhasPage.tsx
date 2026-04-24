import { PageHeader } from '../../../shared/ui/PageHeader';
import { useCampanhasStore } from '../store/useCampanhasStore';
import { useCampanhasMutations } from '../hooks/useCampanhasMutations';
import { CampanhaModal } from './CampanhaModal';
import { WhatsAppPreviewModal } from './WhatsAppPreviewModal';
import { FilaWhatsAppSection } from './FilaWhatsAppSection';
import { HistoricoEnviosSection } from './HistoricoEnviosSection';
import type { Campanha } from '../../../../types/domain';

function labelTipo(tipo: string | undefined): string {
  const map: Record<string, string> = {
    aniversario: 'Aniversário',
    reativacao: 'Reativação',
    promocao: 'Promoção',
    outro: 'Outro'
  };
  return map[tipo ?? ''] ?? (tipo ?? '—');
}

function CampanhaCard({ campanha }: { campanha: Campanha }) {
  const openCampModal = useCampanhasStore((s) => s.openCampModal);
  const { remover, gerarFila } = useCampanhasMutations();

  return (
    <div className="card camp-card">
      <div className="camp-card-hdr">
        <div className="camp-card-nome">{campanha.nome}</div>
        <span className={`camp-status-badge ${campanha.ativo ? 'tone-success' : 'tone-muted'}`}>
          {campanha.ativo ? 'ativa' : 'inativa'}
        </span>
      </div>
      <div className="camp-card-meta">
        <span>{labelTipo(campanha.tipo)}</span>
        <span>{campanha.canal ?? '—'}</span>
        {campanha.dias_antecedencia != null && (
          <span>{campanha.dias_antecedencia}d antecedência</span>
        )}
        {campanha.desconto ? <span>{campanha.desconto}% desc.</span> : null}
      </div>
      {campanha.mensagem && (
        <p className="camp-card-msg">{campanha.mensagem.slice(0, 100)}{campanha.mensagem.length > 100 ? '…' : ''}</p>
      )}
      <div className="camp-card-actions">
        <button className="btn btn-xs btn-ghost" onClick={() => openCampModal(campanha)}>
          Editar
        </button>
        <button
          className="btn btn-xs btn-primary"
          onClick={() => { void gerarFila(campanha.id); }}
        >
          Gerar fila
        </button>
        <button
          className="btn btn-xs btn-ghost tone-danger"
          onClick={() => {
            if (window.confirm(`Remover a campanha "${campanha.nome}"?`)) {
              void remover(campanha.id);
            }
          }}
        >
          Remover
        </button>
      </div>
    </div>
  );
}

export function CampanhasPage() {
  const campanhas = useCampanhasStore((s) => s.campanhas);
  const envios = useCampanhasStore((s) => s.envios);
  const loading = useCampanhasStore((s) => s.loading);
  const error = useCampanhasStore((s) => s.error);
  const openCampModal = useCampanhasStore((s) => s.openCampModal);
  const requestReload = useCampanhasStore((s) => s.requestReload);

  const ativas = campanhas.filter((c) => c.ativo !== false);
  const pendentes = envios.filter((e) => (e.status ?? 'pendente') === 'pendente').length;
  const enviados = envios.filter((e) => e.status === 'enviado').length;
  const falhos = envios.filter((e) => e.status === 'falhou').length;

  return (
    <div className="rf-ui-stack">
      <PageHeader
        title="Campanhas"
        subtitle="Gerencie campanhas de marketing e fila de WhatsApp"
        actions={
          <>
            <button className="btn btn-ghost" onClick={requestReload} disabled={loading}>
              {loading ? 'Carregando…' : 'Atualizar'}
            </button>
            <button className="btn btn-primary" onClick={() => openCampModal()}>
              Nova campanha
            </button>
          </>
        }
      />

      {error && (
        <div className="rf-error-banner">{error}</div>
      )}

      <div className="mg bento-band">
        <div className="met"><div className="ml">Campanhas</div><div className="mv">{ativas.length}</div></div>
        <div className="met"><div className="ml">Pendentes</div><div className="mv tone-warning">{pendentes}</div></div>
        <div className="met"><div className="ml">Enviados</div><div className="mv tone-success">{enviados}</div></div>
        <div className="met"><div className="ml">Falhos</div><div className="mv tone-danger">{falhos}</div></div>
      </div>

      {campanhas.length === 0 && !loading ? (
        <div className="card card-shell">
          <div className="empty">
            <div className="ico">CM</div>
            <p>Nenhuma campanha cadastrada.</p>
            <button className="btn btn-primary" onClick={() => openCampModal()}>
              Criar primeira campanha
            </button>
          </div>
        </div>
      ) : (
        <div className="camp-grid">
          {campanhas.map((c) => <CampanhaCard key={c.id} campanha={c} />)}
        </div>
      )}

      <FilaWhatsAppSection />
      <HistoricoEnviosSection />

      <CampanhaModal />
      <WhatsAppPreviewModal />
    </div>
  );
}
