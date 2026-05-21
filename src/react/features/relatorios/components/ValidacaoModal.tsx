import { fmtBRL } from '../../../shared/lib/formatters';
import { useState } from 'react';
import { Modal, Button, Input, Select } from '../../../shared/ui';
import { useRelatoriosStore } from '../store/useRelatoriosStore';
import { useRelatoriosMutations } from '../hooks/useRelatoriosMutations';

function fmtDataHora(v: string | null | undefined): string {
  if (!v) return '-';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function fmt(v: number | null | undefined): string {
  return fmtBRL(Number(v ?? 0));
}

export function ValidacaoModal() {
  const open = useRelatoriosStore((s) => s.validacaoOpen);
  const item = useRelatoriosStore((s) => s.validacaoItem);
  const pedidos = useRelatoriosStore((s) => s.pedidos);
  const closeValidacao = useRelatoriosStore((s) => s.closeValidacao);
  const { salvarValidacao } = useRelatoriosMutations();

  const [pedidoId, setPedidoId] = useState('');
  const [obs, setObs] = useState('');

  const clientePedidos = item
    ? pedidos
        .filter((p) => !item.cliente || p.cli.toLowerCase().includes(item.cliente.toLowerCase().slice(0, 6)))
        .sort((a, b) => Number(b.num || 0) - Number(a.num || 0))
    : [];

  function handleSalvar() {
    if (!item) return;
    salvarValidacao(item.id, pedidoId, obs);
    setPedidoId('');
    setObs('');
  }

  function handleClose() {
    closeValidacao();
    setPedidoId('');
    setObs('');
  }

  return (
    <Modal
      open={open && !!item}
      title="Validar oportunidade"
      onClose={handleClose}
      footer={
        <>
          <Button onClick={handleClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSalvar}>
            Validar venda
          </Button>
        </>
      }
    >
      {item ? (
        <>
          <div className="flex flex-col gap-6">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Contexto da oportunidade</span>
              <div className="text-sm font-bold text-slate-900">{item.cliente} • {item.time}</div>
              <div className="text-xs text-slate-500 mt-1">
                {item.jogo_titulo || '-'} • {fmtDataHora(item.jogo_data_hora)}
              </div>
            </div>

            <Select
              label="Pedido vinculado (opcional)"
              id="valid-pedido"
              value={pedidoId}
              onChange={(e) => setPedidoId(e.target.value)}
              options={[
                { value: '', label: 'Sem vincular pedido' },
                ...clientePedidos.map((p) => ({
                  value: p.id,
                  label: `#${p.num} • ${p.status || '-'} • ${fmt(p.total)}`
                }))
              ]}
            />

            <div className="flex flex-col gap-2">
               <label htmlFor="valid-obs" className="text-xs font-bold text-slate-700">Observação</label>
               <textarea
                id="valid-obs"
                className="rf-input-premium min-h-[80px] resize-none"
                rows={3}
                placeholder="Ex: oportunidade convertida em venda após o jogo"
                value={obs}
                onChange={(e) => setObs(e.target.value)}
              />
            </div>
          </div>
        </>
      ) : null}
    </Modal>
  );
}
