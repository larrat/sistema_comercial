import { useAuthStore } from '../../../app/useAuthStore';
import { useFilialStore } from '../../../app/useFilialStore';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { usePedidoStore } from '../store/usePedidoStore';
import { savePedido, updatePedidoStatus, type PedidoSaveInput } from '../services/pedidosApi';
import { gerarContaSeNecessario, type ContaReceberInput } from '../services/contasReceberApi';
import { NEXT_STATUS, normalizePedStatus } from '../types';

export function usePedidoMutations() {
  const upsertPedido = usePedidoStore((s) => s.upsertPedido);
  const setInFlight = usePedidoStore((s) => s.setInFlight);
  const inFlight = usePedidoStore((s) => s.inFlight);

  const session = useAuthStore((s) => s.session);
  const filialId = useFilialStore((s) => s.filialId);

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

  async function cancelarPedido(pedido: { id: string; status: string; [key: string]: unknown }) {
    const current = normalizePedStatus(pedido.status);
    if (current === 'cancelado' || current === 'entregue' || inFlight.has(pedido.id)) return;

    const context = resolveContext();
    setInFlight(pedido.id, true);
    try {
      await updatePedidoStatus(context, pedido.id, 'cancelado');
      upsertPedido({ ...pedido, status: 'cancelado' } as Parameters<typeof upsertPedido>[0]);
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

  async function submitPedido(input: Omit<PedidoSaveInput, 'filial_id'>): Promise<void> {
    const context = resolveContext();

    const pedidos = usePedidoStore.getState().pedidos;
    const existing = pedidos.find((p) => p.id === input.id);
    const statusAnterior = existing ? normalizePedStatus(existing.status) : '';

    const full: PedidoSaveInput = { ...input, filial_id: context.filialId };
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
    gerarContaSeNecessario(context, contaInput, full.status, statusAnterior).catch(() => undefined);
  }

  return { avancarStatus, cancelarPedido, reabrirPedido, submitPedido, inFlight };
}
