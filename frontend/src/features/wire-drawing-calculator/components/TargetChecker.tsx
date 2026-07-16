import { useState } from 'react';
import { motion } from 'framer-motion';
import { Target, AlertTriangle, CheckCircle } from 'lucide-react';
import type { PassData } from '../types';
import { formatNumber } from '../utils/parsing';

interface TargetCheckerProps {
  passes: PassData[];
}

export default function TargetChecker({ passes }: TargetCheckerProps) {
  const [target, setTarget] = useState(25);
  const [tolerance, setTolerance] = useState(3);

  if (passes.length === 0) return null;

  const outOfTolerance = passes.filter((p) => Math.abs(p.elongation - target) > tolerance);
  const within = passes.length - outOfTolerance.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.5 }}
      className="wdc-panel"
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
          <Target className="w-4 h-4 text-blue-400" />
        </div>
        <h3 className="text-[15px] font-semibold text-[#F8FAFC] m-0">Target Checker</h3>
      </div>

      <div className="flex gap-4 mb-5 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="wdc-label text-xs">Target</label>
          <input
            type="number" value={target} step="0.5"
            onChange={(e) => setTarget(parseFloat(e.target.value) || 0)}
            className="wdc-input w-20 text-center font-mono text-sm"
          />
          <span className="text-xs text-[#475569]">%</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="wdc-label text-xs">Tolerance ±</label>
          <input
            type="number" value={tolerance} step="0.5"
            onChange={(e) => setTolerance(parseFloat(e.target.value) || 0)}
            className="wdc-input w-20 text-center font-mono text-sm"
          />
          <span className="text-xs text-[#475569]">%</span>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4 p-3 bg-white/[0.02] rounded-[10px] border border-white/[0.04]">
        <Target className="w-4 h-4 text-blue-400 shrink-0" />
        <span className="text-[13px] text-[#94A3B8]">
          <strong className="text-[#F8FAFC]">{within}</strong> of {passes.length} passes within tolerance
        </span>
      </div>

      {outOfTolerance.length > 0 && (
        <div className="space-y-1.5">
          <h4 className="text-xs font-semibold text-red-400 flex items-center gap-1.5 m-0 uppercase tracking-wider">
            <AlertTriangle className="w-3.5 h-3.5" /> Outside Tolerance
          </h4>
          {outOfTolerance.map((p) => {
            const dev = p.elongation - target;
            return (
              <div key={p.pass} className="flex items-center justify-between text-[12px] py-2 px-3 bg-red-500/[0.05] rounded-[8px] border border-red-500/[0.08]">
                <span className="text-[#94A3B8]">
                  Pass {p.pass}: {formatNumber(p.fromDie)} → {formatNumber(p.toDie)}
                </span>
                <span className={'font-mono font-semibold ' + (dev > 0 ? 'text-red-400' : 'text-blue-400')}>
                  {formatNumber(p.elongation)}% ({dev > 0 ? '+' : ''}{formatNumber(dev)})
                </span>
              </div>
            );
          })}
        </div>
      )}

      {outOfTolerance.length === 0 && (
        <div className="flex items-center gap-2 text-emerald-400 text-[13px]">
          <CheckCircle className="w-4 h-4" /> All passes within tolerance
        </div>
      )}
    </motion.div>
  );
}
