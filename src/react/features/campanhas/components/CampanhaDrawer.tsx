import { useState, useEffect } from 'react';
import { Drawer, FormField } from '../../../shared/ui';
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

export function CampanhaDrawer() {
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
    <Drawer
      open={campModal.open}
      title={item ? 'Editar campanha' : 'Nova campanha'}
      size="md"
      closeOnOverlayClick={!saving}
      onClose={closeCampModal}
      footer={
        <>
          <button className="btn btn-sm" type="button" onClick={closeCampModal} disabled={saving}>
            Cancelar
          </button>
          <button
            className="btn btn-p btn-sm"
            type="button"
            onClick={() => void handleSalvar()}
            disabled={saving || !nome.trim()}
          >
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </>
      }
    >
      <div className="fg">
        <FormField label="Nome" required htmlFor="camp-nome">
          <input
            id="camp-nome"
            className="inp"
            autoFocus
            placeholder="Ex: Aniversariantes do mês"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            disabled={saving}
          />
        </FormField>

        <div className="rf-ui-form-row">
          <FormField label="Tipo" htmlFor="camp-tipo">
            <select
              id="camp-tipo"
              className="inp sel"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              disabled={saving}
            >
              {TIPOS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Canal" htmlFor="camp-canal">
            <select
              id="camp-canal"
              className="inp sel"
              value={canal}
              onChange={(e) => setCanal(e.target.value)}
              disabled={saving}
            >
              {CANAIS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Antecedência (dias)" htmlFor="camp-dias">
            <input
              id="camp-dias"
              className="inp"
              type="number"
              min={0}
              max={60}
              value={diasAntecedencia}
              onChange={(e) => setDiasAntecedencia(Number(e.target.value))}
              disabled={saving}
            />
          </FormField>
        </div>

        <div className="rf-ui-form-row">
          <FormField label="Cupom (opcional)" htmlFor="camp-cupom">
            <input
              id="camp-cupom"
              className="inp"
              value={cupom}
              onChange={(e) => setCupom(e.target.value)}
              placeholder="PROMO10"
              disabled={saving}
            />
          </FormField>

          <FormField label="Desconto %" htmlFor="camp-desconto">
            <input
              id="camp-desconto"
              className="inp"
              type="number"
              min={0}
              max={100}
              value={desconto}
              onChange={(e) => setDesconto(Number(e.target.value))}
              disabled={saving}
            />
          </FormField>
        </div>

        <FormField
          label={<>Mensagem <span className="rf-ui-form-field__hint">tokens: {'{{nome}}'} {'{{cupom}}'} {'{{desconto}}'} {'{{filial}}'}</span></>}
          htmlFor="camp-mensagem"
        >
          <textarea
            id="camp-mensagem"
            className="inp"
            rows={5}
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            placeholder="Olá {{nome}}, temos uma oferta especial para você!"
            disabled={saving}
          />
        </FormField>

        {preview && (
          <div className="camp-preview-box">
            <div className="camp-preview-label">Preview</div>
            <div className="camp-preview-body">{preview}</div>
          </div>
        )}
      </div>
    </Drawer>
  );
}
