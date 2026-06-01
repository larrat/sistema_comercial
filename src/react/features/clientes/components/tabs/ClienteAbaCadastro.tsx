import { Button } from '../../../../shared/ui';
import { ClienteForm } from '../ClienteForm';
import { ClienteInfoTable } from '../ClienteProfileHelpers';

export function ClienteAbaCadastro({
  editingCadastro,
  setEditingCadastro,
  cliente,
  onClienteSaved,
  onReload
}: any) {
  return (
    <section className="flex flex-col gap-6 animate-in fade-in duration-200">
      {editingCadastro ? (
        <section className="bg-slate-900 border border-white/5 rounded-xl shadow-sm p-6">
          <ClienteForm
            initialCliente={cliente}
            analyticsOrigin="cliente_profile_page"
            onSaved={(savedCliente) => {
              setEditingCadastro(false);
              onClienteSaved?.(savedCliente);
              onReload?.();
            }}
            onCancel={() => setEditingCadastro(false)}
          />
        </section>
      ) : (
        <section className="rf-cliente-profile__card">
          <div className="rf-cliente-profile__card-head">
            <div>
              <h3 className="rf-cliente-profile__card-title">Cadastro</h3>
              <p className="rf-cliente-profile__card-subtitle">
                Revise os dados principais sem sair da página do cliente.
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setEditingCadastro(true)}>
              Editar cadastro
            </Button>
          </div>
          <div className="rf-cliente-profile__cadastro-grid">
            <ClienteInfoTable
              rows={[
                { label: 'Nome', value: cliente.nome },
                { label: 'Apelido', value: cliente.apelido },
                { label: 'Documento', value: cliente.doc },
                { label: 'Tipo', value: cliente.tipo },
                { label: 'Status', value: cliente.status },
                { label: 'Aniversário', value: cliente.data_aniversario }
              ]}
            />
            <ClienteInfoTable
              rows={[
                { label: 'Telefone', value: cliente.tel },
                { label: 'WhatsApp', value: cliente.whatsapp },
                { label: 'E-mail', value: cliente.email },
                { label: 'Responsável', value: cliente.resp },
                { label: 'Cidade', value: cliente.cidade },
                { label: 'Estado', value: cliente.estado }
              ]}
            />
          </div>
        </section>
      )}
    </section>
  );
}
