import { useState, useEffect, useRef } from 'react';
import { useDashboardStore } from '../store/useDashboardStore';
import DashboardWorker from '../workers/dashboard.worker?worker';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  orcamento: { label: 'Orçamento', color: 'var(--text-muted)' },
  em_andamento: { label: 'Em andamento', color: 'var(--color-indigo-vibrant)' },
  em_separacao: { label: 'Em separação', color: 'var(--color-amber-vibrant)' },
  entregue_aguardando_pagamento: { label: 'Aguardando Pagamento', color: 'var(--color-teal-primary)' },
  pago_aguardando_entrega: { label: 'Aguardando Entrega', color: 'var(--color-indigo-vibrant)' },
  concluido: { label: 'Concluído', color: 'var(--color-emerald-vibrant)' },
  cancelado: { label: 'Cancelado', color: 'var(--color-rose-vibrant)' }
};

export function useDashboardMetrics() {
  const { 
    periodo,
    pedidos, 
    produtos, 
    clientes, 
    contasReceber 
  } = useDashboardStore();

  const [workerData, setWorkerData] = useState<{
    stats: any;
    chartData: any;
    periodoDatas: string;
    topProducts: any;
    statusDistribution: any;
    healthMetrics: any;
    rcaRanking: any;
    funnelData: any;
    agingData: any;
    financeMetrics: any;
    cashFlowData: any;
    rfmData: any;
  } | null>(null);

  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    workerRef.current = new DashboardWorker();
    workerRef.current.onmessage = (e) => setWorkerData(e.data);
    return () => workerRef.current?.terminate();
  }, []);

  useEffect(() => {
    if (!workerRef.current) return;
    workerRef.current.postMessage({
      pedidos,
      produtos,
      clientes,
      contasReceber,
      periodo,
      statusKeys: Object.keys(STATUS_CONFIG)
    });
  }, [pedidos, produtos, clientes, contasReceber, periodo]);

  return { workerData };
}
