import { useState } from 'react';
import type { ContaReceberBaixa } from '../../../../types/domain';
import { Button } from '../../../shared/ui';
import { fmt, formatDateTimeLabel } from './ContasReceberUtils';

export type BaixaHistoricoProps = {
  baixas: ContaReceberBaixa[];
  contaId: string;
  onEstornar: (contaId: string, baixaId: string) => void;
};

export function BaixaHistorico({ baixas, contaId, onEstornar }: BaixaHistoricoProps) {
  const [open, setOpen] = useState(false);

  if (!baixas.length) {
    return (
      <details className="cr-baixas-details bg-white/5 border border-white/5 rounded-lg overflow-hidden transition-all">
        <summary className="px-4 py-3 cursor-pointer select-none flex items-center justify-between hover:bg-white/5" onClick={() => setOpen(!open)}>
          <span className="text-sm font-bold text-slate-300">Ver histórico de baixas</span>
          <span className="text-sm font-medium text-slate-400">Expandir</span>
        </summary>
        <div className="px-4 py-4 border-t border-white/5">
          <div className="text-xs text-slate-500 italic">Sem baixas registradas para esta conta.</div>
        </div>
      </details>
    );
  }

  const resumo = `${baixas.length} baixa${baixas.length > 1 ? 's' : ''} registrada${baixas.length > 1 ? 's' : ''}`;

  return (
    <details className="cr-baixas-details" open={open}>
      <summary
        className="cr-baixas-summary"
        onClick={(e) => {
          e.preventDefault();
          setOpen(!open);
        }}
      >
        <span>{resumo}</span>
        <span className="table-cell-caption table-cell-muted">Expandir</span>
      </summary>
      <div className="cr-baixas-body">
        <div className="cr-baixas-list">
          {baixas.map((baixa, index) => (
            <div key={baixa.id} className="cr-baixas-item">
              <div className="cr-baixas-item__head">
                <span className="table-cell-strong">Baixa {index + 1}</span>
                <span className="tone-success table-cell-strong">{fmt(baixa.valor)}</span>
              </div>
              <div className="table-cell-caption table-cell-muted">
                {formatDateTimeLabel(baixa.recebido_em)}
              </div>
              {baixa.observacao ? <div className="table-cell-caption">{baixa.observacao}</div> : null}
              <div className="fg2">
                <Button size="sm" onClick={() => onEstornar(contaId, baixa.id)}>
                  Estornar
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </details>
  );
}
