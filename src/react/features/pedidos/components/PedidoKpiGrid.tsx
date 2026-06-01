import { motion, type Variants } from 'framer-motion';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const itemVariants: Variants = {
  hidden: { y: 10, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 300, damping: 30 }
  }
};

function fmtCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

interface PedidoKpiGridProps {
  summary: {
    total: number;
    emAbertoCount: number;
    valorEmAberto: number;
    entreguesCount: number;
    canceladosCount: number;
  };
  total: number;
}

export function PedidoKpiGrid({ summary, total }: PedidoKpiGridProps) {
  return (
    <motion.section 
      className="rf-kpi-grid mb-2"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.article className="rf-bento-item !p-4" variants={itemVariants}>
        <span className="rf-kpi-label">Total em pedidos</span>
        <span className="rf-kpi-value">{summary.total}</span>
        <span className="rf-kpi-sub muted">{total} filtrados no período</span>
      </motion.article>
      <motion.article className="rf-bento-item !p-4" variants={itemVariants}>
        <span className="rf-kpi-label">Aguardando</span>
        <span className={`rf-kpi-value${summary.emAbertoCount > 0 ? ' !text-amber-400' : ' !text-emerald-400'}`}>
          {summary.emAbertoCount}
        </span>
        <span className={`rf-kpi-sub ${summary.emAbertoCount > 0 ? 'warning' : 'success'}`}>
          {fmtCurrency(summary.valorEmAberto)} em aberto
        </span>
      </motion.article>
      <motion.article className="rf-bento-item !p-4" variants={itemVariants}>
        <span className="rf-kpi-label">Concluídos</span>
        <span className="rf-kpi-value !text-emerald-400">{summary.entreguesCount}</span>
        <span className="rf-kpi-sub success">Operação saudável</span>
      </motion.article>
      <motion.article className="rf-bento-item !p-4" variants={itemVariants}>
        <span className="rf-kpi-label">Cancelados</span>
        <span className="rf-kpi-value !text-rose-400">{summary.canceladosCount}</span>
        <span className="rf-kpi-sub muted">Taxa de rejeição</span>
      </motion.article>
    </motion.section>
  );
}
