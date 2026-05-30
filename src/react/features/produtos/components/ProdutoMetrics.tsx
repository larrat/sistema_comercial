import type { Produto } from '../../../../types/domain';
import { StatCard } from '../../../shared/ui';
import { motion, type Variants } from 'framer-motion';
import ReactCountUp from 'react-countup';

const CountUp = (ReactCountUp as any).default || ReactCountUp;

const container: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: 'spring' as const, stiffness: 300, damping: 24 }
  }
};

type Props = {
  produtos: Produto[];
};

export function ProdutoMetrics({ produtos }: Props) {
  const comPrecificacao = produtos.filter((p) => (p.mkv ?? 0) > 0).length;
  const categorias = new Set(produtos.map((p) => p.cat).filter(Boolean)).size;

  return (
    <motion.section 
      className="rf-ui-stat-grid--3 rf-produtos-metrics"
      variants={container}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={item} className="rf-card-premium border-white/5 bg-surface-card/40 backdrop-blur-xl flex flex-col gap-1 p-6 transition-all duration-300 hover:scale-[1.02] hover:border-white/10 hover:shadow-teal-500/5 active:scale-[0.99]">
        <span className="text-sm font-medium text-slate-400">Produtos</span>
        <span className="text-3xl font-black text-white">
          <CountUp end={produtos.length} duration={1.5} />
        </span>
      </motion.div>
      <motion.div variants={item} className="rf-card-premium border-white/5 bg-surface-card/40 backdrop-blur-xl flex flex-col gap-1 p-6 transition-all duration-300 hover:scale-[1.02] hover:border-white/10 hover:shadow-teal-500/5 active:scale-[0.99]">
        <span className="text-sm font-medium text-slate-400">Categorias</span>
        <span className="text-3xl font-black text-white">
          <CountUp end={categorias} duration={1.5} />
        </span>
      </motion.div>
      <motion.div variants={item} className="rf-card-premium border-white/5 bg-surface-card/40 backdrop-blur-xl flex flex-col gap-1 p-6 transition-all duration-300 hover:scale-[1.02] hover:border-white/10 hover:shadow-emerald-500/5 active:scale-[0.99]">
        <span className="text-sm font-medium text-slate-400">Com precificação</span>
        <span className="text-3xl font-black text-emerald-400">
          <CountUp end={comPrecificacao} duration={1.5} />
        </span>
      </motion.div>
    </motion.section>
  );
}
