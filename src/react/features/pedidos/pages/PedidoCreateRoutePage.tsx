import { useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { PedidoForm } from '../components/PedidoForm';
import { ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';

export function PedidoCreateRoutePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const clienteId = searchParams.get('cliente') || null;

  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-6" data-testid="pedido-create-page">
      <div className="flex items-center gap-4">
        <button
          onClick={handleBack}
          aria-label="Voltar"
          className="flex items-center justify-center w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-black text-white">Novo Pedido</h1>
          <p className="text-sm text-slate-400">Preencha os dados abaixo para iniciar uma nova venda</p>
        </div>
      </div>

      <div className="bg-slate-900 rounded-2xl shadow-xl border border-white/5 p-6">
        <PedidoForm
          prefillClienteId={clienteId}
          initialPedido={null}
          analyticsOrigin="route_page"
          onSaved={(pedido) => {
            toast.success('Pedido criado com sucesso!');
            navigate(`/app/pedidos/${encodeURIComponent(pedido.id)}`);
          }}
          onCancel={() => handleBack()}
        />
      </div>
    </div>
  );
}
