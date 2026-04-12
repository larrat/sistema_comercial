import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act } from 'react';

import { ClienteListView } from './ClienteListView';
import { useClienteStore } from '../store/useClienteStore';
import type { Cliente } from '../../../../types/domain';

const CLIENTES: Cliente[] = [
  { id: '1', nome: 'João Silva', status: 'ativo', seg: 'Varejo', whatsapp: '11999990000' },
  { id: '2', nome: 'Maria Souza', status: 'inativo', seg: 'Atacado', email: 'maria@a.com' },
  { id: '3', nome: 'Pedro Lima', status: 'prospecto', seg: 'Varejo' }
];

beforeEach(() => {
  useClienteStore.setState({
    clientes: [],
    status: 'idle',
    error: null,
    filtro: { q: '', seg: '', status: '' }
  });
});

function carregarClientes() {
  act(() => useClienteStore.getState().setClientes(CLIENTES));
}

describe('ClienteListView', () => {
  it('mostra skeleton enquanto carrega', () => {
    act(() => useClienteStore.getState().setStatus('loading'));
    render(<ClienteListView />);
    expect(screen.getByTestId('skeleton')).toBeInTheDocument();
  });

  it('mostra estado de erro', () => {
    act(() => useClienteStore.getState().setStatus('error', 'Falhou na rede'));
    render(<ClienteListView />);
    expect(screen.getByTestId('error-state')).toBeInTheDocument();
    expect(screen.getByText('Falhou na rede')).toBeInTheDocument();
  });

  it('mostra empty state no-data quando lista vazia', () => {
    act(() => useClienteStore.getState().setClientes([]));
    render(<ClienteListView />);
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText(/Novo cliente/)).toBeInTheDocument();
  });

  it('renderiza lista com clientes', () => {
    carregarClientes();
    render(<ClienteListView />);
    expect(screen.getByTestId('cliente-list')).toBeInTheDocument();
    expect(screen.getAllByTestId('cliente-card')).toHaveLength(3);
  });

  it('exibe métricas corretas', () => {
    carregarClientes();
    render(<ClienteListView />);
    const metrics = screen.getByTestId('cliente-metrics');
    // verifica o valor ao lado de cada label
    const total = within(metrics).getByText('Total').closest('.met') as HTMLElement;
    const ativos = within(metrics).getByText('Ativos').closest('.met') as HTMLElement;
    expect(within(total).getByText('3')).toBeInTheDocument();
    expect(within(ativos).getByText('1')).toBeInTheDocument();
  });

  it('filtra por texto na busca', async () => {
    carregarClientes();
    render(<ClienteListView />);
    await userEvent.type(screen.getByTestId('busca-input'), 'maria');
    expect(screen.getAllByTestId('cliente-card')).toHaveLength(1);
    expect(screen.getByText('Maria Souza')).toBeInTheDocument();
  });

  it('filtra por segmento', async () => {
    carregarClientes();
    render(<ClienteListView />);
    await userEvent.selectOptions(screen.getByTestId('seg-select'), 'Varejo');
    expect(screen.getAllByTestId('cliente-card')).toHaveLength(2);
  });

  it('filtra por "Sem segmento"', async () => {
    act(() =>
      useClienteStore
        .getState()
        .setClientes([...CLIENTES, { id: '4', nome: 'Sem Seg', status: 'ativo' }])
    );
    render(<ClienteListView />);
    await userEvent.selectOptions(screen.getByTestId('seg-select'), 'Sem segmento');
    expect(screen.getAllByTestId('cliente-card')).toHaveLength(1);
    expect(screen.getByText('Sem Seg')).toBeInTheDocument();
  });

  it('filtra por status', async () => {
    carregarClientes();
    render(<ClienteListView />);
    await userEvent.selectOptions(screen.getByTestId('status-select'), 'ativo');
    expect(screen.getAllByTestId('cliente-card')).toHaveLength(1);
    expect(screen.getByText('João Silva')).toBeInTheDocument();
  });

  it('mostra empty state no-match após filtro sem resultado', async () => {
    carregarClientes();
    render(<ClienteListView />);
    await userEvent.type(screen.getByTestId('busca-input'), 'xyzinexistente');
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText(/filtros atuais/)).toBeInTheDocument();
  });

  it('botão limpar filtros aparece quando há filtro ativo', async () => {
    carregarClientes();
    render(<ClienteListView />);
    expect(screen.queryByTestId('limpar-filtro')).not.toBeInTheDocument();
    await userEvent.type(screen.getByTestId('busca-input'), 'joao');
    expect(screen.getByTestId('limpar-filtro')).toBeInTheDocument();
  });

  it('limpar filtros reseta busca e exibe todos', async () => {
    carregarClientes();
    render(<ClienteListView />);
    await userEvent.type(screen.getByTestId('busca-input'), 'joao');
    await userEvent.click(screen.getByTestId('limpar-filtro'));
    expect(screen.getAllByTestId('cliente-card')).toHaveLength(3);
  });

  it('chama onNovoCliente ao clicar no botão', async () => {
    carregarClientes();
    const onNovo = vi.fn();
    render(<ClienteListView onNovoCliente={onNovo} />);
    await userEvent.click(screen.getByTestId('novo-btn'));
    expect(onNovo).toHaveBeenCalledOnce();
  });

  it('chama onExportar ao clicar no botÃ£o', async () => {
    carregarClientes();
    const onExportar = vi.fn();
    render(<ClienteListView onExportar={onExportar} />);
    await userEvent.click(screen.getByTestId('export-btn'));
    expect(onExportar).toHaveBeenCalledOnce();
  });

  it('propaga onDetalhe ao ClienteCard', async () => {
    carregarClientes();
    const onDetalhe = vi.fn();
    render(<ClienteListView onDetalhe={onDetalhe} />);
    await userEvent.click(screen.getAllByText('Detalhes')[0]);
    expect(onDetalhe).toHaveBeenCalledWith('1');
  });

  it('propaga onExcluir ao ClienteCard', async () => {
    carregarClientes();
    const onExcluir = vi.fn();
    render(<ClienteListView onExcluir={onExcluir} />);
    await userEvent.click(screen.getAllByText('Excluir')[0]);
    expect(onExcluir).toHaveBeenCalledWith('1');
  });

  it('não mostra botão Novo quando onNovoCliente ausente', () => {
    carregarClientes();
    render(<ClienteListView />);
    expect(screen.queryByTestId('novo-btn')).not.toBeInTheDocument();
  });
});
