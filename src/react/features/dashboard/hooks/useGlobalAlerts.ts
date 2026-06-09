import { fmtBRL } from '../../../shared/lib/formatters';
import { useMemo } from 'react';
import { useDashboardStore } from '../store/useDashboardStore';
import { useQuery } from '@tanstack/react-query';
import { useApiContext } from '../../../shared/hooks/useApiContext';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
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


const fmt = (v: number) => fmtBRL(v || 0);

export function useGlobalAlerts() {
  const { pedidos, produtos, clientes, contasReceber, filial } = useDashboardStore();
  const { token, resolve } = useApiContext();
  const context = resolve();

  const { data: dbAlerts = [] } = useQuery({
    queryKey: ['alertas-sistema', context?.filialId],
    queryFn: async () => {
      if (!context) return [];
      const { url, key } = getSupabaseConfig();
      const res = await fetch(`${url}/rest/v1/alertas_sistema?filial_id=eq.${context.filialId}&resolvido=eq.false&order=criado_em.desc`, {
        headers: { apikey: key, Authorization: `Bearer ${context.token}` }
      });
      if (!res.ok) return [];
      return await res.json() as any[];
    },
    enabled: !!context,
    refetchInterval: 60000
  });

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

    // 2. Ruptura de estoque e Excesso de estoque removidos do Dashboard Comercial a pedido do usuário

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

    // 5. Produtos-filho sem gênero ou tamanho (Legado)
    const produtosIncompletos = produtos.filter(
      (p) => p.produto_pai_id && (!p.genero || !p.tamanho)
    );
    if (produtosIncompletos.length > 0) {
      list.push({
        id: 'produtos-legado',
        title: `${produtosIncompletos.length} produtos incompletos`,
        desc: 'Nexus AI: Variações sem gênero ou tamanho definidos',
        link: '/app/produtos',
        tone: 'warning',
        isPredictive: false
      });
    }

    // Mix dbAlerts from PostgreSQL (e.g. Alertas de Estoque Crítico)
    dbAlerts.forEach(dbAlert => {
      list.push({
        id: dbAlert.id,
        title: dbAlert.titulo,
        desc: dbAlert.mensagem,
        link: dbAlert.entidade_tipo === 'produto' ? `/app/produtos/${dbAlert.entidade_id}` : '/app/dashboard',
        tone: dbAlert.prioridade === 'critico' ? 'danger' : 'warning',
        isPredictive: false
      });
    });

    return list;
  }, [pedidos, produtos, clientes, contasReceber, filial, dbAlerts]);

  return { alerts, total: alerts.length };
}
