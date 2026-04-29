import { describe, expect, it, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useClienteStore, selectFilteredClientes, selectSegmentos } from './useClienteStore';
import type { Cliente } from '../../../../types/domain';

const CLIENTES: Cliente[] = [
  { id: '1', nome: 'João Silva', status: 'ativo', seg: 'Varejo', email: 'joao@a.com' },
  { id: '2', nome: 'Maria Souza', status: 'inativo', seg: 'Atacado' },
  { id: '3', nome: 'Pedro Lima', status: 'prospecto', seg: 'Varejo' }
];

beforeEach(() => {
  // reseta o store entre testes
  useClienteStore.setState({
    clientes: [],
    segmentClientes: [],
    status: 'idle',
    segmentStatus: 'idle',
    error: null,
    segmentError: null,
    filtro: { q: '', seg: '', status: '' },
    segmentos: [],
    page: 1,
    pageSize: 20,
    total: 0,
    pageCount: 1
  });
});

describe('useClienteStore', () => {
  it('começa com estado idle e sem clientes', () => {
    const { result } = renderHook(() => useClienteStore((s) => s));
    expect(result.current.status).toBe('idle');
    expect(result.current.clientes).toHaveLength(0);
  });

  it('setClientesPage atualiza lista e status para ready', () => {
    const { result } = renderHook(() => useClienteStore((s) => s));
    act(() =>
      result.current.setClientesPage({
        clientes: CLIENTES,
        page: 1,
        pageSize: 20,
        total: 3,
        pageCount: 1
      })
    );
    expect(result.current.clientes).toHaveLength(3);
    expect(result.current.status).toBe('ready');
  });

  it('setClientesPage limpa erro anterior ao concluir carga com sucesso', () => {
    const { result } = renderHook(() => useClienteStore((s) => s));
    act(() => result.current.setStatus('error', 'Falhou'));
    act(() =>
      result.current.setClientesPage({
        clientes: CLIENTES,
        page: 1,
        pageSize: 20,
        total: 3,
        pageCount: 1
      })
    );
    expect(result.current.status).toBe('ready');
    expect(result.current.error).toBeNull();
  });

  it('setStatus atualiza status e erro', () => {
    const { result } = renderHook(() => useClienteStore((s) => s));
    act(() => result.current.setStatus('error', 'Falhou'));
    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('Falhou');
  });

  it('setFiltro faz patch parcial do filtro', () => {
    const { result } = renderHook(() => useClienteStore((s) => s));
    act(() => result.current.setFiltro({ q: 'joao' }));
    expect(result.current.filtro.q).toBe('joao');
    expect(result.current.filtro.seg).toBe('');
  });

  it('clearFiltro reseta todos os campos', () => {
    const { result } = renderHook(() => useClienteStore((s) => s));
    act(() => {
      result.current.setFiltro({ q: 'joao', seg: 'Varejo', status: 'ativo' });
    });
    act(() => result.current.clearFiltro());
    expect(result.current.filtro).toEqual({ q: '', seg: '', status: '' });
  });

  it('clearFiltro preserva lista e status carregados', () => {
    const { result } = renderHook(() => useClienteStore((s) => s));
    act(() =>
      result.current.setClientesPage({
        clientes: CLIENTES,
        page: 1,
        pageSize: 20,
        total: 3,
        pageCount: 1
      })
    );
    act(() => result.current.setFiltro({ q: 'joao' }));
    act(() => result.current.clearFiltro());
    expect(result.current.clientes).toHaveLength(3);
    expect(result.current.status).toBe('ready');
  });

  it('upsertCliente atualiza cliente existente sem duplicar registro', () => {
    const { result } = renderHook(() => useClienteStore((s) => s));
    act(() =>
      result.current.setClientesPage({
        clientes: CLIENTES,
        page: 1,
        pageSize: 20,
        total: 3,
        pageCount: 1
      })
    );
    act(() =>
      result.current.upsertCliente({
        id: '2',
        nome: 'Maria Souza',
        status: 'ativo',
        seg: 'Atacado',
        email: 'nova@a.com'
      })
    );
    expect(result.current.clientes).toHaveLength(3);
    expect(result.current.clientes.find((item) => item.id === '2')?.email).toBe('nova@a.com');
    expect(result.current.error).toBeNull();
  });

  it('removeCliente remove o registro e preserva estado pronto', () => {
    const { result } = renderHook(() => useClienteStore((s) => s));
    act(() =>
      result.current.setClientesPage({
        clientes: CLIENTES,
        page: 1,
        pageSize: 20,
        total: 3,
        pageCount: 1
      })
    );
    act(() => result.current.removeCliente('2'));
    expect(result.current.clientes.map((item) => item.id)).toEqual(['1', '3']);
    expect(result.current.status).toBe('ready');
    expect(result.current.error).toBeNull();
  });
});

describe('selectFilteredClientes', () => {
  it('retorna todos quando filtro vazio', () => {
    useClienteStore.setState({
      segmentClientes: CLIENTES,
      filtro: { q: '', seg: '', status: '' }
    });
    const state = useClienteStore.getState();
    expect(selectFilteredClientes(state)).toHaveLength(3);
  });

  it('filtra por texto', () => {
    useClienteStore.setState({ segmentClientes: CLIENTES, filtro: { q: 'maria' } });
    const state = useClienteStore.getState();
    expect(selectFilteredClientes(state)).toHaveLength(1);
  });

  it('filtra por status', () => {
    useClienteStore.setState({ segmentClientes: CLIENTES, filtro: { status: 'ativo' } });
    const state = useClienteStore.getState();
    expect(selectFilteredClientes(state)).toHaveLength(1);
  });

  it('filtra por segmento', () => {
    useClienteStore.setState({ segmentClientes: CLIENTES, filtro: { seg: 'Varejo' } });
    const state = useClienteStore.getState();
    expect(selectFilteredClientes(state)).toHaveLength(2);
  });

  it('filtra por "Sem segmento" quando nao ha segmento', () => {
    const clientes: Cliente[] = [...CLIENTES, { id: '4', nome: 'Sem Seg', status: 'ativo' }];
    useClienteStore.setState({ segmentClientes: clientes, filtro: { seg: 'Sem segmento' } });
    const state = useClienteStore.getState();
    expect(selectFilteredClientes(state)).toHaveLength(1);
    expect(selectFilteredClientes(state)[0]?.id).toBe('4');
  });
});

describe('selectSegmentos', () => {
  it('retorna segmentos únicos ordenados', () => {
    useClienteStore.setState({ segmentos: ['Atacado', 'Varejo'] });
    const segs = selectSegmentos(useClienteStore.getState());
    expect(segs).toEqual(['Atacado', 'Varejo']);
  });
});
