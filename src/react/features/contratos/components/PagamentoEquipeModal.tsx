import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LucideX, LucideSave, DollarSign, Wallet, FileText, CheckCircle2, History } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { contratosApi } from '../services/contratosApi';
import { useApiContext } from '../../../shared/hooks/useApiContext';
import { fmtBRL } from '../../../shared/lib/formatters';

type Props = {
  osId: string;
  osTitulo: string;
  valorParceiro: number;
  onClose: () => void;
};

export function PagamentoEquipeModal({ osId, osTitulo, valorParceiro, onClose }: Props) {
  const { resolve } = useApiContext();
  const queryClient = useQueryClient();

  const [tipo, setTipo] = useState<'adiantamento' | 'vale' | 'quitacao' | 'premio'>('adiantamento');
  const [valor, setValor] = useState(0);
  const [obs, setObs] = useState('');

  const { data: pagamentos = [], isLoading } = useQuery({
    queryKey: ['pagamentos-equipe', osId],
    queryFn: () => {
      const context = resolve();
      if (!context) throw new Error('Contexto não inicializado');
      return contratosApi.getPagamentosEquipe(context, osId);
    },
    enabled: !!osId
  });

  const criarPagamento = useMutation({
    mutationFn: async () => {
      if (valor <= 0) throw new Error('Valor deve ser maior que zero');
      const context = resolve();
      if (!context) throw new Error('Contexto não inicializado');
      
      await contratosApi.createPagamentoEquipe(context, {
        os_id: osId,
        valor,
        tipo,
        data_pagamento: new Date().toISOString(),
        obs
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pagamentos-equipe', osId] });
      setValor(0);
      setObs('');
      toast.success('Pagamento lançado com sucesso!');
    },
    onError: (err: any) => {
      toast.error(err.message);
    }
  });

  const totalPago = pagamentos.reduce((acc, p) => acc + Number(p.valor), 0);
  const saldoDevedor = valorParceiro - totalPago;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-white/10 shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in fade-in zoom-in duration-200">
        
        {/* Painel Esquerdo: Resumo Financeiro da OS */}
        <div className="md:w-1/2 p-6 bg-slate-950 border-r border-white/5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4 text-sm font-medium text-slate-400">
              <Wallet size={16} /> Acerto Financeiro
            </div>
            <h2 className="text-xl font-black text-white leading-tight mb-2">{osTitulo}</h2>
            <p className="text-xs text-slate-400 mb-8">Controle de adiantamentos, vales e quitação final do parceiro terceirizado.</p>

            <div className="space-y-4">
              <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
                <p className="mb-1 text-sm font-medium text-slate-400">Repasse Acordado</p>
                <p className="text-xl font-black text-white">{fmtBRL(valorParceiro)}</p>
              </div>

              <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4">
                <p className="mb-1 text-sm font-medium text-slate-400">Total Já Pago</p>
                <p className="text-xl font-black text-emerald-400">{fmtBRL(totalPago)}</p>
              </div>

              <div className="bg-rose-500/5 border border-rose-500/10 rounded-xl p-4">
                <p className="mb-1 text-sm font-medium text-slate-400">Saldo Devedor / A Pagar</p>
                <p className="text-xl font-black text-rose-400">{fmtBRL(Math.max(0, saldoDevedor))}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Painel Direito: Novo Lançamento e Histórico */}
        <div className="md:w-1/2 p-6 bg-slate-900/40 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="flex items-center gap-2 text-sm font-medium text-slate-400">
              <DollarSign size={14} /> Novo Pagamento
            </h3>
            <button onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-white/5 hover:text-white transition-colors">
              <LucideX size={16} />
            </button>
          </div>

          <form 
            onSubmit={e => { e.preventDefault(); criarPagamento.mutate(); }}
            className="space-y-4 mb-8"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-400">Tipo</label>
                <select 
                  value={tipo}
                  onChange={e => setTipo(e.target.value as any)}
                  className="w-full bg-black/30 border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500 focus-visible:ring-1 focus-visible:ring-teal-500/50"
                >
                  <option value="adiantamento">Adiantamento</option>
                  <option value="vale">Vale Transporte/Refeição</option>
                  <option value="quitacao">Quitação / Medição</option>
                  <option value="premio">Prêmio Extra</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-400">Valor (R$)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={valor || ''}
                  onChange={e => setValor(Number(e.target.value))}
                  className="w-full bg-black/30 border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500 placeholder-slate-600 focus-visible:ring-1 focus-visible:ring-teal-500/50"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-400">Observações (Opcional)</label>
              <input 
                type="text" 
                value={obs}
                onChange={e => setObs(e.target.value)}
                className="w-full bg-black/30 border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500 placeholder-slate-600 focus-visible:ring-1 focus-visible:ring-teal-500/50"
                placeholder="Ex: Pix na conta da esposa"
              />
            </div>

            <button 
              type="submit"
              disabled={criarPagamento.isPending || valor <= 0}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 px-4 py-2.5 text-white shadow-lg hover:shadow-teal-500/20 active:scale-[0.98] disabled:opacity-50 transition-all text-sm font-medium text-slate-400"
            >
              <LucideSave size={14} /> Confirmar Lançamento
            </button>
          </form>

          {/* Histórico */}
          <div className="flex-1 overflow-y-auto pr-2">
            <h3 className="flex items-center gap-2 mb-3 text-sm font-medium text-slate-400">
              <History size={12} /> Histórico desta O.S.
            </h3>
            
            {isLoading ? (
              <div className="text-center py-4 text-xs text-slate-500">Carregando...</div>
            ) : pagamentos.length === 0 ? (
              <div className="text-center py-4 border border-dashed border-white/5 rounded-xl bg-white/[0.01] text-sm font-medium text-slate-400">
                Nenhum pagamento lançado
              </div>
            ) : (
              <div className="space-y-2">
                {pagamentos.map(p => (
                  <div key={p.id} className="flex justify-between items-center p-2.5 rounded-lg border border-white/5 bg-black/20 text-xs">
                    <div>
                      <div className="font-bold text-slate-200 capitalize">{p.tipo.replace('_', ' ')}</div>
                      <div className="text-[9px] text-slate-500 mt-0.5">{format(new Date(p.criado_em), 'dd/MM/yyyy HH:mm')}</div>
                    </div>
                    <span className="font-black text-teal-400">{fmtBRL(p.valor)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
