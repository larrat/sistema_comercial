import { useEffect } from 'react';
import { ClienteListView } from './features/clientes/components/ClienteListView';
import { useClienteStore } from './features/clientes/store/useClienteStore';
import type { Cliente } from '../types/domain';

// Dados demo — substituir por chamada real à API quando auth estiver disponível no React
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
  },
  {
    id: 'c4',
    nome: 'Ana Lima',
    status: 'ativo',
    seg: 'Varejo',
    whatsapp: '11988880000',
    optin_marketing: true
  }
];

export function App() {
  const setClientes = useClienteStore((s) => s.setClientes);

  useEffect(() => {
    // Simula carregamento assíncrono
    const t = setTimeout(() => setClientes(DEMO_CLIENTES), 400);
    return () => clearTimeout(t);
  }, [setClientes]);

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] p-6 max-w-2xl mx-auto">
      <ClienteListView
        onNovoCliente={() => alert('Novo cliente — a implementar')}
        onDetalhe={(id) => alert(`Detalhes: ${id}`)}
        onEditar={(id) => alert(`Editar: ${id}`)}
      />
    </div>
  );
}
