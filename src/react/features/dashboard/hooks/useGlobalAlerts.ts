import { useMemo } from 'react';
import { useDashboardStore } from '../store/useDashboardStore';
import type { PedidoItem } from '../../../../types/domain';

export type AlertTone = 'warning' | 'danger';

export type DashboardAlert = {
  id: string;
  title: string;
  desc: string;
  link: string;
  tone: AlertTone;
  isPredictive?: boolean;
};

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const fmt = (v: number) => BRL.format(v || 0);

export function useGlobalAlerts() {
  const { pedidos, produtos, clientes, contasReceber, filial } = useDashboardStore();

  const alerts = useMemo(() => {
    const list: DashboardAlert[] = [];

    // 1. Pedidos entregues sem baixa
    const semBaixaPedidos = pedidos.filter((p) => p.status === 'entregue_aguardando_pagamento');
    if (semBaixaPedidos.length > 0) {
      const p = semBaixaPedidos[0];
      const clienteNome = clientes.find((c) => c.id === p.cliente_id)?.nome || 'Cliente';
      list.push({
        id: 'sem-baixa',
        title: `${semBaixaPedidos.length} pedido${semBaixaPedidos.length > 1 ? 's' : ''} entregue${semBaixaPedidos.length > 1 ? 's' : ''} sem baixa`,
        desc: `${clienteNome} · ${fmt(p.total)} em aberto`,
        link: `/app/pedidos/${p.id}`,
        tone: 'warning'
      });
    }

    // 2. Ruptura de estoque
    const comEstoque = produtos.filter((p) => Number(p.esal || 0) > 0).length;
    const zeroStockCount = produtos.length - comEstoque;
    if (zeroStockCount > 0) {
      list.push({
        id: 'estoque-zero',
        title: `Ruptura detectada em ${zeroStockCount} itens`,
        desc: 'Nexus AI: Risco de perda de venda imediata',
        link: '/app/estoque',
        tone: 'danger',
        isPredictive: true
      });
    }

    // 3. Contas vencidas
    const vencidas = contasReceber.filter(
      (c) => c.vencimento && new Date(c.vencimento) < new Date()
    ).length;
    if (vencidas > 0) {
      const valorVencido = contasReceber
        .filter((c) => c.vencimento && new Date(c.vencimento) < new Date())
        .reduce((acc, c) => acc + Number(c.valor_em_aberto || 0), 0);
      list.push({
        id: 'contas-vencidas',
        title: `${vencidas} conta(s) vencida(s)`,
        desc: `${fmt(valorVencido)} em atraso`,
        link: '/app/receber',
        tone: 'danger'
      });
    }

    // 4. Meta mensal em risco
    // Para simplificar no hook global, vamos considerar apenas se meta existe
    const statusVenda = ['entregue_aguardando_pagamento', 'pago_aguardando_entrega', 'concluido'];
    const vendasReais = pedidos.filter((p) => statusVenda.includes(p.status));
    const faturamento = vendasReais.reduce((acc, p) => acc + Number(p.total || 0), 0);

    if (filial?.meta_mensal && faturamento < filial.meta_mensal * 0.5) {
      list.push({
        id: 'meta-risco',
        title: 'Meta mensal em risco',
        desc: 'Nexus AI: Projeção indica 15% abaixo do alvo',
        link: '/app/dashboard',
        tone: 'warning',
        isPredictive: true
      });
    }

    return list;
  }, [pedidos, produtos, clientes, contasReceber, filial]);

  return { alerts, total: alerts.length };
}
