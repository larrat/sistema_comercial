import { useState } from 'react';
import { X, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Card } from '../../../shared/ui';
import type { CaixaTransacao } from '../services/caixaApi';
import { useUIStore } from '../../../app/useUIStore';

type Props = {
  categories: { id: string, nome: string, tipo: string }[];
  onSave: (transacao: CaixaTransacao) => void;
  onClose: () => void;
  filialId: string;
};

export function CaixaTransacaoForm({ categories, onSave, onClose, filialId }: Props) {
  const { sidebarCollapsed: collapsed } = useUIStore();
  const [tipo, setTipo] = useState<'entrada' | 'saida'>('saida');
  const [valor, setValor] = useState(0);
  const [categoriaId, setCategoriaId] = useState('');
  const [descricao, setDescricao] = useState('');

  const filteredCategories = categories.filter(c => c.tipo === tipo);

  const handleSave = () => {
    if (valor <= 0) return toast.error('Informe um valor válido');
    if (!categoriaId) return toast.error('Selecione uma categoria');
    if (!descricao) return toast.error('Informe uma descrição');

    onSave({
      filial_id: filialId,
      tipo,
      valor,
      categoria_id: categoriaId,
      descricao
    });
  };

  return (
    <div 
      className="fixed bottom-0 right-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 transition-all duration-300"
      style={{ left: collapsed ? '80px' : '280px', top: '80px' }}
    >
      <Card className="w-full max-w-md overflow-hidden flex flex-col bg-surface-card border-white/10 shadow-2xl">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-lg font-black text-white uppercase tracking-tight">Novo Lançamento</h2>
          <button onClick={onClose} aria-label="Fechar lançamento" className="text-slate-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex bg-black/20 p-1 rounded-xl border border-white/5">
            {(['saida', 'entrada'] as const).map(t => (
              <button
                key={t}
                onClick={() => { setTipo(t); setCategoriaId(''); }}
                className={`flex-1 py-2 rounded-lg transition-all text-sm font-medium text-slate-400${tipo === t ? (t === 'entrada' ? 'bg-emerald-500' : 'bg-rose-500') + ' text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
              >
                {t === 'entrada' ? 'Entrada' : 'Saída'}
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-400">Valor</label>
            <input 
              name="valor_transacao"
              type="number" 
              step="0.01"
              value={valor}
              onChange={(e) => setValor(Number(e.target.value))}
              className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-2xl font-black text-white focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-400">Categoria</label>
            <select 
              name="categoria_transacao"
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 transition-all appearance-none"
            >
              <option value="">Selecione...</option>
              {filteredCategories.map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-400">Descrição</label>
            <textarea 
              name="descricao_transacao"
              spellCheck={false}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Pagamento Internet Abril"
              className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 transition-all h-24 resize-none"
            />
          </div>
        </div>

        <div className="p-6 border-t border-white/5 bg-black/20 flex items-center gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" className="flex-1" leftIcon={<Save size={18} />} onClick={handleSave}>Gravar</Button>
        </div>
      </Card>
    </div>
  );
}
