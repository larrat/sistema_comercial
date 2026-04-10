import { describe, expect, it } from 'vitest';

import type { Cliente } from '../../../types/domain';
import { renderClienteCard, getContatoInfo } from '../ui/ClienteCard';
import { renderClienteEmptyState } from '../ui/ClienteEmptyState';
import { renderClienteListItemDesktop, renderClienteListItemMobile } from '../ui/ClienteListItem';
import { renderClienteList } from '../ui/ClienteList';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const cli: Cliente = {
  id: 'c1',
  nome: 'João Silva',
  apelido: 'Joãozinho',
  status: 'ativo',
  seg: 'Varejo',
  tab: 'vip',
  prazo: '30d',
  whatsapp: '11999990000',
  tel: '1133330000',
  email: 'joao@empresa.com',
  optin_marketing: true,
  optin_email: false,
  optin_sms: false,
  time: 'Sul, Norte'
};

const cliMinimo: Cliente = { id: 'c2', nome: 'Ana Souza', status: 'prospecto' };

const lista: Cliente[] = [cli, cliMinimo];

// ---------------------------------------------------------------------------
// ClienteCard + getContatoInfo
// ---------------------------------------------------------------------------

describe('getContatoInfo', () => {
  it('prioriza WhatsApp', () => {
    const info = getContatoInfo({
      id: '1',
      nome: 'A',
      whatsapp: '11999990000',
      tel: '1133330000',
      status: 'ativo'
    });
    expect(info.principal).toContain('WhatsApp');
    expect(info.badge).toContain('WhatsApp');
    expect(info.secundario).toContain('Telefone');
  });

  it('usa telefone quando não há WhatsApp', () => {
    const info = getContatoInfo({ id: '1', nome: 'A', tel: '1133330000', status: 'ativo' });
    expect(info.principal).toContain('Telefone');
    expect(info.badge).toContain('Telefone');
  });

  it('usa e-mail quando não há telefone', () => {
    const info = getContatoInfo({ id: '1', nome: 'A', email: 'a@b.com', status: 'ativo' });
    expect(info.principal).toBe('a@b.com');
    expect(info.badge).toContain('E-mail');
  });

  it('retorna "Sem contato" quando não há nenhum', () => {
    const info = getContatoInfo({ id: '1', nome: 'A', status: 'ativo' });
    expect(info.principal).toBe('Sem contato');
    expect(info.badge).toContain('Sem contato');
  });
});

