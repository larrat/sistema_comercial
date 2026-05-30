import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { CheckCircle2, ShieldCheck, User as UserIcon, FileText } from 'lucide-react';
import { fmtBRL } from '../../../shared/lib/formatters';
import { toast } from 'sonner';

export function PortalPropostaPage() {
  const { orcamentoId } = useParams();
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [isAccepted, setIsAccepted] = useState(false);

  // Busca dados públicos da proposta
  const { data: orcamento, isLoading } = useQuery({
    queryKey: ['portal-proposta', orcamentoId],
    queryFn: async () => {
      const { url, key } = getSupabaseConfig();
      const res = await fetch(`${url}/rest/v1/orcamentos_obra?id=eq.${orcamentoId}&select=*,cliente:clientes(nome)`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` }
      });
      if (!res.ok) throw new Error('Proposta não encontrada');
      const data = await res.json();
      return data[0];
    },
    enabled: !!orcamentoId
  });

  const assinarMutation = useMutation({
    mutationFn: async () => {
      if (!nome || !cpf) throw new Error('Preencha seu nome e CPF/CNPJ para assinar');
      const { url, key } = getSupabaseConfig();
      
      // 1. Registra o aceite digital
      const aceiteRes = await fetch(`${url}/rest/v1/orcamentos_aceite_digital`, {
        method: 'POST',
        headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orcamento_id: orcamentoId,
          nome_assinante: nome,
          cpf_cnpj: cpf
        })
      });
      if (!aceiteRes.ok) throw new Error('Erro ao registrar assinatura');

      // 2. Muda o status do orçamento para "aprovado"
      // Obs: A trigger no banco (ou a lógica na API principal) pode criar o contrato depois
      // Como estamos no portal público, mudamos o status para dar o start.
      const updateRes = await fetch(`${url}/rest/v1/orcamentos_obra?id=eq.${orcamentoId}`, {
        method: 'PATCH',
        headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'aprovado' })
      });
      if (!updateRes.ok) throw new Error('Erro ao atualizar proposta');
    },
    onSuccess: () => {
      setIsAccepted(true);
      toast.success('Proposta assinada e aprovada com sucesso!');
    },
    onError: (err: any) => {
      toast.error(err.message);
    }
  });

  if (isLoading) {
    return <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center text-teal-500 font-black animate-pulse">Carregando Proposta...</div>;
  }

  if (!orcamento) {
    return <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center text-red-500 font-bold">Proposta indisponível ou inexistente.</div>;
  }

  // Agrupa itens por ambiente
  const ambientesMap = new Map<string, any[]>();
  (orcamento.itens || []).forEach((i: any) => {
    const key = i.ambiente || 'Geral';
    if (!ambientesMap.has(key)) ambientesMap.set(key, []);
    ambientesMap.get(key)!.push(i);
  });
  const ambientes = Array.from(ambientesMap.entries());

  if (isAccepted || orcamento.status === 'aprovado') {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-slate-900/40 border border-white/5 p-10 rounded-3xl">
          <CheckCircle2 size={64} className="text-emerald-500 mx-auto mb-6" />
          <h1 className="text-3xl font-black text-white uppercase tracking-tight mb-2">Proposta Aprovada!</h1>
          <p className="text-slate-400 mb-8 leading-relaxed">
            Seu aceite digital foi registrado com sucesso. A equipe da RSC Reformas já foi notificada e entrará em contato para os próximos passos.
          </p>
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm font-bold flex items-center justify-center gap-2">
            <ShieldCheck size={18} /> Aceite Eletrônico Validado
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white font-sans selection:bg-teal-500/30 py-12 px-6">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-teal-500 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-500/20">
            <FileText size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tight">{orcamento.titulo}</h1>
          <p className="text-slate-400">Cliente: {orcamento.cliente_nome || orcamento.cliente?.nome}</p>
        </div>

        {/* Detalhes da Proposta */}
        <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-8 space-y-8">
          <div>
            <h2 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-4">Escopo do Serviço (Chave na Mão)</h2>
            <div className="space-y-6">
              {ambientes.map(([amb, itens]) => (
                <div key={amb}>
                  <h3 className="text-teal-400 font-bold mb-2 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                    {amb}
                  </h3>
                  <ul className="space-y-2 ml-4">
                    {itens.map((item: any, idx: number) => (
                      <li key={idx} className="text-slate-300 text-sm leading-relaxed border-l-2 border-white/10 pl-3">
                        {item.descricao_servico}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-white/10 pt-6">
            <div className="flex justify-between items-end bg-teal-500/10 border border-teal-500/20 p-6 rounded-2xl">
              <div>
                <span className="block mb-1 text-sm font-medium text-slate-400">Investimento Final Estimado</span>
                <span className="text-xs text-teal-400/70 font-medium">Material + Mão de Obra Inclusos</span>
              </div>
              <span className="text-3xl font-black text-teal-400">{fmtBRL(orcamento.calculos?.preco_venda_final || 0)}</span>
            </div>
          </div>
        </div>

        {/* Assinatura */}
        <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-8">
          <h2 className="text-xl font-black text-white uppercase tracking-tight mb-2">Aprovação Eletrônica</h2>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            Ao assinar digitalmente, você concorda com o escopo e os valores apresentados acima. Este registro possui validade de aceite comercial.
          </p>

          <div className="space-y-4 mb-6">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-400">Nome Completo</label>
              <div className="relative">
                <UserIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input 
                  type="text" 
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white focus:border-teal-500/50 outline-none transition-colors"
                  placeholder="Digite seu nome completo"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-400">CPF ou CNPJ</label>
              <input 
                type="text" 
                value={cpf}
                onChange={e => setCpf(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-teal-500/50 outline-none transition-colors"
                placeholder="000.000.000-00"
              />
            </div>
          </div>

          <button 
            onClick={() => assinarMutation.mutate()}
            disabled={assinarMutation.isPending || !nome || !cpf}
            className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-black uppercase tracking-wider py-4 rounded-xl hover:shadow-lg hover:shadow-teal-500/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {assinarMutation.isPending ? 'Registrando...' : 'Eu aceito e aprovo esta Proposta'}
          </button>
        </div>

      </div>
    </div>
  );
}
