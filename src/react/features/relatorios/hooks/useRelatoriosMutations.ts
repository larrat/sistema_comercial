import { useFilialStore } from '../../../app/useFilialStore';
import { emitToast } from '../../../app/legacy/events';
import { useRelatoriosStore } from '../store/useRelatoriosStore';
import { saveValidacao } from '../utils/oportunidadesJogos';
import type { Pedido } from '../../../../types/domain';

export function useRelatoriosMutations() {
  const filialId = useFilialStore((s) => s.filialId) ?? '';
  const pedidos = useRelatoriosStore((s) => s.pedidos);
  const closeValidacao = useRelatoriosStore((s) => s.closeValidacao);
  const requestReload = useRelatoriosStore((s) => s.requestReload);

  function salvarValidacao(
    oportunidadeId: string,
    pedidoId: string,
    observacao: string
  ) {
    if (!filialId || !oportunidadeId) return;

    const pedido: Pedido | undefined = pedidoId
      ? pedidos.find((p) => p.id === pedidoId)
      : undefined;

    saveValidacao(filialId, oportunidadeId, {
      pedido_id: pedido?.id || null,
      pedido_num: pedido?.num || null,
      pedido_total: pedido?.total || null,
      observacao_validacao: observacao
    });

    closeValidacao();
    requestReload();
    emitToast('Oportunidade validada com sucesso.', 'success');
  }

  return { salvarValidacao };
}
