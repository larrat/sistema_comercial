import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildAnalyticsEvent,
  clearTrackedEvents,
  getTrackedEvents,
  sanitizeAnalyticsMetadata,
  trackEvent
} from './analytics';

describe('analytics lib', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('sanitiza metadata e remove chaves sensíveis', () => {
    const metadata = sanitizeAnalyticsMetadata({
      origem: 'lista',
      status: 'ativo',
      termo: 'joao',
      email: 'joao@empresa.com',
      telefone: '(91) 99999-9999',
      filtros: { status: 'ativo', periodo: 'mes' },
      total: 12
    });

    expect(metadata).toEqual({
      origem: 'lista',
      status: 'ativo',
      filtros: { status: 'ativo', periodo: 'mes' },
      total: 12
    });
  });

  it('monta evento com os campos mínimos', () => {
    const event = buildAnalyticsEvent({
      event_name: 'cliente_aberto',
      module: 'clientes',
      user_id: 'user-1',
      tenant_id: 'filial-1',
      route: '/app/clientes',
      metadata: { origem: 'lista' },
      result: 'success',
      timestamp: '2026-04-29T00:00:00.000Z'
    });

    expect(event.event_name).toBe('cliente_aberto');
    expect(event.module).toBe('clientes');
    expect(event.user_id).toBe('user-1');
    expect(event.tenant_id).toBe('filial-1');
    expect(event.route).toBe('/app/clientes');
    expect(event.metadata).toEqual({ origem: 'lista' });
    expect(event.result).toBe('success');
  });

  it('grava evento de forma assíncrona sem quebrar o fluxo', async () => {
    trackEvent({
      event_name: 'drawer_aberto',
      module: 'clientes',
      route: '/app/clientes',
      metadata: { origem: 'detalhe' }
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    const events = getTrackedEvents();
    expect(events).toHaveLength(1);
    expect(events[0]?.event_name).toBe('drawer_aberto');
  });

  it('engole falha de persistência silenciosamente', async () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage failed');
    });

    expect(() =>
      trackEvent({
        event_name: 'pedido_salvo',
        module: 'pedidos',
        route: '/app/pedidos'
      })
    ).not.toThrow();

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(spy).toHaveBeenCalled();
  });

  it('limpa eventos armazenados', async () => {
    trackEvent({
      event_name: 'produto_buscado',
      module: 'produtos',
      route: '/app/produtos'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(getTrackedEvents()).toHaveLength(1);

    clearTrackedEvents();
    expect(getTrackedEvents()).toHaveLength(0);
  });
});

