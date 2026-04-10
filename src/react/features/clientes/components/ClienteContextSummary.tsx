import type { Cliente } from '../../../../types/domain';

type Props = {
  cliente: Cliente;
};

function buildContato(cliente: Cliente): string {
  if (cliente.whatsapp) return `WhatsApp: ${cliente.whatsapp}`;
  if (cliente.tel) return `Telefone: ${cliente.tel}`;
  if (cliente.email) return cliente.email;
  return 'Sem contato principal';
}

export function ClienteContextSummary({ cliente }: Props) {
  return (
    <div className="card-shell form-gap-bottom-xs" data-testid="cliente-context-summary">
      <div className="fb form-gap-bottom-xs">
        <div>
          <div className="table-cell-caption table-cell-muted">Resumo do cliente</div>
          <h3 className="table-cell-strong">{cliente.nome}</h3>
        </div>
        <span className="bdg bk">{cliente.status || 'ativo'}</span>
      </div>

      <div className="grid grid-2">
        <div className="empty-inline">
          <strong>Contato</strong>
          <p>{buildContato(cliente)}</p>
        </div>
        <div className="empty-inline">
          <strong>Comercial</strong>
          <p>
            Segmento: {cliente.seg || 'Sem segmento'}
            <br />
            Prazo: {cliente.prazo || 'a_vista'}
          </p>
        </div>
      </div>
    </div>
  );
}
