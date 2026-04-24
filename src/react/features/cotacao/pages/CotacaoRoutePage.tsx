import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CotacaoPage } from '../components/CotacaoPage';
import { useCotacaoData } from '../hooks/useCotacaoData';
import { useCotacaoStore } from '../store/useCotacaoStore';
import {
  DEFAULT_COTACAO_TAB,
  isCotacaoTabId
} from '../types';

export function CotacaoRoutePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const setActiveTab = useCotacaoStore((s) => s.setActiveTab);

  useCotacaoData();

  const rawTab = searchParams.get('tab');
  const activeTab = isCotacaoTabId(rawTab) ? rawTab : DEFAULT_COTACAO_TAB;

  useEffect(() => {
    if (rawTab === activeTab) return;
    const next = new URLSearchParams(searchParams);
    next.set('tab', activeTab);
    setSearchParams(next, { replace: true });
  }, [activeTab, rawTab, searchParams, setSearchParams]);

  useEffect(() => {
    setActiveTab(activeTab);
  }, [activeTab, setActiveTab]);

  return <CotacaoPage activeTab={activeTab} />;
}
