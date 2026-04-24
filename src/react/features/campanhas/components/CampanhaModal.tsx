import { useState, useEffect } from 'react';
import { useCampanhasStore } from '../store/useCampanhasStore';
import { useCampanhasMutations } from '../hooks/useCampanhasMutations';
import type { Campanha } from '../../../../types/domain';

const TIPOS = ['aniversario', 'reativacao', 'promocao', 'outro'];
const CANAIS = ['whatsapp', 'email', 'sms'];

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

  if (!campModal.open) return null;

  const preview = substituirTokens(mensagem, EXEMPLO);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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

  return (
    <div className="modal-overlay" onClick={closeCampModal}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-hdr">
          <span>{item ? 'Editar campanha' : 'Nova campanha'}</span>
          <button className="modal-close" onClick={closeCampModal}>✕</button>
        </div>
        <form onSubmit={(e) => { void handleSubmit(e); }}>
          <div className="form-body">
            <label className="field-group">
              <span className="field-label">Nome</span>
              <input
                className="field-input"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Aniversariantes do mês"
                required
              />
            </label>

            <div className="field-row">
              <label className="field-group">
                <span className="field-label">Tipo</span>
                <select className="field-input" value={tipo} onChange={(e) => setTipo(e.target.value)}>
                  {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
              <label className="field-group">
                <span className="field-label">Canal</span>
                <select className="field-input" value={canal} onChange={(e) => setCanal(e.target.value)}>
                  {CANAIS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <label className="field-group">
                <span className="field-label">Antecedência (dias)</span>
                <input
                  className="field-input"
                  type="number"
                  min={0}
                  max={60}
                  value={diasAntecedencia}
                  onChange={(e) => setDiasAntecedencia(Number(e.target.value))}
                />
              </label>
            </div>

            <div className="field-row">
              <label className="field-group">
                <span className="field-label">Cupom (opcional)</span>
                <input
                  className="field-input"
                  value={cupom}
                  onChange={(e) => setCupom(e.target.value)}
                  placeholder="PROMO10"
                />
              </label>
              <label className="field-group">
                <span className="field-label">Desconto %</span>
                <input
                  className="field-input"
                  type="number"
                  min={0}
                  max={100}
                  value={desconto}
                  onChange={(e) => setDesconto(Number(e.target.value))}
                />
              </label>
            </div>

            <label className="field-group">
              <span className="field-label">
                Mensagem — tokens: {'{{nome}}'}, {'{{cupom}}'}, {'{{desconto}}'}, {'{{filial}}'}
              </span>
              <textarea
                className="field-input"
                rows={5}
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                placeholder="Olá {{nome}}, temos uma oferta especial para você!"
              />
            </label>

            {mensagem && (
              <div className="camp-preview-box">
                <div className="camp-preview-label">Preview</div>
                <div className="camp-preview-body">{preview}</div>
              </div>
            )}
          </div>

          <div className="modal-ftr">
            <button type="button" className="btn btn-ghost" onClick={closeCampModal}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving || !nome.trim()}>
              {saving ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
