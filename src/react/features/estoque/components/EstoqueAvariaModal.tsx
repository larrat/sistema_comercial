import { useEffect, useState } from 'react';
import { Modal, Button, Input, Select } from '../../../shared/ui';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { useAuthStore } from '../../../app/useAuthStore';
import { useFilialStore } from '../../../app/useFilialStore';
import { useEstoqueStore } from '../store/useEstoqueStore';
import { insertAvaria } from '../services/estoqueApi';
import { calculateEstoqueSaldos } from '../hooks/useEstoqueCalculations';
import { toast } from 'sonner';

type AvariaMotivo = 'quebra' | 'defeito_fabrica' | 'vencido' | 'furto' | 'outro';
type AvariaDestino = 'descarte' | 'devolucao_fornecedor' | 'doacao';

export function EstoqueAvariaModal() {
  const open = useEstoqueStore((s) => s.avariaModalOpen);
  const close = useEstoqueStore((s) => s.closeAvariaModal);
  const snapshot = useEstoqueStore((s) => s.snapshot);
  const requestReload = useEstoqueStore((s) => s.requestReload);
  const session = useAuthStore((s) => s.session);
  const filialId = useFilialStore((s) => s.filialId);

  const [produtoId, setProdutoId] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [motivo, setMotivo] = useState<AvariaMotivo>('quebra');
  const [destino, setDestino] = useState<AvariaDestino>('descarte');
  const [observacoes, setObservacoes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const produtos = snapshot?.produtos || [];
  const movimentacoes = snapshot?.movimentacoes || [];
  const saldos = calculateEstoqueSaldos(produtos, movimentacoes);
  
  const produtoSelecionado = produtos.find((p) => p.id === produtoId) || null;
  const saldoInfo = produtoId ? saldos[produtoId] || { saldo: 0, cm: 0 } : { saldo: 0, cm: 0 };
  const custoUnitario = saldoInfo.cm || produtoSelecionado?.custo || 0;

  useEffect(() => {
    if (open) {
      setProdutoId('');
      setQuantidade('');
      setMotivo('quebra');
      setDestino('descarte');
      setObservacoes('');
      setSubmitting(false);
    }
  }, [open]);

  async function handleSave() {
    if (!produtoId) {
      toast.warning('Selecione um produto.');
      return;
    }
    const qty = parseFloat(quantidade.replace(',', '.'));
    if (isNaN(qty) || qty <= 0) {
      toast.warning('A quantidade deve ser maior que zero.');
      return;
    }
    if (qty > saldoInfo.saldo) {
      toast.warning(`Saldo de estoque insuficiente (${saldoInfo.saldo} un disponíveis).`);
      return;
    }

    const config = getSupabaseConfig();
    const token = session?.access_token || '';

    if (!config.ready || !token || !filialId) {
      toast.error('Erro de credenciais para salvar avaria.');
      return;
    }

    setSubmitting(true);
    try {
      await insertAvaria(
        {
          url: config.url,
          key: config.key,
          token,
          filialId
        },
        {
          filial_id: filialId,
          produto_id: produtoId,
          quantidade: qty,
          custo_unitario: custoUnitario,
          motivo,
          destino,
          observacoes: observacoes.trim(),
          criado_por: (session?.user?.email as string) || null
        }
      );
      toast.success('Avaria registrada e estoque baixado com sucesso!');
      requestReload();
      close();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao registrar avaria.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      title="Registrar avaria de produto"
      onClose={close}
      footer={
        <>
          <Button onClick={close} disabled={submitting}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSave} loading={submitting}>
            Confirmar e Baixar Estoque
          </Button>
        </>
      }
    >
      <div className="rf-ui-stack">
        <Select
          label="Produto Avariado"
          id="avaria-prod"
          value={produtoId}
          onChange={(e) => setProdutoId(e.target.value)}
          options={[
            { value: '', label: 'Selecione o produto...' },
            ...produtos.map((item) => ({ value: item.id, label: item.nome }))
          ]}
        />

        {produtoSelecionado && (
          <div className="card-shell rf-ui-stock-summary">
            <div className="rf-ui-stock-summary__head">
              <div>
                <p className="table-cell-strong">{produtoSelecionado.nome}</p>
                <p className="table-cell-caption table-cell-muted">
                  Custo unitário estimado: {Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(custoUnitario)}
                </p>
              </div>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-teal-500/10 text-teal-400">
                Saldo: {saldoInfo.saldo} {produtoSelecionado.un || 'un'}
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Quantidade Perda"
            id="avaria-qty"
            placeholder="0"
            inputMode="decimal"
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
          />

          <Select
            label="Motivo da Avaria"
            id="avaria-motivo"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value as AvariaMotivo)}
            options={[
              { value: 'quebra', label: 'Quebra/Avaria física' },
              { value: 'defeito_fabrica', label: 'Defeito de fábrica' },
              { value: 'vencido', label: 'Vencido/Validade' },
              { value: 'furto', label: 'Furto/Roubo' },
              { value: 'outro', label: 'Outro' }
            ]}
          />
        </div>

        <Select
          label="Destino da Peça"
          id="avaria-destino"
          value={destino}
          onChange={(e) => setDestino(e.target.value as AvariaDestino)}
          options={[
            { value: 'descarte', label: 'Descarte total (Lixo/Sucata)' },
            { value: 'devolucao_fornecedor', label: 'Devolver ao Fornecedor' },
            { value: 'doacao', label: 'Doação' }
          ]}
        />

        <div className="flex flex-col gap-2">
          <label htmlFor="avaria-obs" className="text-xs font-bold text-slate-700">Observações adicionais</label>
          <textarea
            id="avaria-obs"
            className="rf-input-premium min-h-[80px] resize-none"
            rows={3}
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            placeholder="Descreva detalhes adicionais, ex: acordo cortesia com cliente."
          />
        </div>
      </div>
    </Modal>
  );
}
