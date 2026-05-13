import { Modal, Button } from '../../../shared/ui';

type PdvComprovanteModalProps = {
  open: boolean;
  countdown: number;
  canWhatsapp: boolean;
  onPrint: () => void;
  onWhatsapp: () => void;
  onClose: () => void;
};

export function PdvComprovanteModal({
  open,
  countdown,
  canWhatsapp,
  onPrint,
  onWhatsapp,
  onClose
}: PdvComprovanteModalProps) {
  return (
    <Modal
      open={open}
      title="Comprovante"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>
            Pular ({countdown}s)
          </Button>
          <Button onClick={onPrint}>
            Imprimir
          </Button>
          <Button variant="primary" onClick={onWhatsapp} disabled={!canWhatsapp}>
            Enviar por WhatsApp
          </Button>
        </>
      }
    >
      <div className="rf-pdv-receipt-copy">
        Escolha o que fazer com o comprovante desta venda. Se nada for escolhido, seguimos em frente
        automaticamente.
      </div>
    </Modal>
  );
}
