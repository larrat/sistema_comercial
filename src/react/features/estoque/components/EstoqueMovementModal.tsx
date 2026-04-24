import { useEffect, useState } from 'react';

import { Modal, StatusBadge } from '../../../shared/ui';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { useAuthStore } from '../../../app/useAuthStore';
import { useFilialStore } from '../../../app/useFilialStore';
import { useEstoqueStore } from '../store/useEstoqueStore';
import { useEstoqueMutations } from '../hooks/useEstoqueMutations';
import { calculateEstoqueSaldos } from '../hooks/useEstoqueCalculations';
import { listTransferFiliais } from '../services/estoqueApi';
import type { Filial } from '../../../../types/domain';

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

  return (
    <Modal
      open={open}
      title="Registrar movimentação"
      onClose={closeMovementModal}
      footer={
        <>
          <button type="button" className="btn btn-sm" onClick={closeMovementModal}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-p btn-sm"
            onClick={() => void saveMovement(atual.saldo, atual.cm)}
          >
            {draft.tipo === 'transf' ? 'Salvar transferência' : 'Salvar movimentação'}
          </button>
        </>
      }
    >
      <div className="rf-ui-stack">
        <div className="rf-ui-form-grid">
          <label className="rf-ui-field">
            <span className="rf-ui-field__label">Produto</span>
            <select
              className="inp sel"
              value={draft.produtoId}
              onChange={(event) => updateMovementDraft({ produtoId: event.target.value })}
            >
              <option value="">Selecione...</option>
              {produtos.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nome}
                </option>
              ))}
            </select>
          </label>

          <label className="rf-ui-field">
            <span className="rf-ui-field__label">Data</span>
            <input
              className="inp"
              type="date"
              value={draft.data}
              onChange={(event) => updateMovementDraft({ data: event.target.value })}
            />
          </label>
        </div>

        <div className="rf-ui-inline-tabs">
          {(['entrada', 'saida', 'ajuste', 'transf'] as const).map((tipo) => (
            <button
              key={tipo}
              type="button"
              className={`tb ${draft.tipo === tipo ? 'on' : ''}`}
              onClick={() => updateMovementDraft({ tipo })}
            >
              {tipo === 'entrada'
                ? 'Entrada'
                : tipo === 'saida'
                  ? 'Saída'
                  : tipo === 'ajuste'
                    ? 'Ajuste'
                    : 'Transferência'}
            </button>
          ))}
        </div>

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
            <label className="rf-ui-field">
              <span className="rf-ui-field__label">
                {draft.tipo === 'entrada'
                  ? 'Quantidade recebida'
                  : draft.tipo === 'transf'
                    ? 'Quantidade transferida'
                    : 'Quantidade saída'}
              </span>
              <input
                className="inp"
                inputMode="decimal"
                value={draft.quantidade}
                onChange={(event) => updateMovementDraft({ quantidade: event.target.value })}
                placeholder="0"
              />
            </label>
          ) : (
            <label className="rf-ui-field">
              <span className="rf-ui-field__label">Saldo real</span>
              <input
                className="inp"
                inputMode="decimal"
                value={draft.saldoReal}
                onChange={(event) => updateMovementDraft({ saldoReal: event.target.value })}
                placeholder="0"
              />
            </label>
          )}

          {draft.tipo === 'entrada' ? (
            <label className="rf-ui-field">
              <span className="rf-ui-field__label">Custo unitário</span>
              <input
                className="inp"
                inputMode="decimal"
                value={draft.custo}
                onChange={(event) => updateMovementDraft({ custo: event.target.value })}
                placeholder={atual.cm ? String(atual.cm) : '0'}
              />
            </label>
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
          <label className="rf-ui-field">
            <span className="rf-ui-field__label">Filial de destino</span>
            <select
              className="inp sel"
              value={draft.destinoFilialId}
              onChange={(event) => updateMovementDraft({ destinoFilialId: event.target.value })}
            >
              <option value="">Selecione...</option>
              {transferFiliais.map((filial) => (
                <option key={filial.id} value={filial.id}>
                  {filial.nome}
                </option>
              ))}
            </select>
            <div className="table-cell-caption table-cell-muted">
              {transferStatus === 'loading'
                ? 'Carregando filiais disponíveis...'
                : transferStatus === 'error'
                  ? 'Não foi possível carregar as filiais disponíveis para transferência.'
                  : transferFiliais.length
                    ? 'A saída será lançada na filial atual e a entrada será registrada na filial de destino.'
                    : 'Nenhuma outra filial disponível para transferência.'}
            </div>
          </label>
        ) : null}

        <label className="rf-ui-field">
          <span className="rf-ui-field__label">Observação</span>
          <textarea
            className="inp ta"
            rows={3}
            value={draft.observacao}
            onChange={(event) => updateMovementDraft({ observacao: event.target.value })}
            placeholder="Contexto da movimentação"
          />
        </label>

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
  );
}
