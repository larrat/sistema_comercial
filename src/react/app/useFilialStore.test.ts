import { beforeEach, describe, expect, it } from 'vitest';

import { useFilialStore } from './useFilialStore';

describe('useFilialStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useFilialStore.setState({ filialId: null });
  });

  it('hydrate le a filial do localStorage', () => {
    localStorage.setItem('sc_filial_id', 'filial-7');

    useFilialStore.getState().hydrate();

    expect(useFilialStore.getState().filialId).toBe('filial-7');
  });

  it('setFilial persiste e atualiza o estado', () => {
    useFilialStore.getState().setFilial('filial-9');

    expect(useFilialStore.getState().filialId).toBe('filial-9');
    expect(localStorage.getItem('sc_filial_id')).toBe('filial-9');
  });

  it('clearFilial remove a persistencia e limpa o estado', () => {
    localStorage.setItem('sc_filial_id', 'filial-3');
    useFilialStore.setState({ filialId: 'filial-3' });

    useFilialStore.getState().clearFilial();

    expect(useFilialStore.getState().filialId).toBeNull();
    expect(localStorage.getItem('sc_filial_id')).toBeNull();
  });
});
