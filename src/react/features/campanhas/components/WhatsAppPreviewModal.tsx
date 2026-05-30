import { Modal, Button } from '../../../shared/ui';
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
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
          <Button
            variant="danger"
            onClick={() => void handleFalhouEAvancar()}
          >
            Falhou{isLote ? ' e avançar' : ''}
          </Button>
          <Button
            variant="primary"
            onClick={() => void handleEnviadoEAvancar()}
          >
            Enviado{isLote ? ' e avançar' : ''}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-slate-400">Para:</span>
            <strong className="text-lg text-white">{fmtNum(envio.destino)}</strong>
          </div>
          <Button variant="secondary" size="sm" onClick={copiarNumero}>
            Copiar número
          </Button>
        </div>

        <div className="bg-slate-900 p-6 rounded-2xl shadow-inner min-h-[120px] relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
             <Button variant="secondary" size="sm" className="!bg-white/10 !border-white/10 !text-white hover:!bg-white/20" onClick={copiarMensagem}>
               Copiar
             </Button>
          </div>
          <pre className="text-emerald-400 font-mono text-sm whitespace-pre-wrap m-0 leading-relaxed">
            {envio.mensagem || '(sem mensagem)'}
          </pre>
        </div>

        <div className="flex flex-col gap-3">
          <Button
            variant="primary"
            onClick={() => {
              if (isLote) abrirWhatsAppEAvancarLote(envio);
              else abrirWhatsApp(envio);
            }}
          >
            Abrir WhatsApp{isLote ? ' e avançar' : ''}
          </Button>
          <Button variant="secondary" onClick={copiarMensagem}>
            Copiar mensagem
          </Button>
        </div>
      </div>
    </Modal>
  );
}