describe('renderClienteCard', () => {
  it('contém nome e iniciais', () => {
    const html = renderClienteCard(cli);
    expect(html).toContain('João Silva');
    expect(html).toContain('JS');
  });

  it('contém status badge', () => {
    expect(renderClienteCard(cli)).toContain('Ativo');
    expect(renderClienteCard({ ...cli, status: 'inativo' })).toContain('Inativo');
    expect(renderClienteCard({ ...cli, status: 'prospecto' })).toContain('Prospecto');
  });

  it('inclui badge de segmento quando presente', () => {
    expect(renderClienteCard(cli)).toContain('Varejo');
  });

  it('omite badge de segmento quando ausente', () => {
    const html = renderClienteCard(cliMinimo);
    const badgeCount = (html.match(/class="bdg bk"/g) || []).length;
    expect(badgeCount).toBe(0);
  });

  it('escapa HTML no nome', () => {
    const html = renderClienteCard({
      id: 'x',
      nome: '<img src=x onerror=alert(1)>',
      status: 'ativo'
    });
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
  });

  it('oculta contato secundário quando showSecondaryContact=false', () => {
    const html = renderClienteCard(cli, { showSecondaryContact: false });
    expect(html).not.toContain('cliente-card__contact-secondary');
  });

  it('renderiza cliente mínimo sem erros', () => {
    expect(() => renderClienteCard(cliMinimo)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// ClienteEmptyState
// ---------------------------------------------------------------------------

describe('renderClienteEmptyState', () => {
  it('renderiza mensagem de cadastro quando não há dados', () => {
    const html = renderClienteEmptyState('no-data');
    expect(html).toContain('Clique em "Novo cliente"');
    expect(html).toContain('class="empty"');
  });

  it('renderiza mensagem de filtro quando há dados mas nenhum match', () => {
    const html = renderClienteEmptyState('no-match');
    expect(html).toContain('filtros atuais');
  });
});

// ---------------------------------------------------------------------------
// ClienteListItem — mobile
// ---------------------------------------------------------------------------

describe('renderClienteListItemMobile', () => {
  it('contém o nome do cliente', () => {
    expect(renderClienteListItemMobile(cli)).toContain('João Silva');
  });

  it('contém o apelido quando presente', () => {
    expect(renderClienteListItemMobile(cli)).toContain('Joãozinho');
  });

  it('não emite linha de apelido quando ausente', () => {
    const html = renderClienteListItemMobile(cliMinimo);
    expect(html).not.toContain('mobile-card-sub');
  });

  it('usa data-action para ações (sem onclick inline)', () => {
    const html = renderClienteListItemMobile(cli);
    expect(html).toContain('data-action="detalhe"');
    expect(html).toContain('data-action="editar"');
    expect(html).toContain('data-action="excluir"');
    expect(html).not.toContain('onclick');
  });

  it('contém o data-id correto nos botões', () => {
    const html = renderClienteListItemMobile(cli);
    expect(html).toContain(`data-id="${cli.id}"`);
  });

  it('exibe badge VIP para tab vip', () => {
    expect(renderClienteListItemMobile(cli)).toContain('VIP');
  });

  it('exibe badge MKT quando optin_marketing ativo', () => {
    expect(renderClienteListItemMobile(cli)).toContain('MKT');
  });

  it('renderiza cliente mínimo sem erros', () => {
    expect(() => renderClienteListItemMobile(cliMinimo)).not.toThrow();
  });

  it('escapa HTML no nome', () => {
    const malicioso: Cliente = { id: 'x', nome: '<script>alert(1)</script>', status: 'ativo' };
    expect(renderClienteListItemMobile(malicioso)).not.toContain('<script>');
  });
});

// ---------------------------------------------------------------------------
// ClienteListItem — desktop
// ---------------------------------------------------------------------------

describe('renderClienteListItemDesktop', () => {
  it('renderiza uma <tr>', () => {
    const html = renderClienteListItemDesktop(cli);
    expect(html.startsWith('<tr')).toBe(true);
    expect(html).toContain('</tr>');
  });

  it('contém nome e apelido', () => {
    const html = renderClienteListItemDesktop(cli);
    expect(html).toContain('João Silva');
    expect(html).toContain('Joãozinho');
  });

  it('usa data-action (sem onclick inline)', () => {
    const html = renderClienteListItemDesktop(cli);
    expect(html).toContain('data-action="detalhe"');
    expect(html).not.toContain('onclick');
  });

  it('renderiza cliente mínimo sem erros', () => {
    expect(() => renderClienteListItemDesktop(cliMinimo)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// ClienteList
// ---------------------------------------------------------------------------

describe('renderClienteList', () => {
  it('retorna lista mobile com todos os clientes quando filtro vazio', () => {
    const result = renderClienteList(lista, {}, 'mobile');
    expect(result.visible).toBe(2);
    expect(result.total).toBe(2);
    expect(result.html).toContain('João Silva');
    expect(result.html).toContain('Ana Souza');
  });

  it('retorna lista desktop com tabela quando mode=desktop', () => {
    const result = renderClienteList(lista, {}, 'desktop');
    expect(result.html).toContain('<table');
    expect(result.html).toContain('<thead');
  });

  it('filtra por status', () => {
    const result = renderClienteList(lista, { status: 'ativo' }, 'mobile');
    expect(result.visible).toBe(1);
    expect(result.html).toContain('João Silva');
    expect(result.html).not.toContain('Ana Souza');
  });

  it('filtra por texto', () => {
    const result = renderClienteList(lista, { q: 'ana' }, 'mobile');
    expect(result.visible).toBe(1);
    expect(result.html).toContain('Ana Souza');
  });

  it('retorna empty state no-match quando filtro elimina todos', () => {
    const result = renderClienteList(lista, { q: 'xyzinexistente' }, 'mobile');
    expect(result.visible).toBe(0);
    expect(result.html).toContain('filtros atuais');
  });

  it('retorna empty state no-data quando lista vazia', () => {
    const result = renderClienteList([], {}, 'mobile');
    expect(result.visible).toBe(0);
    expect(result.html).toContain('Clique em "Novo cliente"');
  });

  it('retorna segmentos únicos independente do filtro', () => {
    const result = renderClienteList(lista, { q: 'ana' }, 'mobile');
    expect(result.segmentos).toContain('Varejo');
  });
});
