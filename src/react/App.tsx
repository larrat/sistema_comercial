import { ClienteCard } from './features/clientes/components/ClienteCard';
import type { Cliente } from '../types/domain';

const DEMO_CLIENTES: Cliente[] = [
  {
    id: 'c1',
    nome: 'João Silva',
    apelido: 'Joãozinho',
    status: 'ativo',
    seg: 'Varejo',
    whatsapp: '11999990000',
    tel: '1133330000',
    email: 'joao@empresa.com',
    optin_marketing: true,
    data_aniversario: '1990-04-10'
  },
  {
    id: 'c2',
    nome: 'Maria Souza',
    status: 'prospecto',
    seg: 'Atacado',
    email: 'maria@empresa.com'
  },
  {
    id: 'c3',
    nome: 'Pedro Café',
    status: 'inativo',
    tel: '21988880000'
  }
];

export function App() {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] p-6">
      <h1 className="text-xl font-semibold mb-6" style={{ fontFamily: 'var(--font-sans)' }}>
        Clientes — React
      </h1>
      <div className="flex flex-col gap-3 max-w-sm">
        {DEMO_CLIENTES.map((cliente) => (
          <ClienteCard key={cliente.id} cliente={cliente} />
        ))}
      </div>
    </div>
  );
}
