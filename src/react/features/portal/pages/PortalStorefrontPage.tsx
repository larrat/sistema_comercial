import { useState, useDeferredValue } from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, Search, Filter, Star, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getSupabaseConfig } from '../../../app/supabaseConfig';

// O Portal roda "por fora" do ERP, logo ele vai buscar os produtos usando
// uma rota limpa ou usando o service de produtos (adaptado para clientes).
// Aqui faremos uma query direta para produtos ativos.
export function PortalStorefrontPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);

  // Busca os produtos direto da API (apenas ativos e que não são "pais" genéricos)
  const { data: produtos = [], isLoading } = useQuery({
    queryKey: ['portal-produtos'],
    queryFn: async () => {
      const { url, key } = getSupabaseConfig();
      // Em produção, isso bateria numa tabela view ou usaria RLS anônimo/autenticado para clientes
      const res = await fetch(`${url}/rest/v1/produtos?is_active=eq.true&select=id,nome,descricao_padrao,pvv,foto_url,cat,esal,produto_pai_id`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` }
      });
      const data = await res.json();
      
      if (!res.ok || !Array.isArray(data)) return [];

      // Filtra apenas produtos que podem ser vendidos (filhos ou isolados)
      const parentIds = new Set(data.map((p: any) => p.produto_pai_id).filter(Boolean));
      return data.filter((p: any) => !parentIds.has(p.id));
    }
  });

  const filteredProdutos = produtos.filter((p: any) => 
    p.nome.toLowerCase().includes(deferredSearchTerm.toLowerCase()) || 
    (p.cat && p.cat.toLowerCase().includes(deferredSearchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-[100dvh] bg-[#0A0A0B] text-white font-sans selection:bg-cyan-500/30 pb-20">
      {/* HEADER / NAVIGATION */}
      <header className="sticky top-0 z-50 bg-[#0A0A0B]/80 backdrop-blur-2xl border-b border-white/5 pt-12 pb-4 px-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black tracking-tighter text-white">NEXUS</h1>
          <p className="text-[10px] text-cyan-500 font-bold tracking-widest uppercase">B2B Portal</p>
        </div>
        <button className="relative p-3 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
          <ShoppingBag size={20} className="text-slate-300" />
          <span className="absolute top-0 right-0 bg-cyan-500 text-black text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
            0
          </span>
        </button>
      </header>

      {/* HERO SECTION */}
      <section className="px-6 pt-6 pb-4">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 p-8 flex flex-col justify-end min-h-[200px]">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-20 mix-blend-overlay"></div>
          <div className="relative z-10">
            <h2 className="text-3xl font-black text-white mb-2 leading-tight">Nova Coleção<br/>Industrial</h2>
            <button className="bg-white text-black px-5 py-2.5 rounded-full text-sm font-bold flex items-center gap-2 hover:scale-105 transition-transform w-max">
              Explorar <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* SEARCH & FILTERS */}
      <section className="px-6 py-4 sticky top-[88px] z-40 bg-[#0A0A0B]/80 backdrop-blur-xl">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text" 
              placeholder="Buscar produtos..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
            />
          </div>
          <button className="p-3 bg-white/5 border border-white/10 rounded-2xl text-slate-300 hover:bg-white/10 transition-colors shrink-0">
            <Filter size={18} />
          </button>
        </div>
        
        {/* Chips */}
        <div className="flex gap-2 overflow-x-auto mt-4 pb-2 custom-scrollbar hide-scrollbar">
          {['Tudo', 'Workwear', 'Calçados', 'Acessórios', 'EPIs'].map((cat, i) => (
            <button key={cat} className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${i === 0 ? 'bg-cyan-500 text-black' : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white'}`}>
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* PRODUCT GRID */}
      <section className="px-6 py-4">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="animate-pulse bg-white/5 rounded-3xl aspect-[3/4]"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filteredProdutos.map((p: any, idx: number) => (
              <motion.div 
                key={p.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="group relative flex flex-col bg-white/5 border border-white/10 rounded-3xl overflow-hidden hover:bg-white/10 transition-colors cursor-pointer"
              >
                {/* Product Image Placeholder */}
                <div className="aspect-square bg-slate-800 relative overflow-hidden">
                  {p.foto_url ? (
                    <img src={p.foto_url} alt={p.nome} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-600">
                      <ShoppingBag size={32} opacity={0.5} />
                    </div>
                  )}
                  {p.esal <= 0 && (
                     <div className="absolute top-2 left-2 bg-red-500/90 text-white text-[9px] font-black uppercase px-2 py-1 rounded-md backdrop-blur-md">
                       Esgotado
                     </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-4 flex flex-col flex-1">
                  <span className="text-[10px] font-bold text-cyan-500 uppercase tracking-wider mb-1">{p.cat || 'Geral'}</span>
                  <h3 className="text-sm font-bold text-white leading-tight line-clamp-2 flex-1 mb-2">
                    {p.nome}
                  </h3>
                  
                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-base font-black text-white">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.pvv || 0)}
                    </span>
                    <button className="w-8 h-8 rounded-full bg-cyan-500 text-black flex items-center justify-center hover:scale-110 transition-transform">
                      <Plus size={16} strokeWidth={3} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>
      
      {/* BOTTOM TAB NAV (MOBILE) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#0A0A0B]/90 backdrop-blur-2xl border-t border-white/5 pb-safe pt-2 px-6 flex justify-around items-center z-50">
         <button className="flex flex-col items-center gap-1 p-2 text-cyan-500">
           <ShoppingBag size={20} />
           <span className="text-[9px] font-bold">Loja</span>
         </button>
         <button className="flex flex-col items-center gap-1 p-2 text-slate-500 hover:text-white transition-colors">
           <Search size={20} />
           <span className="text-[9px] font-bold">Busca</span>
         </button>
         <button className="flex flex-col items-center gap-1 p-2 text-slate-500 hover:text-white transition-colors">
           <Star size={20} />
           <span className="text-[9px] font-bold">Pedidos</span>
         </button>
      </nav>
    </div>
  );
}

// Para evitar erro no import
const Plus = ({ size = 24, strokeWidth = 2, ...props }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);
