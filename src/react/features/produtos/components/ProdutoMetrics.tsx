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
      <motion.div variants={item}>
        <StatCard 
          label="Produtos" 
          tone="blue"
          value={<CountUp end={produtos.length} duration={1.5} />} 
        />
      </motion.div>
      <motion.div variants={item}>
        <StatCard 
          label="Categorias" 
          tone="blue"
          value={<CountUp end={categorias} duration={1.5} />} 
        />
      </motion.div>
      <motion.div variants={item}>
        <StatCard 
          label="Com precificação" 
          tone="blue_to_pink"
          value={<CountUp end={comPrecificacao} duration={1.5} />} 
        />
      </motion.div>
    </motion.section>
  );
}
