import { useAuthStore } from '../../../app/useAuthStore';
import { useFilialStore } from '../../../app/useFilialStore';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { usePedidoStore } from '../store/usePedidoStore';
import { updatePedidoStatus } from '../services/pedidosApi';
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

  async function avancarStatus(pedido: { id: string; status: string; [key: string]: unknown }) {
    const current = normalizePedStatus(pedido.status);
    const next = NEXT_STATUS[current];
    if (!next || inFlight.has(pedido.id)) return;

    const context = resolveContext();
    setInFlight(pedido.id, true);
    try {
      await updatePedidoStatus(context, pedido.id, next);
      upsertPedido({ ...pedido, status: next } as Parameters<typeof upsertPedido>[0]);
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

  return { avancarStatus, cancelarPedido, reabrirPedido, inFlight };
}
