import { useEffect, useRef, useState, type MouseEvent } from 'react';
import type { Cliente } from '../../../../types/domain';
import { StatusBadge } from '../../../shared/ui';
import type { StatusBadgeTone } from '../../../shared/ui';

const STATUS_BADGE: Record<string, { label: string; tone: StatusBadgeTone }> = {
  ativo: { label: 'Ativo', tone: 'success' },
  inativo: { label: 'Inativo', tone: 'neutral' },
  prospecto: { label: 'Prospecto', tone: 'info' }
};

type ContactInfo = {
  value: string;
  tone: StatusBadgeTone;
  label: string;
};

function getContactInfo(cliente: Cliente): ContactInfo {
  const whatsapp = String(cliente.whatsapp || '').trim();
  const tel = String(cliente.tel || '').trim();
  const email = String(cliente.email || '').trim();
  if (whatsapp) return { value: whatsapp, tone: 'success', label: 'WhatsApp' };
  if (tel) return { value: tel, tone: 'warning', label: 'Telefone' };
  if (email) return { value: email, tone: 'info', label: 'E-mail' };
  return { value: 'Sem contato', tone: 'danger', label: 'Sem contato' };
}

type Props = {
  cliente: Cliente;
  onDetalhe?: (id: string) => void;
  onEditar?: (id: string) => void;
  onExcluir?: (id: string) => void;
};

export function ClienteCard({ cliente, onDetalhe, onEditar, onExcluir }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const contato = getContactInfo(cliente);
  const statusBadge = STATUS_BADGE[cliente.status ?? ''];
  const localidade = [cliente.cidade, cliente.estado].filter(Boolean).join('/');
  const hasActions = !!(onDetalhe || onEditar || onExcluir);

  useEffect(() => {
    if (!menuOpen) return;
    function handleOutside(e: globalThis.MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [menuOpen]);

  function handleRowClick() {
    onDetalhe?.(String(cliente.id));
  }

  function handleMenuToggle(e: MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    setMenuOpen((prev) => !prev);
  }

  function stopProp(e: MouseEvent) {
    e.stopPropagation();
  }

  function handleMenuDetalhe(e: MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    setMenuOpen(false);
    onDetalhe?.(String(cliente.id));
  }

  function handleMenuEditar(e: MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    setMenuOpen(false);
    onEditar?.(String(cliente.id));
  }

  function handleMenuExcluir(e: MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    setMenuOpen(false);
    onExcluir?.(String(cliente.id));
  }

  return (
    <div
      className={`cli-row${onDetalhe ? ' cli-row--clickable' : ''}`}
      data-testid="cliente-card"
      onClick={handleRowClick}
      role={onDetalhe ? 'button' : undefined}
    >
      <div className="cli-row__name">
        <span className="cli-row__title">{cliente.nome}</span>
        {cliente.apelido && <span className="cli-row__sub">{cliente.apelido}</span>}
      </div>

      <div>
        {statusBadge && (
          <StatusBadge tone={statusBadge.tone}>{statusBadge.label}</StatusBadge>
        )}
      </div>

      <div className="cli-row__contact">
        <StatusBadge tone={contato.tone}>{contato.label}</StatusBadge>
        {contato.value !== contato.label && (
          <span className="cli-row__contact-val">{contato.value}</span>
        )}
      </div>

      <div className="cli-row__seg">
        <span>{cliente.seg || '—'}</span>
        {cliente.optin_marketing && <StatusBadge tone="success">MKT</StatusBadge>}
      </div>

      <div className="cli-row__loc">{localidade || '—'}</div>

      {hasActions && (
        <div ref={menuRef} className="cli-row__actions" onClick={stopProp}>
          <button
            className="cli-row__menu-btn"
            type="button"
            data-testid="cli-menu-btn"
            onClick={handleMenuToggle}
            aria-label="Ações do cliente"
          >
            ⋯
          </button>
          {menuOpen && (
            <div className="cli-row__menu" role="menu">
              {onDetalhe && (
                <button
                  className="cli-row__menu-item"
                  type="button"
                  onClick={handleMenuDetalhe}
                >
                  Detalhes
                </button>
              )}
              {onEditar && (
                <button
                  className="cli-row__menu-item"
                  type="button"
                  onClick={handleMenuEditar}
                >
                  Editar
                </button>
              )}
              {onExcluir && (
                <button
                  className="cli-row__menu-item cli-row__menu-item--danger"
                  type="button"
                  onClick={handleMenuExcluir}
                >
                  Excluir
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
