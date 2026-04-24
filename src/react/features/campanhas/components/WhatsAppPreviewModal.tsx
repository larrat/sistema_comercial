import { useCampanhasStore } from '../store/useCampanhasStore';
import { useCampanhasMutations } from '../hooks/useCampanhasMutations';

function fmtNum(destino: string | null | undefined): string {
  if (!destino) return '—';
  const d = destino.replace(/\D/g, '');
  return d.length >= 11 ? `+${d}` : destino;
}

export function WhatsAppPreviewModal() {
  const waModal = useCampanhasStore((s) => s.waModal);
  const lote = useCampanhasStore((s) => s.lote);
  const closeWaModal = useCampanhasStore((s) => s.closeWaModal);
  const cancelarLote = useCampanhasStore((s) => s.cancelarLote);
  const { marcarEnviado, marcarFalhou, abrirWhatsAppEAvancarLote, abrirWhatsApp } =
    useCampanhasMutations();

  if (!waModal.open) return null;

  const { envio, campanha } = waModal;
  const isLote = lote.active;
  const loteInfo = isLote ? `${lote.index + 1} / ${lote.ids.length}` : null;

  function handleClose() {
    if (isLote) {
      cancelarLote();
    } else {
      closeWaModal();
    }
  }

  function copiarMensagem() {
    if (envio.mensagem) {
      void navigator.clipboard.writeText(envio.mensagem);
    }
  }

  function copiarNumero() {
    if (envio.destino) {
      void navigator.clipboard.writeText(envio.destino.replace(/\D/g, ''));
    }
  }

  async function handleEnviadoEAvancar() {
    await marcarEnviado(envio);
    if (isLote) {
      abrirWhatsAppEAvancarLote(envio);
    } else {
      closeWaModal();
    }
  }

  async function handleFalhouEAvancar() {
    await marcarFalhou(envio);
    if (isLote) {
      useCampanhasStore.getState().avancarLote();
    } else {
      closeWaModal();
    }
  }

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-box modal-box--wa" onClick={(e) => e.stopPropagation()}>
        <div className="modal-hdr">
          <span>
            {campanha?.nome ?? 'WhatsApp Preview'}
            {loteInfo && <span className="camp-lote-badge">{loteInfo}</span>}
          </span>
          <button className="modal-close" onClick={handleClose}>✕</button>
        </div>

        <div className="form-body">
          <div className="camp-wa-destino">
            <span className="camp-field-label">Para:</span>
            <strong>{fmtNum(envio.destino)}</strong>
            <button className="btn btn-xs btn-ghost" onClick={copiarNumero}>Copiar</button>
          </div>

          <div className="camp-wa-msg-box">
            <pre className="camp-wa-msg">{envio.mensagem || '(sem mensagem)'}</pre>
          </div>

          <div className="camp-wa-actions-row">
            <button
              className="btn btn-primary"
              onClick={() => { isLote ? abrirWhatsAppEAvancarLote(envio) : abrirWhatsApp(envio); }}
            >
              Abrir WhatsApp{isLote ? ' e avançar' : ''}
            </button>
            <button className="btn btn-ghost" onClick={copiarMensagem}>
              Copiar mensagem
            </button>
          </div>
        </div>

        <div className="modal-ftr">
          <button
            className="btn btn-ghost tone-danger"
            onClick={() => { void handleFalhouEAvancar(); }}
          >
            Marcar falhou{isLote ? ' e avançar' : ''}
          </button>
          <button
            className="btn btn-success"
            onClick={() => { void handleEnviadoEAvancar(); }}
          >
            Enviado{isLote ? ' e avançar' : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
