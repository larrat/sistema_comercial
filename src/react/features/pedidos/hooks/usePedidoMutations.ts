import { useAuthStore } from '../../../app/useAuthStore';
import { useFilialStore } from '../../../app/useFilialStore';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { trackEvent, type AnalyticsMetadata } from '../../../shared/lib/analytics';
import { usePedidoStore } from '../store/usePedidoStore';
import {
  adicionarPedidoItem,
  atualizarPedidoItem,
  getNextPedidoNumber,
  marcarPedidoEntregue,
  removerPedidoItem,
  savePedido,
  updatePedidoStatus,
  type PedidoSaveInput
} from '../services/pedidosApi';
import {
  gerarContaSeNecessario,
  gerarContaForcado,
  type ContaReceberInput
} from '../services/contasReceberApi';
import { NEXT_STATUS, normalizePedStatus } from '../types';

type PedidoSubmitTracking = {
  metadata?: Record<string, AnalyticsMetadata>;
};

export function usePedidoMutations() {
  const upsertPedido = usePedidoStore((s) => s.upsertPedido);
  const setInFlight = usePedidoStore((s) => s.setInFlight);
  const inFlight = usePedidoStore((s) => s.inFlight);

  const session = useAuthStore((s) => s.session);
  const filialId = useFilialStore((s) => s.filialId);
  const userId =
    session?.user && typeof session.user === 'object' && 'id' in session.user
      ? String(session.user.id ?? '')
      : null;

  function resolveContext() {
    if (!session?.access_token) throw new Error('Sessão expirada. Faça login novamente.');
    if (!filialId) throw new Error('Nenhuma filial selecionada.');
    const { url, key, ready } = getSupabaseConfig();
    if (!ready) throw new Error('Configuração do Supabase ausente.');
    return { url, key, token: session.access_token, filialId };
  }

  async function avancarStatus(pedido: {
    id: string;
    status: string;
    num?: number;
    cli?: string;
    cliente_id?: string | null;
    total?: number;
    data?: string;
    prazo?: string;
    [key: string]: unknown;
  }) {
    const current = normalizePedStatus(pedido.status);
    const next = NEXT_STATUS[current];
    if (!next || inFlight.has(pedido.id)) return;

    const context = resolveContext();
    setInFlight(pedido.id, true);
    try {
      await updatePedidoStatus(context, pedido.id, next);
      upsertPedido({ ...pedido, status: next } as Parameters<typeof upsertPedido>[0]);

      if (next === 'entregue') {
        const contaInput: ContaReceberInput = {
          pedido_id: pedido.id,
          pedido_num: pedido.num ?? 0,
          cliente_id: pedido.cliente_id ?? null,
          cliente: pedido.cli ?? '',
          valor: pedido.total ?? 0,
          data: pedido.data as string | undefined,
          prazo: pedido.prazo as string | undefined
        };
        gerarContaSeNecessario(context, contaInput, next, current).catch(() => undefined);
      }
    } finally {
      setInFlight(pedido.id, false);
    }
  }

  async function confirmarEntrega(pedido: {
    id: string;
    status: string;
    num?: number;
    cli?: string;
    pgto?: string;
    total?: number;
    [key: string]: unknown;
  }) {
    const current = normalizePedStatus(pedido.status);
    if (
      ![
        'em_andamento',
        'orcamento',
        'confirmado',
        'em_separacao',
        'pago_aguardando_entrega'
      ].includes(current) ||
      inFlight.has(pedido.id)
    ) {
      return null;
    }

    const context = resolveContext();
    setInFlight(pedido.id, true);
    try {
      const updated = await marcarPedidoEntregue(context, pedido.id);
      upsertPedido(updated as Parameters<typeof upsertPedido>[0]);
      trackEvent({
        event_name: 'pedido_entrega_confirmada',
        module: 'pedidos',
        user_id: userId,
        tenant_id: filialId ?? null,
        metadata: {
          origin: 'pedido_delivery_modal',
          previous_status: current,
          next_status: normalizePedStatus(updated.status)
        },
        result: 'success'
      });
      return updated;
    } finally {
      setInFlight(pedido.id, false);
    }
  }

  async function cancelarPedido(pedido: { id: string; status: string; [key: string]: unknown }) {
    const current = normalizePedStatus(pedido.status);
    if (current === 'cancelado' || current === 'entregue' || inFlight.has(pedido.id)) return;

    const context = resolveContext();
    setInFlight(pedido.id, true);
    try {
      await updatePedidoStatus(context, pedido.id, 'cancelado');
      upsertPedido({ ...pedido, status: 'cancelado' } as Parameters<typeof upsertPedido>[0]);
      trackEvent({
        event_name: 'pedido_cancelado',
        module: 'pedidos',
        user_id: userId,
        tenant_id: filialId ?? null,
        metadata: {
          origin: 'list_or_detail',
          previous_status: current
        },
        result: 'success'
      });
    } finally {
      setInFlight(pedido.id, false);
    }
  }

  async function reabrirPedido(pedido: { id: string; status: string; [key: string]: unknown }) {
    const current = normalizePedStatus(pedido.status);
    if (current !== 'cancelado' || inFlight.has(pedido.id)) return;

    const context = resolveContext();
    setInFlight(pedido.id, true);
    try {
      await updatePedidoStatus(context, pedido.id, 'orcamento');
      upsertPedido({ ...pedido, status: 'orcamento' } as Parameters<typeof upsertPedido>[0]);
    } finally {
      setInFlight(pedido.id, false);
    }
  }

  async function submitPedido(
    input: Omit<PedidoSaveInput, 'filial_id'>,
    tracking?: PedidoSubmitTracking
  ): Promise<{ aviso: string | null; pedido: PedidoSaveInput }> {
    const context = resolveContext();

    const pedidos = usePedidoStore.getState().pedidos;
    const existing = pedidos.find((p) => p.id === input.id);
    const statusAnterior = existing ? normalizePedStatus(existing.status) : '';
    const shouldAllocateNumber = !existing && input.origem_venda !== 'pdv';
    const num = shouldAllocateNumber ? await getNextPedidoNumber(context) : input.num;

    const full: PedidoSaveInput = { ...input, num, filial_id: context.filialId };
    await savePedido(context, full);
    upsertPedido(full as Parameters<typeof upsertPedido>[0]);

    const contaInput: ContaReceberInput = {
      pedido_id: full.id,
      pedido_num: full.num,
      cliente_id: full.cliente_id,
      cliente: full.cli,
      valor: full.total,
      data: full.data,
      prazo: full.prazo
    };

    if (normalizePedStatus(full.status) === 'entregue') {
      try {
        await gerarContaSeNecessario(context, contaInput, full.status, statusAnterior);
      } catch {
        const warning =
          'Pedido salvo, mas houve falha ao gerar a conta a receber. Use "Gerar A Receber" no detalhe do pedido.';
        trackEvent({
          event_name: 'pedido_salvo',
          module: 'pedidos',
          user_id: userId,
          tenant_id: filialId ?? null,
          metadata: {
            mode: existing ? 'edit' : 'create',
            status: normalizePedStatus(full.status),
            item_count: Array.isArray(full.itens) ? full.itens.length : 0,
            ...tracking?.metadata
          },
          result: 'partial'
        });
        return { aviso: warning, pedido: full };
      }
    }

    trackEvent({
      event_name: 'pedido_salvo',
      module: 'pedidos',
      user_id: userId,
      tenant_id: filialId ?? null,
      metadata: {
        mode: existing ? 'edit' : 'create',
        status: normalizePedStatus(full.status),
        item_count: Array.isArray(full.itens) ? full.itens.length : 0,
        ...tracking?.metadata
      },
      result: 'success'
    });
    return { aviso: null, pedido: full };
  }

  /**
   * Gera conta a receber manualmente para pedido já entregue.
   * Diferente do automático, lança erro visível se prazo não tiver dias configurados.
   * Retorna mensagem de resultado para exibir ao usuário.
   */
  async function gerarContaManual(pedido: {
    id: string;
    num?: number;
    cliente_id?: string | null;
    cli?: string;
    total?: number;
    data?: string;
    prazo?: string;
    [key: string]: unknown;
  }): Promise<string> {
    const context = resolveContext();
    if (inFlight.has(pedido.id)) return 'Operação em andamento...';
    setInFlight(pedido.id, true);
    try {
      const contaInput: ContaReceberInput = {
        pedido_id: pedido.id,
        pedido_num: pedido.num ?? 0,
        cliente_id: pedido.cliente_id ?? null,
        cliente: pedido.cli ?? '',
        valor: pedido.total ?? 0,
        data: pedido.data as string | undefined,
        prazo: pedido.prazo as string | undefined
      };
      await gerarContaForcado(context, contaInput);
      return 'Conta a receber gerada com sucesso.';
    } catch (err) {
      return err instanceof Error ? err.message : 'Erro ao gerar conta a receber.';
    } finally {
      setInFlight(pedido.id, false);
    }
  }

  async function atualizarItemPedido(
    pedidoId: string,
    itemId: string,
    patch: { quantidade?: number; precoUnitario?: number }
  ) {
    const context = resolveContext();
    const updated = await atualizarPedidoItem(context, pedidoId, itemId, patch);
    upsertPedido(updated as Parameters<typeof upsertPedido>[0]);
    return updated;
  }

  async function removerItemPedido(pedidoId: string, itemId: string) {
    const context = resolveContext();
    const updated = await removerPedidoItem(context, pedidoId, itemId);
    upsertPedido(updated as Parameters<typeof upsertPedido>[0]);
    return updated;
  }

  async function adicionarItemPedido(
    pedidoId: string,
    item: { prodId: string; qty: number; preco: number }
  ) {
    const context = resolveContext();
    const updated = await adicionarPedidoItem(context, pedidoId, item);
    upsertPedido(updated as Parameters<typeof upsertPedido>[0]);
    return updated;
  }

  return {
    avancarStatus,
    confirmarEntrega,
    cancelarPedido,
    reabrirPedido,
    submitPedido,
    gerarContaManual,
    atualizarItemPedido,
    removerItemPedido,
    adicionarItemPedido,
    inFlight
  };
}
