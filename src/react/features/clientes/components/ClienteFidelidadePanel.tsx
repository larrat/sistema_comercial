import { useState } from 'react';

import type { Cliente } from '../../../../types/domain';
import type { ClienteFidelidadeForm } from '../types';
import { useClienteFidelidade } from '../hooks/useClienteFidelidade';

type Props = {
  cliente: Cliente;
};

const TIPO_LABEL: Record<string, string> = {
  credito: 'Crédito',
  debito: 'Débito',
  ajuste: 'Ajuste',
  estorno: 'Estorno'
};

const STATUS_LABEL: Record<string, string> = {
  pendente: 'Pendente',
  confirmado: 'Confirmado',
  cancelado: 'Cancelado'
};

const STATUS_BADGE: Record<string, string> = {
  pendente: 'ba',
  confirmado: 'bg',
  cancelado: 'br'
};

const EMPTY_FORM: ClienteFidelidadeForm = {
  tipo: 'credito',
  pontos: '',
  observacao: ''
};

export function ClienteFidelidadePanel({ cliente }: Props) {
  const [form, setForm] = useState<ClienteFidelidadeForm>(EMPTY_FORM);
  const { saldo, lancamentos, loading, saving, error, submitLancamento } = useClienteFidelidade({
    clienteId: cliente.id
  });

  async function handleSubmit() {
    await submitLancamento(form);
    setForm(EMPTY_FORM);
  }

  return (
    <div className="fid-panel" data-testid="cliente-detail-fidelidade">
      <div className="cli-detail-label form-gap-bottom-xs">Saldo de fidelidade</div>

      {loading ? (
        <div className="sk-card" data-testid="fid-loading">
          <div className="sk-line" />
          <div className="sk-line" />
        </div>
      ) : saldo ? (
        <div className="fid-saldo-grid" data-testid="fid-saldo-grid">
          <div className="met fid-met">
            <div className="ml">Saldo</div>
            <div className={`mv ${saldo.bloqueado ? 'tone-danger' : 'tone-success'}`}>
              {Number(saldo.saldo_pontos ?? 0)}
              <span className="mv-unit"> pts</span>
            </div>
            <div className={`ms ${saldo.bloqueado ? 'tone-danger' : 'tone-success'}`}>
              {saldo.bloqueado
                ? `Bloqueado${saldo.motivo_bloqueio ? ` - ${saldo.motivo_bloqueio}` : ''}`
                : 'Ativo'}
            </div>
          </div>
          <div className="met fid-met">
            <div className="ml">Acumulado</div>
            <div className="mv">
              {Number(saldo.total_acumulado ?? 0)}
              <span className="mv-unit"> pts</span>
            </div>
            <div className="ms">total creditado</div>
          </div>
          <div className="met fid-met">
            <div className="ml">Resgatado</div>
            <div className="mv">
              {Number(saldo.total_resgatado ?? 0)}
              <span className="mv-unit"> pts</span>
            </div>
            <div className="ms">total debitado</div>
          </div>
        </div>
      ) : (
        <div className="empty-inline" data-testid="fid-empty-balance">
          <p>Nenhum saldo de fidelidade registrado para este cliente.</p>
        </div>
      )}

      <div className="cli-detail-label form-gap-bottom-xs" style={{ marginTop: 16 }}>
        Adicionar lançamento manual
      </div>
      <div className="fid-form fg2 form-gap-bottom-xs">
        <select
          className="inp fid-tipo"
          value={form.tipo}
          onChange={(e) =>
            setForm((current) => ({
              ...current,
              tipo: e.target.value as ClienteFidelidadeForm['tipo']
            }))
          }
          data-testid="fid-tipo"
        >
          <option value="credito">Crédito</option>
          <option value="debito">Débito</option>
          <option value="ajuste">Ajuste</option>
          <option value="estorno">Estorno</option>
        </select>
        <input
          type="number"
          className="inp fid-pontos"
          placeholder="Pontos"
          step="1"
          value={form.pontos}
          onChange={(e) => setForm((current) => ({ ...current, pontos: e.target.value }))}
          data-testid="fid-pontos"
        />
        <input
          className="inp fid-obs input-flex"
          placeholder="Observação (opcional)"
          value={form.observacao}
          onChange={(e) => setForm((current) => ({ ...current, observacao: e.target.value }))}
          data-testid="fid-obs"
        />
        <button
          className="btn btn-p btn-sm"
          onClick={handleSubmit}
          disabled={saving}
          data-testid="fid-submit"
        >
          {saving ? 'Lançando...' : 'Lançar'}
        </button>
      </div>

      {error && (
        <div className="empty-inline" data-testid="fid-error">
          <p>{error}</p>
        </div>
      )}

      <div className="cli-detail-label form-gap-bottom-xs">Histórico (últimos 30)</div>
      {lancamentos.length ? (
        <div className="tw fid-hist-table" data-testid="fid-history">
          <table className="tbl">
            <thead>
              <tr>
                <th>Data</th>
                <th>Tipo</th>
                <th>Pontos</th>
                <th>Status</th>
                <th>Origem</th>
                <th>Obs</th>
              </tr>
            </thead>
            <tbody>
              {lancamentos.slice(0, 30).map((lancamento) => (
                <tr key={lancamento.id}>
                  <td className="table-cell-muted">
                    {lancamento.criado_em
                      ? new Date(lancamento.criado_em).toLocaleDateString('pt-BR')
                      : '-'}
                  </td>
                  <td>
                    <span className={`bdg ${Number(lancamento.pontos ?? 0) > 0 ? 'bg' : 'br'}`}>
                      {TIPO_LABEL[lancamento.tipo || ''] || lancamento.tipo || '-'}
                    </span>
                  </td>
                  <td
                    className={`table-cell-strong ${Number(lancamento.pontos ?? 0) > 0 ? 'tone-success' : 'tone-danger'}`}
                  >
                    {Number(lancamento.pontos ?? 0) > 0 ? '+' : ''}
                    {Number(lancamento.pontos ?? 0)}
                  </td>
                  <td>
                    <span className={`bdg ${STATUS_BADGE[lancamento.status || ''] || 'bk'}`}>
                      {STATUS_LABEL[lancamento.status || ''] || lancamento.status || '-'}
                    </span>
                  </td>
                  <td className="table-cell-muted">{lancamento.origem || '-'}</td>
                  <td className="table-cell-caption">{lancamento.observacao || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-inline" data-testid="fid-empty-history">
          <p>Nenhum lançamento registrado.</p>
        </div>
      )}
    </div>
  );
}
