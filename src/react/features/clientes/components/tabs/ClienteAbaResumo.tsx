import { ArrowUpRight, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button, LoadingState, ErrorState, EmptyState, Badge } from '../../../../shared/ui';
import { buildPedidosRoute, buildReceberRoute } from '../../../../app/router/wave1Navigation';
import { 
  PedidosTable, 
  FinanceiroTable, 
  SimpleBarsChart, 
  ClienteInfoTable, 
  getRfmLabel, 
  formatDateLong,
  formatPrazoLabel,
  getContaStatus
} from '../ClienteProfileHelpers';

export function ClienteAbaResumo({
  setTab,
  pedidosLoading,
  pedidosError,
  pedidosAbertos,
  navigate,
  contasLoading,
  contasError,
  contasPendentes,
  allPedidos,
  cliente,
  notasLoading,
  notasError,
  ultimaNota
}: any) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
      <div className="flex flex-col gap-6 lg:col-span-2">
        <section className="bg-slate-900 border border-white/5 rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Pedidos em aberto</h3>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-blue-400 hover:text-blue-300" 
              onClick={() => setTab('pedidos')}
              rightIcon={<ArrowUpRight className="w-4 h-4" />}
            >
              Ver todos
            </Button>
          </div>
          {pedidosLoading ? (
            <LoadingState title="Carregando pedidos…" compact />
          ) : pedidosError ? (
            <ErrorState title={pedidosError} compact />
          ) : (
            <PedidosTable
              pedidos={pedidosAbertos.slice(0, 5)}
              emptyTitle="Nenhum pedido aberto para este cliente."
              onOpenPedido={(pedidoId) => navigate(buildPedidosRoute({ pedidoId, view: 'detail' }))}
            />
          )}
        </section>

        <section className="bg-slate-900 border border-white/5 rounded-xl shadow-sm p-6">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-white tracking-tight">Contas a receber</h3>
            <p className="text-sm text-slate-400 mt-1">
              {contasPendentes.length} pendente(s) ·{' '}
              {contasPendentes.filter((conta: any) => getContaStatus(conta) === 'vencida').length} vencida(s)
            </p>
          </div>
          {contasLoading ? (
            <LoadingState title="Carregando contas…" compact />
          ) : contasError ? (
            <ErrorState title={contasError} compact />
          ) : (
            <FinanceiroTable
              contas={contasPendentes.slice(0, 6)}
              emptyTitle="Nenhuma conta pendente para este cliente."
              onOpenConta={(contaId) => navigate(buildReceberRoute({ contaId }))}
            />
          )}
        </section>

        <SimpleBarsChart pedidos={allPedidos} />
      </div>

      <aside className="flex flex-col gap-6">
        <section className="bg-slate-900 border border-white/5 rounded-xl shadow-sm p-6">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-white tracking-tight">Contato</h3>
          </div>
          <ClienteInfoTable
            rows={[
              { label: 'WhatsApp', value: cliente.whatsapp || cliente.tel },
              { label: 'E-mail', value: cliente.email },
              { label: 'Cidade', value: cliente.cidade },
              { label: 'Canal', value: cliente.optin_marketing ? 'Marketing ativo' : null }
            ]}
          />
        </section>

        <section className="bg-slate-900 border border-white/5 rounded-xl shadow-sm p-6">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-white tracking-tight">Comercial</h3>
          </div>
          <ClienteInfoTable
            rows={[
              { label: 'Segmento', value: cliente.seg },
              { label: 'Tabela', value: cliente.tab || 'Padrão' },
              { label: 'Prazo', value: formatPrazoLabel(cliente.prazo) },
              { label: 'Vendedor', value: cliente.rca_nome }
            ]}
          />
        </section>

        <section className="bg-slate-900 border border-white/5 rounded-xl shadow-sm p-6 overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <Zap size={60} strokeWidth={3} className="text-blue-500" />
          </div>
          <div className="mb-4">
            <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              Nexus Intelligence
              <Badge variant="indigo" className="!text-[8px]">IA</Badge>
            </h3>
          </div>
          <div className="flex flex-col gap-4">
            <div className="p-3 bg-white/5 rounded-lg border border-white/5">
              <span className="text-sm font-medium text-slate-400">Score RFM</span>
              <div className="flex items-center justify-between mt-1">
                <span className="text-sm font-bold text-white">{getRfmLabel(cliente.score_rfm).label}</span>
                <Badge variant={getRfmLabel(cliente.score_rfm).tone}>
                  {((cliente.score_rfm?.r || 0) + (cliente.score_rfm?.f || 0) + (cliente.score_rfm?.m || 0)).toFixed(1)}
                </Badge>
              </div>
            </div>
            <div className="p-3 bg-white/5 rounded-lg border border-white/5">
              <span className="text-sm font-medium text-slate-400">Probabilidade de Compra</span>
              <div className="mt-2 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '75%' }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full bg-blue-500" 
                />
              </div>
              <span className="text-[10px] font-bold text-blue-400 mt-1 block text-right">Alta (75%)</span>
            </div>
          </div>
        </section>

        <section className="bg-slate-900 border border-white/5 rounded-xl shadow-sm p-6">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-white tracking-tight">Última nota</h3>
          </div>
          {notasLoading ? (
            <LoadingState title="Carregando nota…" compact />
          ) : notasError ? (
            <ErrorState title={notasError} compact />
          ) : ultimaNota ? (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
              <div className="mb-2 text-sm font-medium text-slate-400">
                {formatDateLong(ultimaNota.data)}
              </div>
              <p className="text-sm font-medium text-amber-200/80 leading-relaxed">{ultimaNota.texto}</p>
            </div>
          ) : (
            <EmptyState title="Nenhuma nota registrada." compact />
          )}
        </section>
      </aside>
    </div>
  );
}
