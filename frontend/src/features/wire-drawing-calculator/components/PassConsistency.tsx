import { motion } from 'framer-motion';
import type { ConsistencyData } from '../types';
import { formatNumber } from '../utils/parsing';

interface PassConsistencyProps {
  consistency: ConsistencyData;
}

export default function PassConsistency({ consistency }: PassConsistencyProps) {
  if (consistency.qualityRating === 'N/A') return null;

  const gaugeWidth = Math.min(100, Math.max(0, 100 - consistency.variation * 10));
  const gaugeColor =
    consistency.stars >= 4 ? '#22C55E' :
    consistency.stars >= 3 ? '#F59E0B' :
    consistency.stars >= 2 ? '#F97316' : '#EF4444';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.4 }}
      className="wdc-panel"
    >
      <h3 className="text-[15px] font-semibold text-[#F8FAFC] m-0 mb-5">Pass Consistency</h3>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-[#64748B]">Average Elongation</span>
          <span className="font-mono font-semibold text-[14px] text-blue-400">
            {formatNumber(consistency.avgElongation)}%
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[13px] text-[#64748B]">Variation (±)</span>
          <span className="font-mono font-semibold text-[14px] text-amber-400">
            {formatNumber(consistency.variation)}%
          </span>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] text-[#64748B]">Score</span>
            <span className="text-[12px] font-medium text-[#94A3B8]">
              {gaugeWidth.toFixed(0)}%
            </span>
          </div>
          <div className="w-full h-2 bg-white/[0.04] rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: gaugeWidth + '%' }}
              transition={{ duration: 0.8, delay: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="h-full rounded-full"
              style={{
                background: 'linear-gradient(90deg, ' + gaugeColor + '99, ' + gaugeColor + ')',
                boxShadow: '0 0 12px ' + gaugeColor + '40',
              }}
            />
          </div>
        </div>

        <div className="text-center pt-3 border-t border-white/[0.06]">
          <div className="text-lg mb-1" style={{ color: gaugeColor }}>
            {'★'.repeat(consistency.stars)}{'☆'.repeat(5 - consistency.stars)}
          </div>
          <div className="text-[13px] font-semibold text-[#94A3B8]">
            {consistency.qualityRating}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
