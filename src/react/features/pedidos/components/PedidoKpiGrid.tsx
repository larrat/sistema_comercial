import { motion, type Variants } from 'framer-motion';
import { StatCard } from '../../../shared/ui/StatCard';

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
      className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-2"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants}>
        <StatCard
          label="Total em pedidos"
          value={summary.total}
          description={`${total} filtrados no período`}
          tone="default"
        />
      </motion.div>
      <motion.div variants={itemVariants}>
        <StatCard
          label="Aguardando"
          value={summary.emAbertoCount}
          description={`${fmtCurrency(summary.valorEmAberto)} em aberto`}
          tone={summary.emAbertoCount > 0 ? 'warning' : 'success'}
        />
      </motion.div>
      <motion.div variants={itemVariants}>
        <StatCard
          label="Concluídos"
          value={summary.entreguesCount}
          description="Operação saudável"
          tone="success"
        />
      </motion.div>
      <motion.div variants={itemVariants}>
        <StatCard
          label="Cancelados"
          value={summary.canceladosCount}
          description="Taxa de rejeição"
          tone="danger"
        />
      </motion.div>
    </motion.section>
  );
}
