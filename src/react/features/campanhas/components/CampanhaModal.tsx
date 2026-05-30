import { useState, useEffect } from 'react';
import { Modal, FormField, Button, Input, Select } from '../../../shared/ui';
import { useCampanhasStore } from '../store/useCampanhasStore';
import { useCampanhasMutations } from '../hooks/useCampanhasMutations';
import type { Campanha } from '../../../../types/domain';

const TIPOS: { value: string; label: string }[] = [
  { value: 'aniversario', label: 'Aniversário' },
  { value: 'reativacao', label: 'Reativação' },
  { value: 'promocao', label: 'Promoção' },
  { value: 'outro', label: 'Outro' }
];

const CANAIS: { value: string; label: string }[] = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'E-mail' },
  { value: 'sms', label: 'SMS' }
];

function substituirTokens(msg: string, exemplo: Record<string, string>): string {
  return msg.replace(/\{\{(\w+)\}\}/g, (_, key: string) => exemplo[key] ?? `{{${key}}}`);
}

const EXEMPLO: Record<string, string> = {
  nome: 'João Silva',
  cupom: 'DESC10',
  desconto: '10%',
  filial: 'Loja Centro'
};

export function CampanhaModal() {
  const campModal = useCampanhasStore((s) => s.campModal);
  const closeCampModal = useCampanhasStore((s) => s.closeCampModal);
  const saving = useCampanhasStore((s) => s.saving);
  const { salvar } = useCampanhasMutations();

  const item = campModal.open ? campModal.item : null;

  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState('aniversario');
  const [canal, setCanal] = useState('whatsapp');
  const [diasAntecedencia, setDiasAntecedencia] = useState(7);
  const [mensagem, setMensagem] = useState('');
  const [cupom, setCupom] = useState('');
  const [desconto, setDesconto] = useState(0);

  useEffect(() => {
    if (!campModal.open) return;
    setNome(item?.nome ?? '');
    setTipo(item?.tipo ?? 'aniversario');
    setCanal(item?.canal ?? 'whatsapp');
    setDiasAntecedencia(item?.dias_antecedencia ?? 7);
    setMensagem(item?.mensagem ?? '');
    setCupom(item?.cupom ?? '');
    setDesconto(item?.desconto ?? 0);
  }, [campModal.open]);

  async function handleSalvar() {
    if (!nome.trim()) return;
    const payload: Partial<Campanha> = {
      nome: nome.trim(),
      tipo,
      canal,
      dias_antecedencia: diasAntecedencia,
      mensagem,
      cupom: cupom.trim() || null,
      desconto,
      ativo: true
    };
    if (item?.id) payload.id = item.id;
    await salvar(payload);
  }

  const preview = mensagem ? substituirTokens(mensagem, EXEMPLO) : '';

  return (
    <Modal
      open={campModal.open}
      title={item ? 'Editar campanha' : 'Nova campanha'}
      size="md"
      closeOnOverlayClick={!saving}
      onClose={closeCampModal}
      footer={
        <>
          <Button onClick={closeCampModal} disabled={saving}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={() => void handleSalvar()}
            loading={saving}
            disabled={!nome.trim()}
          >
            Salvar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        <Input
          label="Nome"
          id="camp-nome"
          required
          autoFocus
          placeholder="Ex: Aniversariantes do mês"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          disabled={saving}
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Select
            label="Tipo"
            id="camp-tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            disabled={saving}
            options={TIPOS}
          />

          <Select
            label="Canal"
            id="camp-canal"
            value={canal}
            onChange={(e) => setCanal(e.target.value)}
            disabled={saving}
            options={CANAIS}
          />

          <Input
            label="Antecedência (dias)"
            id="camp-dias"
            type="number"
            min={0}
            max={60}
            value={diasAntecedencia}
            onChange={(e) => setDiasAntecedencia(Number(e.target.value))}
            disabled={saving}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Cupom (opcional)"
            id="camp-cupom"
            value={cupom}
            onChange={(e) => setCupom(e.target.value)}
            placeholder="PROMO10"
            disabled={saving}
          />

          <Input
            label="Desconto %"
            id="camp-desconto"
            type="number"
            min={0}
            max={100}
            value={desconto}
            onChange={(e) => setDesconto(Number(e.target.value))}
            disabled={saving}
          />
        </div>

        <FormField
          label={<>Mensagem <span className="text-[10px] text-slate-400 font-normal ml-2">tokens: {'{{nome}}'} {'{{cupom}}'} {'{{desconto}}'} {'{{filial}}'}</span></>}
          htmlFor="camp-mensagem"
        >
          <textarea
            id="camp-mensagem"
            className="rf-input-premium min-h-[120px] resize-none"
            rows={5}
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            placeholder="Olá {{nome}}, temos uma oferta especial para você!"
            disabled={saving}
          />
        </FormField>

        {preview && (
          <div className="p-6 bg-slate-900 rounded-2xl shadow-xl border border-slate-800">
            <div className="mb-4 text-sm font-medium text-slate-400">Preview da Mensagem</div>
            <div className="text-emerald-400 font-mono text-sm whitespace-pre-wrap leading-relaxed">{preview}</div>
          </div>
        )}
      </div>
    </Modal>
  );
}
