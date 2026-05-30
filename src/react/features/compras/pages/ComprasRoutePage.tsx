import { useState } from 'react';
import { ComprasPilotPage } from '../components/ComprasPilotPage';
import { NotasDestinadasPanel } from '../components/NotasDestinadasPanel';
import { useFilialStore } from '../../../app/useFilialStore';
import { useApiContext } from '../../../shared/hooks/useApiContext';
import { PageHeader, Button } from '../../../shared/ui';
import { ShoppingBag, ShieldCheck, Plus, Sparkles } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { parseNFXML } from '../lib/xmlInvoiceParser';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { savePedidoCompra, vincularNotaImportada } from '../services/comprasApi';
import { toast } from 'sonner';

export function ComprasRoutePage() {
  const { resolve } = useApiContext();
  const { filialId } = useFilialStore();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'pedidos' | 'radar'>('pedidos');

  // Carregar produtos para poder fazer o matching prévio antes de renderizar o formulário
  const { data: produtos = [] } = useQuery({
    queryKey: ['produtos', 'compras-route', filialId],
    queryFn: async () => {
      const context = resolve();
      if (!context) throw new Error('API context not ready');
      // Importado dinamicamente para manter isolamento
      const { listProdutos } = await import('../../produtos/services/produtosApi');
      return listProdutos(context);
    },
    enabled: !!filialId
  });

  const handleImportNota = (nota: any) => {
    if (!nota.xml_armazenado) {
      toast.error('Dados XML da Nota Fiscal não localizados na SEFAZ.');
      return;
    }

    try {
      const parsed = parseNFXML(nota.xml_armazenado);
      
      // Algoritmo de matching idêntico ao do Form, executado previamente
      const parentIds = new Set(produtos.map(p => p.produto_pai_id).filter(Boolean));
      const sellable = produtos.filter(p => !parentIds.has(p.id));

      const matchedItens = parsed.itens.map(imported => {
        // Match por SKU ou Código de barras
        let matched = sellable.find(p => 
          (p.sku && p.sku.toLowerCase() === imported.cProd.toLowerCase()) ||
          (imported.cEAN && p.codigo_barras && p.codigo_barras === imported.cEAN) ||
          (p.codigo_fornecedor && p.codigo_fornecedor.toLowerCase() === imported.cProd.toLowerCase())
        );

        // Match por Nome
        if (!matched) {
          matched = sellable.find(p => 
            p.nome.toLowerCase().trim() === imported.xProd.toLowerCase().trim()
          );
        }

        return {
          produto_id: matched ? matched.id : '',
          nome: matched ? matched.nome : imported.xProd,
          qty: imported.qCom,
          custo_unitario: imported.vUnCom,
          total_item: imported.qCom * imported.vUnCom,
          isXmlMatched: !!matched,
          xmlSku: imported.cProd,
          foto_url: matched?.foto_url || null,
          un: matched?.un || ''
        };
      });

      const prefill = {
        fornecedor: parsed.nomeEmitente,
        itens: matchedItens,
        notaId: nota.id
      };

      navigate('/app/compras/novo', { state: { prefillData: prefill } });
      toast.info('Dados da NF-e carregados! Revise e associe produtos não vinculados antes de salvar.');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erro ao decodificar a nota fiscal destinada.');
    }
  };

  return (
    <main className="flex-1 w-full flex flex-col gap-8 animate-in fade-in duration-500">
      
      {/* Centralized Page Header */}
      <PageHeader
        kicker="Suprimentos"
        title="Suprimentos & Compras"
        description="Gerencie pedidos de compra, entrada de mercadorias no estoque e manifestação de notas SEFAZ."
        actions={
          <div className="flex gap-3">
            <Link to="/app/compras/sugestoes">
              <Button variant="secondary" className="!rounded-xl" leftIcon={<Sparkles className="w-4 h-4 text-teal-400" />}>
                Stock AI
              </Button>
            </Link>
            <Button 
              variant="primary" 
              className="!rounded-xl" 
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => navigate('/app/compras/novo')}
            >
              Novo pedido
            </Button>
          </div>
        }
      />

      {/* Tabs Navigation Bar */}
      <div className="flex border-b border-white/5 p-1 bg-white/[0.01] rounded-2xl max-w-md">
        <button
          onClick={() => setActiveTab('pedidos')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl transition-all duration-300 ${ activeTab === 'pedidos' ? 'bg-[#0f172a] border border-white/10 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5' } text-sm font-medium text-slate-400`}
        >
          <ShoppingBag size={14} />
          Pedidos de Compra
        </button>
        <button
          onClick={() => setActiveTab('radar')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl transition-all duration-300 ${ activeTab === 'radar' ? 'bg-[#0f172a] border border-white/10 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5' } text-sm font-medium text-slate-400`}
        >
          <ShieldCheck size={14} className="text-teal-400" />
          Radar SEFAZ
        </button>
      </div>

      {/* Conditional Content */}
      <div className="flex-1 w-full">
        {activeTab === 'pedidos' ? (
          <ComprasPilotPage hideHeader={true} />
        ) : (
          <NotasDestinadasPanel onImport={handleImportNota} />
        )}
      </div>


    </main>
  );
}
