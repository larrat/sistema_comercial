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
    <div className="tabs">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`tb ${activeTab === tab.id ? 'on' : ''}`}
          onClick={() => goToTab(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
