import { Modal } from '../../../shared/ui';
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

  const isLote = lote.active;
  const loteInfo = isLote ? `${lote.index + 1} / ${lote.ids.length}` : null;

  function handleClose() {
    if (isLote) cancelarLote();
    else closeWaModal();
  }

  if (!waModal.open) return null;

  const { envio, campanha } = waModal;

  function copiarMensagem() {
    if (envio.mensagem) void navigator.clipboard.writeText(envio.mensagem);
  }

  function copiarNumero() {
    if (envio.destino) void navigator.clipboard.writeText(envio.destino.replace(/\D/g, ''));
  }

  async function handleEnviadoEAvancar() {
    await marcarEnviado(envio);
    if (isLote) abrirWhatsAppEAvancarLote(envio);
    else closeWaModal();
  }

  async function handleFalhouEAvancar() {
    await marcarFalhou(envio);
    if (isLote) useCampanhasStore.getState().avancarLote();
    else closeWaModal();
  }

  const title = campanha?.nome
    ? `${campanha.nome}${loteInfo ? ` — ${loteInfo}` : ''}`
    : 'WhatsApp Preview';

  return (
    <Modal
      open={waModal.open}
      title={title}
      onClose={handleClose}
      closeOnOverlay={!isLote}
      footer={
        <>
          <button
            className="btn btn-sm"
            type="button"
            style={{ color: 'var(--color-danger, #dc2626)' }}
            onClick={() => void handleFalhouEAvancar()}
          >
            Falhou{isLote ? ' e avançar' : ''}
          </button>
          <button
            className="btn btn-p btn-sm"
            type="button"
            onClick={() => void handleEnviadoEAvancar()}
          >
            Enviado{isLote ? ' e avançar' : ''}
          </button>
        </>
      }
    >
      <div className="fg">
        <div className="camp-wa-destino">
          <span className="fl">Para:</span>
          <strong>{fmtNum(envio.destino)}</strong>
          <button className="btn btn-sm" type="button" onClick={copiarNumero}>
            Copiar número
          </button>
        </div>

        <div className="camp-wa-msg-box">
          <pre className="camp-wa-msg">{envio.mensagem || '(sem mensagem)'}</pre>
        </div>

        <div className="camp-wa-actions-row">
          <button
            className="btn btn-p btn-sm"
            type="button"
            onClick={() => {
              if (isLote) abrirWhatsAppEAvancarLote(envio);
              else abrirWhatsApp(envio);
            }}
          >
            Abrir WhatsApp{isLote ? ' e avançar' : ''}
          </button>
          <button className="btn btn-sm" type="button" onClick={copiarMensagem}>
            Copiar mensagem
          </button>
        </div>
      </div>
    </Modal>
  );
}
