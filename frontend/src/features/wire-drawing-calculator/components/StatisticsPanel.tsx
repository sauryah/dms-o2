import { motion } from 'framer-motion';
import type { Statistics } from '../types';
import { formatNumber } from '../utils/parsing';

interface StatisticsPanelProps {
  stats: Statistics;
}

const ICON_COLORS = [
  'bg-blue-500/15 text-blue-400',
  'bg-slate-500/15 text-slate-400',
  'bg-slate-500/15 text-slate-400',
  'bg-cyan-500/15 text-cyan-400',
  'bg-red-500/15 text-red-400',
  'bg-emerald-500/15 text-emerald-400',
  'bg-cyan-500/15 text-cyan-400',
  'bg-blue-500/15 text-blue-400',
  'bg-violet-500/15 text-violet-400',
];

const ICONS = ['6', '▶', '◼', '↑', '⬆', '⬇', '↓', '◎', '⊗'];

export default function StatisticsPanel({ stats }: StatisticsPanelProps) {
  if (stats.totalPasses === 0) return null;

  const items = [
    { label: 'Total Passes', value: stats.totalPasses.toString() },
    { label: 'Starting Die', value: formatNumber(stats.startingDie) + ' mm' },
    { label: 'Final Die', value: formatNumber(stats.finalDie) + ' mm' },
    { label: 'Avg Elongation', value: formatNumber(stats.avgElongation) + '%' },
    { label: 'Max Elongation', value: formatNumber(stats.maxElongation) + '%' },
    { label: 'Min Elongation', value: formatNumber(stats.minElongation) + '%' },
    { label: 'Avg Area Reduction', value: formatNumber(stats.avgAreaReduction) + '%' },
    { label: 'Overall Reduction', value: formatNumber(stats.overallAreaReduction) + '%' },
    { label: 'Reduction Ratio', value: formatNumber(stats.overallReductionRatio) },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.35 }}
      className="wdc-panel"
    >
      <h3 className="text-[15px] font-semibold text-[#F8FAFC] m-0 mb-5">Statistics</h3>
      <div className="grid grid-cols-3 gap-3">
        {items.map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + i * 0.03, duration: 0.3 }}
            className="bg-white/[0.03] rounded-[12px] p-3 text-center border border-white/[0.04] hover:border-white/[0.08] hover:bg-white/[0.05] transition-all duration-200 group cursor-default"
          >
            <div className={'w-7 h-7 rounded-lg mx-auto mb-2 flex items-center justify-center text-[11px] font-bold ' + ICON_COLORS[i]}>
              {ICONS[i]}
            </div>
            <div className="text-[9px] uppercase tracking-wider text-[#475569] mb-1 font-medium">
              {item.label}
            </div>
            <div className="text-[14px] font-semibold font-mono text-[#F8FAFC] group-hover:text-blue-400 transition-colors">
              {item.value}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
