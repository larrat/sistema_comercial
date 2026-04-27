import { useState } from 'react';
import { Modal } from '../../../shared/ui';
import { useRelatoriosStore } from '../store/useRelatoriosStore';
import { useRelatoriosMutations } from '../hooks/useRelatoriosMutations';

function fmtDataHora(v: string | null | undefined): string {
  if (!v) return '-';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function fmt(v: number | null | undefined): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v ?? 0));
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
          <button className="btn btn-sm" type="button" onClick={handleClose}>
            Cancelar
          </button>
          <button className="btn btn-p btn-sm" type="button" onClick={handleSalvar}>
            Validar venda
          </button>
        </>
      }
    >
      {item ? (
        <>
          <div className="fg">
            <div>
              <div className="fl">Contexto da oportunidade</div>
              <div className="panel rel-val-context">
                <div className="rel-op-title">{item.cliente} • {item.time}</div>
                <div className="rel-op-sub">
                  {item.jogo_titulo || '-'} • {fmtDataHora(item.jogo_data_hora)}
                </div>
              </div>
            </div>
          </div>

          <div className="fg">
            <div>
              <div className="fl">Pedido vinculado (opcional)</div>
              <select
                className="inp sel"
                value={pedidoId}
                onChange={(e) => setPedidoId(e.target.value)}
              >
                <option value="">Sem vincular pedido</option>
                {clientePedidos.map((p) => (
                  <option key={p.id} value={p.id}>
                    #{p.num} • {p.status || '-'} • {fmt(p.total)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="fg">
            <div>
              <div className="fl">Observação</div>
              <textarea
                className="inp"
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
