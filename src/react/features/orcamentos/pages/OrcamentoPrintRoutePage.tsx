import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { useAuthStore } from '../../../app/useAuthStore';
import { fmtBRL } from '../../../shared/lib/formatters';
import { orcamentosApi } from '../services/orcamentosApi';

export function OrcamentoPrintRoutePage() {
  const { id } = useParams();
  const session = useAuthStore(s => s.session);
  const navigate = useNavigate();

  const { data: orcamento, isLoading } = useQuery({
    queryKey: ['orcamento-print', id],
    queryFn: () => orcamentosApi.getOrcamento(session!.access_token, id!),
    enabled: !!id && !!session?.access_token
  });

  // Auto-trigger print when loaded
  useEffect(() => {
    if (orcamento) {
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [orcamento]);

  if (isLoading) return <div className="p-10 text-center font-bold">Carregando Proposta...</div>;
  if (!orcamento) return <div className="p-10 text-center text-red-500">Orçamento não encontrado.</div>;

  // Agrupa itens por ambiente
  const ambientesMap = new Map<string, any[]>();
  (orcamento.itens || []).forEach(i => {
    const key = i.ambiente || 'Geral';
    if (!ambientesMap.has(key)) ambientesMap.set(key, []);
    ambientesMap.get(key)!.push(i);
  });
  const ambientes = Array.from(ambientesMap.entries());

  return (
    <div className="bg-white min-h-screen text-black p-8 font-sans print:p-0">
      {/* Esconde botões de navegação na impressão */}
      <div className="print:hidden mb-8 flex gap-4">
        <button onClick={() => navigate(-1)} className="px-4 py-2 bg-slate-200 rounded font-bold">Voltar</button>
        <button onClick={() => window.print()} className="px-4 py-2 bg-teal-600 text-white rounded font-bold">Imprimir / Salvar PDF</button>
      </div>

      <div className="max-w-4xl mx-auto bg-white">
        
        {/* Cabeçalho */}
        <header className="border-b-2 border-black pb-6 mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter text-slate-900">RSC Reformas</h1>
            <p className="text-sm text-slate-500 uppercase tracking-widest mt-1">Proposta Comercial Chave na Mão</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-lg">{orcamento.titulo}</p>
            <p className="text-slate-600">Cliente: {orcamento.cliente_nome || orcamento.cliente?.nome}</p>
            <p className="text-slate-600 text-sm">Data: {new Date().toLocaleDateString('pt-BR')}</p>
          </div>
        </header>

        {/* Escopo */}
        <div className="mb-12">
          <h2 className="text-xl font-black uppercase mb-4 text-slate-800 border-b pb-2">Escopo da Obra</h2>
          
          <div className="space-y-6">
            {ambientes.map(([amb, itens]) => (
              <div key={amb} className="mb-4">
                <h3 className="font-bold text-lg text-slate-900 mb-2 uppercase bg-slate-100 px-3 py-1">{amb}</h3>
                <ul className="list-disc list-inside space-y-1.5 text-slate-700 ml-2">
                  {itens.map((item, idx) => (
                    <li key={idx} className="text-sm">
                      {item.descricao_servico}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Resumo Financeiro */}
        <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
          <h2 className="text-xl font-black uppercase mb-4 text-slate-800">Resumo do Investimento</h2>
          
          <div className="flex justify-between items-center py-3 border-b border-slate-200">
            <span className="text-slate-600 font-medium">Modelo de Execução</span>
            <span className="font-bold uppercase text-teal-700">Empreitada Global (Chave na Mão)</span>
          </div>
          
          <div className="flex justify-between items-center py-3 border-b border-slate-200">
            <span className="text-slate-600 font-medium">Validade da Proposta</span>
            <span className="font-bold">15 dias</span>
          </div>

          <div className="flex justify-between items-center py-4 mt-2">
            <span className="text-xl font-black uppercase tracking-tight text-slate-900">Preço Final (Material + Mão de Obra)</span>
            <span className="text-3xl font-black text-slate-900">{fmtBRL(orcamento.calculos?.preco_venda_final || 0)}</span>
          </div>
          <p className="text-xs text-slate-500 text-right mt-1">* Os valores acima já incluem todos os impostos, taxas de administração e BDI.</p>
        </div>

        {/* Assinaturas */}
        <div className="mt-24 pt-8 border-t border-slate-300 grid grid-cols-2 gap-12 text-center">
          <div>
            <div className="border-b border-black mb-2 mx-8"></div>
            <p className="font-bold text-slate-800">RSC Reformas</p>
            <p className="text-xs text-slate-500">CNPJ: 00.000.000/0001-00</p>
          </div>
          <div>
            <div className="border-b border-black mb-2 mx-8"></div>
            <p className="font-bold text-slate-800">{orcamento.cliente_nome || orcamento.cliente?.nome || 'Cliente'}</p>
            <p className="text-xs text-slate-500">Contratante</p>
          </div>
        </div>

      </div>
    </div>
  );
}
