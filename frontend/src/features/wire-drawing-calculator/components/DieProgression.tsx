import { motion } from 'framer-motion';

interface DieProgressionProps {
  dies: number[];
}

export default function DieProgression({ dies }: DieProgressionProps) {
  if (dies.length === 0) return null;

  const maxDie = dies[0];
  const minDie = dies[dies.length - 1];
  const range = maxDie - minDie;

  const getCircleSize = (d: number) => {
    const minPx = 14;
    const maxPx = 52;
    if (range === 0) return (minPx + maxPx) / 2;
    const ratio = (d - minDie) / range;
    return minPx + ratio * (maxPx - minPx);
  };

  const getColor = (d: number) => {
    if (range === 0) return '#3B82F6';
    const ratio = (d - minDie) / range;
    if (ratio > 0.6) return '#3B82F6';
    if (ratio > 0.3) return '#60A5FA';
    return '#93C5FD';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="wdc-panel"
    >
      <h3 className="text-[15px] font-semibold text-[#F8FAFC] m-0 mb-6">Die Progression</h3>

      <div className="flex items-center justify-center flex-wrap gap-1 py-4 overflow-x-auto">
        {dies.map((d, i) => {
          const size = getCircleSize(d);
          const color = getColor(d);
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.04 * i, duration: 0.3 }}
              className="flex items-center"
            >
              <div className="flex flex-col items-center gap-1.5 group cursor-default">
                <div
                  className="rounded-full transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg flex items-center justify-center font-mono font-semibold"
                  style={{
                    width: size + 'px',
                    height: size + 'px',
                    backgroundColor: color,
                    fontSize: Math.max(8, size / 5) + 'px',
                    minWidth: '14px',
                    minHeight: '14px',
                    color: 'rgba(255,255,255,0.9)',
                    boxShadow: '0 0 12px ' + color + '30, inset 0 1px 0 rgba(255,255,255,0.15)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                  title={'Die ' + (i + 1) + ': ' + d + ' mm'}
                >
                  {size > 26 && <span>{d}</span>}
                </div>
                <span className="text-[9px] font-mono text-[#475569] group-hover:text-[#94A3B8] transition-colors">
                  {d}
                </span>
              </div>
              {i < dies.length - 1 && (
                <div className="flex items-center mx-0.5">
                  <svg width="20" height="8" viewBox="0 0 20 8" className="text-[#1E293B]">
                    <line x1="0" y1="4" x2="14" y2="4" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" />
                    <polygon points="14,1 20,4 14,7" fill="currentColor" opacity="0.5" />
                  </svg>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
