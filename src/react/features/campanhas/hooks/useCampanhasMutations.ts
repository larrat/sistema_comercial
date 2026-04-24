import { useAuthStore } from '../../../app/useAuthStore';
import { useFilialStore } from '../../../app/useFilialStore';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { emitToast } from '../../../app/legacy/events';
import { useCampanhasStore } from '../store/useCampanhasStore';
import {
  upsertCampanha,
  deleteCampanha,
  patchEnvioStatus,
  gerarFilaEdge
} from '../services/campanhasApi';
import type { Campanha, CampanhaEnvio } from '../../../../types/domain';

function useCtx() {
  const session = useAuthStore((s) => s.session);
  const filialId = useFilialStore((s) => s.filialId) ?? '';
  const cfg = getSupabaseConfig();
  if (!session?.access_token || !filialId || !cfg.ready) return null;
  return { url: cfg.url, key: cfg.key, token: session.access_token, filialId };
}

export function useCampanhasMutations() {
  const ctx = useCtx();
  const setSaving = useCampanhasStore((s) => s.setSaving);
  const setCampanhas = useCampanhasStore((s) => s.setCampanhas);
  const campanhas = useCampanhasStore((s) => s.campanhas);
  const envios = useCampanhasStore((s) => s.envios);
  const setEnvios = useCampanhasStore((s) => s.setEnvios);
  const patchEnvioLocal = useCampanhasStore((s) => s.patchEnvioLocal);
  const closeCampModal = useCampanhasStore((s) => s.closeCampModal);
  const requestReload = useCampanhasStore((s) => s.requestReload);
  const avancarLote = useCampanhasStore((s) => s.avancarLote);

  async function salvar(dados: Partial<Campanha>) {
    if (!ctx) return;
    setSaving(true);
    try {
      const saved = await upsertCampanha(ctx, dados);
      const exists = campanhas.some((c) => c.id === saved.id);
      setCampanhas(
        exists ? campanhas.map((c) => (c.id === saved.id ? saved : c)) : [saved, ...campanhas]
      );
      closeCampModal();
      emitToast('Campanha salva com sucesso.', 'success');
    } catch (e) {
      emitToast(e instanceof Error ? e.message : 'Erro ao salvar campanha.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function remover(id: string) {
    if (!ctx) return;
    try {
      await deleteCampanha(ctx, id);
      setCampanhas(campanhas.filter((c) => c.id !== id));
      emitToast('Campanha removida.', 'success');
    } catch (e) {
      emitToast(e instanceof Error ? e.message : 'Erro ao remover campanha.', 'error');
    }
  }

  async function gerarFila(campanhaId: string) {
    if (!ctx) return;
    // Abre janela antes do await para evitar bloqueio de popup
    const win = window.open('', '_blank');
    try {
      const result = await gerarFilaEdge(ctx, campanhaId, false);
      if (win) {
        win.close();
      }
      emitToast(
        `Fila gerada: ${result.criados} envios criados, ${result.ignorados} ignorados.`,
        'success'
      );
      requestReload();
    } catch (e) {
      if (win) win.close();
      emitToast(e instanceof Error ? e.message : 'Erro ao gerar fila.', 'error');
    }
  }

  async function marcarEnviado(envio: CampanhaEnvio) {
    if (!ctx) return;
    const prev = { status: envio.status, enviado_em: envio.enviado_em, erro: envio.erro };
    patchEnvioLocal(envio.id, { status: 'enviado', enviado_em: new Date().toISOString(), erro: null });
    try {
      await patchEnvioStatus(ctx, envio.id, {
        status: 'enviado',
        enviado_em: new Date().toISOString(),
        erro: null
      });
    } catch {
      patchEnvioLocal(envio.id, prev);
      emitToast('Erro ao marcar como enviado.', 'error');
    }
  }

  async function marcarFalhou(envio: CampanhaEnvio, erro = 'Falha manual') {
    if (!ctx) return;
    const prev = { status: envio.status, enviado_em: envio.enviado_em, erro: envio.erro };
    patchEnvioLocal(envio.id, { status: 'falhou', erro });
    try {
      await patchEnvioStatus(ctx, envio.id, { status: 'falhou', erro });
    } catch {
      patchEnvioLocal(envio.id, prev);
      emitToast('Erro ao registrar falha.', 'error');
    }
  }

  async function desfazer(envio: CampanhaEnvio) {
    if (!ctx) return;
    const prev = { status: envio.status, enviado_em: envio.enviado_em, erro: envio.erro };
    patchEnvioLocal(envio.id, { status: 'pendente', enviado_em: null, erro: null });
    try {
      await patchEnvioStatus(ctx, envio.id, { status: 'pendente', enviado_em: null, erro: null });
    } catch {
      patchEnvioLocal(envio.id, prev);
      emitToast('Erro ao desfazer status.', 'error');
    }
  }

  async function marcarSelecionadosEnviados(ids: string[]) {
    const targets = envios.filter((e) => ids.includes(e.id));
    await Promise.all(targets.map(marcarEnviado));
  }

  async function marcarSelecionadosFalhou(ids: string[]) {
    const targets = envios.filter((e) => ids.includes(e.id));
    await Promise.all(targets.map((e) => marcarFalhou(e)));
  }

  function abrirWhatsApp(envio: CampanhaEnvio) {
    if (!envio.destino) return;
    const num = envio.destino.replace(/\D/g, '');
    const msg = encodeURIComponent(envio.mensagem || '');
    window.open(`https://wa.me/${num}?text=${msg}`, '_blank');
  }

  function abrirWhatsAppEAvancarLote(envio: CampanhaEnvio) {
    abrirWhatsApp(envio);
    avancarLote();
  }

  return {
    salvar,
    remover,
    gerarFila,
    marcarEnviado,
    marcarFalhou,
    desfazer,
    marcarSelecionadosEnviados,
    marcarSelecionadosFalhou,
    abrirWhatsApp,
    abrirWhatsAppEAvancarLote
  };
}
