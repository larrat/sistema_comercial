import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { Cliente } from '../../../../types/domain';
import { ClienteCard } from './ClienteCard';

const cli: Cliente = {
  id: 'c1',
  nome: 'João Silva',
  apelido: 'Joãozinho',
  status: 'ativo',
  seg: 'Varejo',
  whatsapp: '11999990000',
  email: 'joao@empresa.com',
  optin_marketing: true
};

const cliMinimo: Cliente = { id: 'c2', nome: 'Ana Souza', status: 'prospecto' };

describe('ClienteCard', () => {
  it('renderiza o nome do cliente', () => {
    render(<ClienteCard cliente={cli} />);
    expect(screen.getByText('João Silva')).toBeInTheDocument();
  });

  it('renderiza o apelido quando presente', () => {
    render(<ClienteCard cliente={cli} />);
    expect(screen.getByText('Joãozinho')).toBeInTheDocument();
  });

  it('não renderiza apelido quando ausente', () => {
    render(<ClienteCard cliente={cliMinimo} />);
    expect(screen.queryByText(/apelido/i)).not.toBeInTheDocument();
  });

  it('exibe o badge de status correto para ativo', () => {
    render(<ClienteCard cliente={cli} />);
    expect(screen.getByText('Ativo')).toBeInTheDocument();
  });

  it('exibe o badge de status correto para prospecto', () => {
    render(<ClienteCard cliente={cliMinimo} />);
    expect(screen.getByText('Prospecto')).toBeInTheDocument();
  });

  it('exibe badge WhatsApp quando whatsapp está presente', () => {
    render(<ClienteCard cliente={cli} />);
    expect(screen.getByText('WhatsApp')).toBeInTheDocument();
  });

  it('exibe badge Telefone quando só há telefone', () => {
    const c: Cliente = { id: 'x', nome: 'X', status: 'ativo', tel: '11999990000' };
    render(<ClienteCard cliente={c} />);
    expect(screen.getByText('Telefone')).toBeInTheDocument();
  });

  it('exibe badge E-mail quando só há email', () => {
    const c: Cliente = { id: 'x', nome: 'X', status: 'ativo', email: 'x@y.com' };
    render(<ClienteCard cliente={c} />);
    expect(screen.getByText('E-mail')).toBeInTheDocument();
  });

  it('exibe badge Sem contato quando não há nenhum', () => {
    render(<ClienteCard cliente={cliMinimo} />);
    const badges = screen.getAllByText('Sem contato');
    // aparece no contato principal e no badge
    expect(badges.length).toBeGreaterThanOrEqual(1);
    expect(badges.some((el) => el.classList.contains('bdg'))).toBe(true);
  });

  it('exibe badge MKT quando optin_marketing ativo', () => {
    render(<ClienteCard cliente={cli} />);
    expect(screen.getByText('MKT')).toBeInTheDocument();
  });

  it('não exibe badge MKT quando optin_marketing ausente', () => {
    render(<ClienteCard cliente={cliMinimo} />);
    expect(screen.queryByText('MKT')).not.toBeInTheDocument();
  });

  it('exibe badge de segmento', () => {
    render(<ClienteCard cliente={cli} />);
    expect(screen.getByText('Varejo')).toBeInTheDocument();
  });

  it('não renderiza botões sem callbacks', () => {
    render(<ClienteCard cliente={cli} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('chama onDetalhe com o id ao clicar em Detalhes', async () => {
    const onDetalhe = vi.fn();
    render(<ClienteCard cliente={cli} onDetalhe={onDetalhe} />);
    await userEvent.click(screen.getByText('Detalhes'));
    expect(onDetalhe).toHaveBeenCalledWith('c1');
  });

  it('chama onEditar com o id ao clicar em Editar', async () => {
    const onEditar = vi.fn();
    render(<ClienteCard cliente={cli} onEditar={onEditar} />);
    await userEvent.click(screen.getByText('Editar'));
    expect(onEditar).toHaveBeenCalledWith('c1');
  });

  it('renderiza cliente mínimo sem erros', () => {
    expect(() => render(<ClienteCard cliente={cliMinimo} />)).not.toThrow();
  });

  it('tem data-testid correto', () => {
    render(<ClienteCard cliente={cli} />);
    expect(screen.getByTestId('cliente-card')).toBeInTheDocument();
  });
});
