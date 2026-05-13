import { useEffect, useState } from 'react';

import { Modal, StatusBadge, Button, Input, Select, SegmentedControl } from '../../../shared/ui';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { useAuthStore } from '../../../app/useAuthStore';
import { useFilialStore } from '../../../app/useFilialStore';
import { useEstoqueStore } from '../store/useEstoqueStore';
import { useEstoqueMutations } from '../hooks/useEstoqueMutations';
import { calculateEstoqueSaldos } from '../hooks/useEstoqueCalculations';
import { listTransferFiliais } from '../services/estoqueApi';
import type { Filial } from '../../../../types/domain';
import { EstoqueAdjustConfirmModal } from './EstoqueAdjustConfirmModal';

function fmtCurrency(value: number) {
  return Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(Number(value || 0));
}

function fmtQuantity(value: number) {
  return Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(Number(value || 0));
}

function toNumber(value: string): number {
  const normalized = String(value || '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function EstoqueMovementModal() {
  const open = useEstoqueStore((s) => s.movementModalOpen);
  const draft = useEstoqueStore((s) => s.movementDraft);
  const snapshot = useEstoqueStore((s) => s.snapshot);
  const updateMovementDraft = useEstoqueStore((s) => s.updateMovementDraft);
  const closeMovementModal = useEstoqueStore((s) => s.closeMovementModal);
  const session = useAuthStore((s) => s.session);
  const filialId = useFilialStore((s) => s.filialId);
  const { saveMovement } = useEstoqueMutations();
  const [transferFiliais, setTransferFiliais] = useState<Filial[]>([]);
  const [transferStatus, setTransferStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>(
    'idle'
  );
  const [confirmAdjustOpen, setConfirmAdjustOpen] = useState(false);
  const [saldoWarningOpen, setSaldoWarningOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const produtos = snapshot?.produtos || [];
  const movimentacoes = snapshot?.movimentacoes || [];
  const saldos = calculateEstoqueSaldos(produtos, movimentacoes);
  const produto = produtos.find((item) => item.id === draft.produtoId) || null;
  const atual = draft.produtoId ? saldos[draft.produtoId] || { saldo: 0, cm: 0 } : { saldo: 0, cm: 0 };

  const quantidade = toNumber(draft.quantidade);
  const custoInformado = toNumber(draft.custo) || atual.cm || 0;
  const saldoReal = toNumber(draft.saldoReal);

  let previewSaldo = atual.saldo;
  let previewCusto = atual.cm;
  let previewValor = 0;

  if (draft.tipo === 'entrada' && quantidade > 0) {
    previewSaldo = atual.saldo + quantidade;
    previewCusto =
      previewSaldo > 0
        ? (atual.saldo * atual.cm + quantidade * custoInformado) / previewSaldo
        : custoInformado;
    previewValor = quantidade * custoInformado;
  } else if ((draft.tipo === 'saida' || draft.tipo === 'transf') && quantidade > 0) {
    previewSaldo = atual.saldo - quantidade;
  } else if (draft.tipo === 'ajuste' && draft.saldoReal !== '') {
    previewSaldo = saldoReal;
  }

  const canShowPreview =
    !!draft.produtoId &&
    ((draft.tipo === 'ajuste' && draft.saldoReal !== '') ||
      (draft.tipo !== 'ajuste' &&
        quantidade > 0 &&
        (draft.tipo !== 'transf' || !!draft.destinoFilialId)));

  useEffect(() => {
    if (!open || draft.tipo !== 'transf') return;
    const config = getSupabaseConfig();
    const token = session?.access_token || '';
    const userId = String(session?.user?.id || '').trim();
    const currentFilialId = String(filialId || '').trim();

    if (!config.ready || !token || !userId || !currentFilialId) {
      setTransferFiliais([]);
      setTransferStatus('error');
      return;
    }

    let cancelled = false;
    setTransferStatus('loading');

    void listTransferFiliais({
      url: config.url,
      key: config.key,
      token,
      filialId: currentFilialId,
      userId
    })
      .then((rows) => {
        if (cancelled) return;
        setTransferFiliais(rows.filter((filial) => filial.id !== currentFilialId));
        setTransferStatus('ready');
      })
      .catch(() => {
        if (cancelled) return;
        setTransferFiliais([]);
        setTransferStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [open, draft.tipo, session?.access_token, session?.user?.id, filialId]);

  const destinationFilial = transferFiliais.find((item) => item.id === draft.destinoFilialId) || null;

  useEffect(() => {
    if (!open) {
      setConfirmAdjustOpen(false);
      setSubmitting(false);
    }
  }, [open]);

  async function submitMovement() {
    if (submitting) return;
    setSubmitting(true);
    const success = await saveMovement(atual.saldo, atual.cm);
    setSubmitting(false);
    if (success) {
      setConfirmAdjustOpen(false);
    }
  }

  function handlePrimaryAction() {
    if (draft.tipo === 'ajuste') {
      setConfirmAdjustOpen(true);
      return;
    }

    const quantidade = toNumber(draft.quantidade);
    if ((draft.tipo === 'saida' || draft.tipo === 'transf') && quantidade > atual.saldo) {
      setSaldoWarningOpen(true);
      return;
    }

    void submitMovement();
  }

  return (
    <>
      <Modal
        open={open}
        title="Registrar movimentação"
        onClose={closeMovementModal}
        footer={
          <>
            <Button onClick={closeMovementModal} disabled={submitting}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handlePrimaryAction}
              loading={submitting}
            >
              {draft.tipo === 'transf'
                ? 'Salvar transferência'
                : draft.tipo === 'ajuste'
                  ? 'Revisar ajuste'
                  : 'Salvar movimentação'}
            </Button>
          </>
        }
      >
        <div className="rf-ui-stack">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Produto"
            id="movement-prod"
            value={draft.produtoId}
            onChange={(event) => updateMovementDraft({ produtoId: event.target.value })}
            options={[
              { value: '', label: 'Selecione...' },
              ...produtos.map((item) => ({ value: item.id, label: item.nome }))
            ]}
          />

          <Input
            label="Data"
            id="movement-data"
            type="date"
            value={draft.data}
            onChange={(event) => updateMovementDraft({ data: event.target.value })}
          />
        </div>

        <SegmentedControl
          options={[
            { id: 'entrada', label: 'Entrada' },
            { id: 'saida', label: 'Saída' },
            { id: 'ajuste', label: 'Ajuste' },
            { id: 'transf', label: 'Transferência' }
          ]}
          activeId={draft.tipo}
          onChange={(id) => updateMovementDraft({ tipo: id as any })}
        />

        {produto ? (
          <div className="card-shell rf-ui-stock-summary">
            <div className="rf-ui-stock-summary__head">
              <div>
                <div className="table-cell-strong">{produto.nome}</div>
                <div className="table-cell-caption table-cell-muted">
                  {produto.sku || 'Sem SKU'} {produto.un ? `- ${produto.un}` : ''}
                </div>
              </div>
              <StatusBadge tone="info">
                Atual: {fmtQuantity(atual.saldo)} {produto.un || ''}
              </StatusBadge>
            </div>
            <div className="rf-ui-stock-summary__meta">
              <span>Custo médio atual: {fmtCurrency(atual.cm)}</span>
              <span>
                Mínimo: {produto.emin ? `${fmtQuantity(produto.emin)} ${produto.un || ''}` : 'Não definido'}
              </span>
            </div>
          </div>
        ) : null}

        <div className="rf-ui-form-grid">
          {draft.tipo !== 'ajuste' ? (
            <Input
              label={draft.tipo === 'entrada' ? 'Quantidade recebida' : draft.tipo === 'transf' ? 'Quantidade transferida' : 'Quantidade saída'}
              id="movement-qty"
              inputMode="decimal"
              value={draft.quantidade}
              onChange={(event) => updateMovementDraft({ quantidade: event.target.value })}
              placeholder="0"
            />
          ) : (
            <Input
              label="Saldo real"
              id="movement-saldo-real"
              inputMode="decimal"
              value={draft.saldoReal}
              onChange={(event) => updateMovementDraft({ saldoReal: event.target.value })}
              placeholder="0"
            />
          )}

          {draft.tipo === 'entrada' ? (
            <Input
              label="Custo unitário"
              id="movement-custo"
              inputMode="decimal"
              value={draft.custo}
              onChange={(event) => updateMovementDraft({ custo: event.target.value })}
              placeholder={atual.cm ? String(atual.cm) : '0'}
            />
          ) : (
            <div className="rf-ui-field">
              <span className="rf-ui-field__label">
                {draft.tipo === 'transf' ? 'Custo transferido' : 'Custo médio atual'}
              </span>
              <div className="rf-ui-field__static">{fmtCurrency(atual.cm)}</div>
            </div>
          )}
        </div>

        {draft.tipo === 'transf' ? (
          <div className="flex flex-col gap-2">
            <Select
              label="Filial de destino"
              id="movement-dest"
              value={draft.destinoFilialId}
              onChange={(event) => updateMovementDraft({ destinoFilialId: event.target.value })}
              options={[
                { value: '', label: 'Selecione...' },
                ...transferFiliais.map((filial) => ({ value: filial.id, label: filial.nome }))
              ]}
            />
            <div className="text-[10px] text-slate-400 font-medium px-1">
              {transferStatus === 'loading'
                ? 'Carregando filiais disponíveis...'
                : transferStatus === 'error'
                  ? 'Não foi possível carregar as filiais disponíveis para transferência.'
                  : transferFiliais.length
                    ? 'A saída será lançada na filial atual e a entrada será registrada na filial de destino.'
                    : 'Nenhuma outra filial disponível para transferência.'}
            </div>
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          <label htmlFor="movement-obs" className="text-xs font-bold text-slate-700">Observação</label>
          <textarea
            id="movement-obs"
            className="rf-input-premium min-h-[80px] resize-none"
            rows={3}
            value={draft.observacao}
            onChange={(event) => updateMovementDraft({ observacao: event.target.value })}
            placeholder={
              draft.tipo === 'ajuste'
                ? 'Explique o motivo do ajuste manual'
                : draft.tipo === 'transf'
                  ? 'Contexto da transferência'
                  : 'Contexto da movimentação'
            }
          />
        </div>

        {canShowPreview ? (
          <div className="card-shell rf-ui-stock-preview">
            <div className="rf-ui-stock-preview__title">Prévia</div>
            <div className="rf-ui-stock-summary__meta">
              <span>
                Saldo após movimento: {fmtQuantity(previewSaldo)} {produto?.un || ''}
              </span>
              <span>
                {draft.tipo === 'ajuste'
                  ? `Diferença: ${fmtQuantity(previewSaldo - atual.saldo)} ${produto?.un || ''}`
                  : draft.tipo === 'transf'
                    ? `Custo transferido: ${fmtCurrency(atual.cm)}`
                  : `Custo médio: ${fmtCurrency(previewCusto)}`}
              </span>
              {draft.tipo === 'entrada' ? (
                <span>Valor da entrada: {fmtCurrency(previewValor)}</span>
              ) : null}
              {draft.tipo === 'transf' ? (
                <span>Destino: {destinationFilial?.nome || 'Selecione a filial de destino'}</span>
              ) : null}
            </div>
          </div>
        ) : null}
        </div>
      </Modal>

      <Modal
        open={saldoWarningOpen}
        title="Saldo insuficiente"
        onClose={() => setSaldoWarningOpen(false)}
        footer={
          <>
            <Button onClick={() => setSaldoWarningOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setSaldoWarningOpen(false);
                void submitMovement();
              }}
            >
              Registrar assim mesmo
            </Button>
          </>
        }
      >
        <p>
          O saldo atual é <strong>{fmtQuantity(atual.saldo)}</strong>. Confirma registrar{' '}
          {draft.tipo === 'transf' ? 'a transferência' : 'a saída'} mesmo assim?
        </p>
      </Modal>

      <EstoqueAdjustConfirmModal
        open={confirmAdjustOpen}
        produtoNome={produto?.nome || ''}
        saldoAtualLabel={`${fmtQuantity(atual.saldo)} ${produto?.un || ''}`.trim()}
        saldoNovoLabel={`${fmtQuantity(previewSaldo)} ${produto?.un || ''}`.trim()}
        diferencaLabel={`${fmtQuantity(previewSaldo - atual.saldo)} ${produto?.un || ''}`.trim()}
        submitting={submitting}
        onClose={() => {
          if (!submitting) setConfirmAdjustOpen(false);
        }}
        onConfirm={() => {
          void submitMovement();
        }}
      />
    </>
  );
}
