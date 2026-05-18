import { useState, useDeferredValue } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Search, Filter, Star, ChevronRight, X, Plus, Minus, Trash2, CheckCircle2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { toast } from 'sonner';

type CartItem = {
  id: string;
  nome: string;
  un: string;
  qty: number;
  preco: number;
  custo: number;
  sku?: string;
  esal: number;
};

export function PortalStorefrontPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  // Checkout Form State
  const [cliName, setCliName] = useState('');
  const [cliPhone, setCliPhone] = useState('');
  const [cliAddress, setCliAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<{ num: number } | null>(null);

  // Fetch active products
  const { data: produtos = [], isLoading } = useQuery({
    queryKey: ['portal-produtos'],
    queryFn: async () => {
      const { url, key } = getSupabaseConfig();
      const res = await fetch(`${url}/rest/v1/produtos?is_active=eq.true&select=id,nome,descricao_padrao,pvv,custo,foto_url,cat,esal,sku,produto_pai_id`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` }
      });
      const data = await res.json();
      if (!res.ok || !Array.isArray(data)) return [];
      
      const parentIds = new Set(data.map((p: any) => p.produto_pai_id).filter(Boolean));
      return data.filter((p: any) => !parentIds.has(p.id));
    }
  });

  const filteredProdutos = produtos.filter((p: any) => 
    p.nome.toLowerCase().includes(deferredSearchTerm.toLowerCase()) || 
    (p.cat && p.cat.toLowerCase().includes(deferredSearchTerm.toLowerCase()))
  );

  // Cart Actions
  const addToCart = (prod: any) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === prod.id);
      if (existing) {
        if (existing.qty >= prod.esal) {
          toast.error(`Quantidade máxima em estoque atingida (${prod.esal} un).`);
          return prev;
        }
        toast.success(`Adicionado mais um "${prod.nome}" ao carrinho!`);
        return prev.map(item => item.id === prod.id ? { ...item, qty: item.qty + 1 } : item);
      }
      toast.success(`"${prod.nome}" adicionado ao carrinho!`);
      return [...prev, {
        id: prod.id,
        nome: prod.nome,
        un: prod.un || 'un',
        qty: 1,
        preco: prod.pvv || 0,
        custo: prod.custo || 0,
        sku: prod.sku,
        esal: prod.esal || 0
      }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const nextQty = item.qty + delta;
        if (nextQty > item.esal) {
          toast.error(`Apenas ${item.esal} un disponíveis no estoque.`);
          return item;
        }
        return nextQty > 0 ? { ...item, qty: nextQty } : item;
      }
      return item;
    }).filter(item => item.qty > 0));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
    toast.info('Item removido do carrinho.');
  };

  const cartTotal = cart.reduce((acc, item) => acc + (item.preco * item.qty), 0);
  const cartItemsCount = cart.reduce((acc, item) => acc + item.qty, 0);

  // Submit Order (Checkout)
  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cliName.trim() || !cliPhone.trim()) {
      toast.error('Por favor, preencha seu nome e telefone/whatsapp.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { url, key } = getSupabaseConfig();

      // 1. Obter uma filial_id válida
      const resFiliais = await fetch(`${url}/rest/v1/filiais?limit=1`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` }
      });
      const filiais = await resFiliais.json();
      const filialId = filiais[0]?.id;
      if (!filialId) throw new Error('Nenhuma filial configurada no sistema.');

      // 2. Obter o próximo número de pedido
      const resLast = await fetch(`${url}/rest/v1/pedidos?filial_id=eq.${filialId}&select=num&order=num.desc&limit=1`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` }
      });
      const lastOrder = await resLast.json();
      const nextNum = Array.isArray(lastOrder) && lastOrder[0]?.num ? Number(lastOrder[0].num) + 1 : 1;

      // 3. Preparar itens do pedido
      const orderItens = cart.map((item, idx) => ({
        linha: idx + 1,
        prodId: item.id,
        nome: item.nome,
        un: item.un,
        qty: item.qty,
        preco: item.preco,
        custo: item.custo,
        orig: 'portal',
        sku: item.sku
      }));

      const orderId = crypto.randomUUID();

      // 4. Salvar pedido no Supabase
      const resSave = await fetch(`${url}/rest/v1/pedidos`, {
        method: 'POST',
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation'
        },
        body: JSON.stringify({
          id: orderId,
          filial_id: filialId,
          num: nextNum,
          cli: cliName.toUpperCase(),
          cliente_id: null,
          rca_id: null,
          rca_nome: null,
          data: new Date().toISOString().slice(0, 10),
          status: 'emaberto',
          pgto: 'pix',
          prazo: 'imediato',
          tipo: 'varejo',
          obs: `Pedido feito pelo Portal do Cliente.\nWhatsApp: ${cliPhone}\nEndereço: ${cliAddress || 'Retirada na loja'}`,
          itens: JSON.stringify(orderItens),
          total: cartTotal,
          origem_venda: 'portal',
          venda_fechada: false
        })
      });

      if (!resSave.ok) throw new Error('Erro ao processar pedido no servidor.');

      setOrderSuccess({ num: nextNum });
      setCart([]);
      setIsCartOpen(false);
      setCliName('');
      setCliPhone('');
      setCliAddress('');
      toast.success('Pedido enviado com sucesso!');
    } catch (err: any) {
      toast.error(err.message || 'Falha ao salvar pedido. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#0A0A0B] text-white font-sans selection:bg-cyan-500/30 pb-20 relative overflow-x-hidden">
      {/* HEADER / NAVIGATION */}
      <header className="sticky top-0 z-40 bg-[#0A0A0B]/80 backdrop-blur-2xl border-b border-white/5 pt-12 pb-4 px-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black tracking-tighter text-white">NEXUS</h1>
          <p className="text-[10px] text-cyan-500 font-bold tracking-widest uppercase">B2B Portal</p>
        </div>
        <button 
          onClick={() => setIsCartOpen(true)}
          className="relative p-3 bg-white/5 rounded-full hover:bg-white/10 transition-colors"
        >
          <ShoppingBag size={20} className="text-slate-300" />
          {cartItemsCount > 0 && (
            <motion.span 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 bg-cyan-500 text-black text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center"
            >
              {cartItemsCount}
            </motion.span>
          )}
        </button>
      </header>

      {/* HERO SECTION */}
      <section className="px-6 pt-6 pb-4">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 p-8 flex flex-col justify-end min-h-[200px]">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-20 mix-blend-overlay"></div>
          <div className="relative z-10">
            <h2 className="text-3xl font-black text-white mb-2 leading-tight">Nova Coleção<br/>Industrial</h2>
            <p className="text-slate-400 text-xs mb-4 max-w-[200px]">Equipamentos e vestuário de alta performance direto da fábrica.</p>
          </div>
        </div>
      </section>

      {/* SEARCH & FILTERS */}
      <section className="px-6 py-4 sticky top-[88px] z-30 bg-[#0A0A0B]/80 backdrop-blur-xl">
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
                  {(!p.esal || p.esal <= 0) && (
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
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (p.esal > 0) addToCart(p);
                      }}
                      disabled={!p.esal || p.esal <= 0}
                      className="w-8 h-8 rounded-full bg-cyan-500 text-black flex items-center justify-center hover:scale-110 disabled:bg-white/10 disabled:text-slate-500 disabled:scale-100 transition-all"
                    >
                      <Plus size={16} strokeWidth={3} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>
      
      {/* SHOPPING CART DRAWER */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            {/* Drawer */}
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-[#0D0D11] border-l border-white/5 z-50 p-6 flex flex-col shadow-2xl overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="text-cyan-500" size={24} />
                  <h2 className="text-xl font-black">Sua Sacola</h2>
                </div>
                <button 
                  onClick={() => setIsCartOpen(false)}
                  className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Items List */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {cart.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-center gap-2">
                    <ShoppingBag size={48} strokeWidth={1} />
                    <p className="text-sm font-bold">Nenhum item adicionado.</p>
                    <p className="text-xs max-w-[200px]">Adicione produtos da vitrine para fechar seu pedido.</p>
                  </div>
                ) : (
                  cart.map(item => (
                    <div key={item.id} className="flex gap-4 bg-white/5 border border-white/5 rounded-2xl p-4 items-center">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-white truncate">{item.nome}</h4>
                        {item.sku && <span className="text-[10px] text-slate-500 block">SKU: {item.sku}</span>}
                        <span className="text-sm font-black text-cyan-500 block mt-1">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.preco)}
                        </span>
                      </div>
                      
                      {/* Qty controller */}
                      <div className="flex items-center gap-3 bg-black/40 border border-white/5 rounded-xl px-2 py-1 shrink-0">
                        <button 
                          onClick={() => updateQty(item.id, -1)}
                          className="text-slate-400 hover:text-white p-1"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="text-xs font-bold w-4 text-center">{item.qty}</span>
                        <button 
                          onClick={() => updateQty(item.id, 1)}
                          className="text-slate-400 hover:text-white p-1"
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      <button 
                        onClick={() => removeFromCart(item.id)}
                        className="text-rose-500 hover:text-rose-400 p-2 hover:bg-rose-500/10 rounded-full transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Checkout Form */}
              {cart.length > 0 && (
                <form onSubmit={handleCheckout} className="border-t border-white/5 pt-6 mt-6 space-y-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-slate-400 font-bold">Total do Pedido:</span>
                    <span className="text-2xl font-black text-white">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cartTotal)}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-1">Seu Nome *</label>
                      <input 
                        type="text" 
                        required
                        value={cliName}
                        onChange={e => setCliName(e.target.value)}
                        placeholder="Ex: João da Silva"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-1">WhatsApp / Telefone *</label>
                      <input 
                        type="tel" 
                        required
                        value={cliPhone}
                        onChange={e => setCliPhone(e.target.value)}
                        placeholder="Ex: (11) 99999-9999"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-1">Endereço de Entrega (Opcional)</label>
                      <textarea 
                        value={cliAddress}
                        onChange={e => setCliAddress(e.target.value)}
                        placeholder="Ex: Av. Industrial, 123 - Bloco B. Se em branco, considera-se Retirada na Loja."
                        rows={2}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all resize-none"
                      />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-black py-4 rounded-2xl flex items-center justify-center gap-2 hover:scale-[1.02] disabled:scale-100 disabled:bg-white/15 disabled:text-slate-500 transition-all shadow-lg shadow-cyan-500/10 mt-2 text-sm uppercase tracking-wider"
                  >
                    {isSubmitting ? 'Processando...' : 'Confirmar e Enviar Pedido'}
                  </button>
                </form>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* SUCCESS MODAL */}
      <AnimatePresence>
        {orderSuccess && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOrderSuccess(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0D0D11] border border-white/10 rounded-[2.5rem] p-8 max-w-sm w-full text-center relative z-10 shadow-2xl"
            >
              <div className="w-16 h-16 bg-cyan-500/10 border border-cyan-500/30 rounded-full flex items-center justify-center mx-auto mb-4 text-cyan-500">
                <CheckCircle2 size={36} />
              </div>
              <h3 className="text-xl font-black mb-2 text-white">Pedido Feito!</h3>
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                Seu pedido foi registrado no painel comercial como o número <strong className="text-white text-sm">#{orderSuccess.num}</strong>.<br/>
                Nosso comercial entrará em contato em breve pelo WhatsApp.
              </p>
              <button 
                onClick={() => setOrderSuccess(null)}
                className="w-full bg-white text-black font-black py-3 rounded-2xl hover:bg-slate-200 transition-colors"
              >
                Voltar à Loja
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* BOTTOM TAB NAV (MOBILE) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#0A0A0B]/90 backdrop-blur-2xl border-t border-t-white/5 pb-safe pt-2 px-6 flex justify-around items-center z-40">
         <button className="flex flex-col items-center gap-1 p-2 text-cyan-500">
           <ShoppingBag size={20} />
           <span className="text-[9px] font-bold">Loja</span>
         </button>
         <button className="flex flex-col items-center gap-1 p-2 text-slate-500 hover:text-white transition-colors">
           <Search size={20} />
           <span className="text-[9px] font-bold">Busca</span>
         </button>
         <button 
           onClick={() => setIsCartOpen(true)}
           className="flex flex-col items-center gap-1 p-2 text-slate-500 hover:text-white transition-colors relative"
         >
           <ShoppingBag size={20} />
           {cartItemsCount > 0 && (
             <span className="absolute top-1.5 right-3 bg-cyan-500 text-black text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center">
               {cartItemsCount}
             </span>
           )}
           <span className="text-[9px] font-bold">Carrinho</span>
         </button>
      </nav>
    </div>
  );
}

