import { useSearchParams } from 'react-router-dom';
import { COTACAO_TABS, type CotacaoTabId } from '../types';

const TABS: Array<{ id: CotacaoTabId; label: string }> = [
  { id: 'cotacao', label: 'Cotação' },
  { id: 'fornecedores', label: 'Fornecedores' },
  { id: 'importar', label: 'Importar' }
];

type Props = {
  activeTab: CotacaoTabId;
};

export function CotacaoTabs({ activeTab }: Props) {
  const [searchParams, setSearchParams] = useSearchParams();

  function goToTab(tab: CotacaoTabId) {
    if (!COTACAO_TABS.includes(tab)) return;
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    setSearchParams(next);
  }

  return (
    <div className="flex items-center gap-2 border-b border-white/10 pb-4 mb-4 overflow-x-auto hide-scrollbar">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`shrink-0 rounded-lg px-4 py-2 text-sm font-bold transition-all ${ activeTab === tab.id ? 'bg-indigo-500 text-white shadow-md' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white' }`}
          onClick={() => goToTab(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
