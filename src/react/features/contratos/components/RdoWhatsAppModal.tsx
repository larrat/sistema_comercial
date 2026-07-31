import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Modal, Button } from '../../../shared/ui';
import { MessageCircle, Copy, Check, Send, Phone } from 'lucide-react';
import { formatWhatsAppPhone } from '../utils/rdoWhatsAppHelper';
import { toast } from 'sonner';

type Props = {
  open: boolean;
  onClose: () => void;
  clienteNome?: string;
  clienteTelefone?: string;
  defaultMessage: string;
};

export function RdoWhatsAppModal({
  open,
  onClose,
  clienteNome,
  clienteTelefone = '',
  defaultMessage
}: Props) {
  const [message, setMessage] = useState(defaultMessage);
  const [phone, setPhone] = useState(clienteTelefone);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMessage(defaultMessage);
  }, [defaultMessage]);

  useEffect(() => {
    setPhone(clienteTelefone);
  }, [clienteTelefone]);

  if (!open) return null;

  const formattedPhone = formatWhatsAppPhone(phone);

  function handleCopy() {
    navigator.clipboard.writeText(message);
    setCopied(true);
    toast.success('Mensagem copiada para a área de transferência!');
    setTimeout(() => setCopied(false), 2000);
  }

  function handleSend() {
    if (!formattedPhone) {
      toast.error('Informe o número de telefone/WhatsApp do cliente.');
      return;
    }
    const encoded = encodeURIComponent(message);
    const url = `https://wa.me/${formattedPhone}?text=${encoded}`;
    window.open(url, '_blank');
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Enviar Boletim de Obra no WhatsApp"
      subtitle={`Notificação executiva para ${clienteNome || 'o cliente'}`}
    >
      <div className="space-y-5 py-2">
        {/* Telefone Target Input */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
            <Phone size={13} className="text-teal-400" />
            WhatsApp do Cliente
          </label>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Ex: 91988888888"
            className="rf-input-premium w-full text-sm font-mono"
          />
          <span className="text-[11px] text-slate-500 mt-1 block">
            Número limpo: {formattedPhone ? `+${formattedPhone}` : 'Pendente'}
          </span>
        </div>

        {/* WhatsApp Preview Bubble */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
            <MessageCircle size={13} className="text-emerald-400" />
            Pré-visualização da Mensagem (Editável)
          </label>

          <div className="bg-[#0b141a] border border-[#222d34] rounded-2xl p-4 shadow-inner relative overflow-hidden">
            <div className="bg-[#005c4b] text-white p-3.5 rounded-2xl rounded-tr-none text-xs sm:text-sm font-sans leading-relaxed whitespace-pre-line shadow-md border border-[#007a63]">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={9}
                className="w-full bg-transparent text-white focus:outline-none resize-none selection:bg-teal-300 selection:text-black font-sans leading-relaxed"
              />
            </div>
            <span className="text-[10px] text-slate-400 text-right block mt-1">
              ✓✓ Pré-visualização formatada
            </span>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/10">
          <Button variant="secondary" size="sm" onClick={handleCopy} className="gap-1.5">
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSend}
              disabled={!formattedPhone}
              className="gap-2 !bg-emerald-500 hover:!bg-emerald-400 !text-black font-bold"
            >
              <Send size={14} />
              <span>Enviar no WhatsApp</span>
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
