import { useState } from 'react';
import { motion } from 'framer-motion';
import { GitCompareArrows } from 'lucide-react';
import { calculatePassData, calculateStatistics } from '../utils/calculations';
import { formatNumber } from '../utils/parsing';

interface ComparePanelProps {
  currentDies: number[];
}

const EXAMPLE_B = '2.49 2.14 1.84 1.58 1.36 1.17 1.01 0.87 0.75 0.65 0.56 0.49 0.43 0.38 0.34 0.309';

export default function ComparePanel({ currentDies }: ComparePanelProps) {
  const [enabled, setEnabled] = useState(false);
  const [inputA, setInputA] = useState(currentDies.join(' '));
  const [inputB, setInputB] = useState(EXAMPLE_B);

  if (!enabled) {
    return (
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.6 }} className="wdc-panel">
        <button onClick={() => setEnabled(true)} className="wdc-btn wdc-btn-ghost w-full justify-center text-[#64748B] hover:text-[#94A3B8]">
          <GitCompareArrows className="w-4 h-4" /> Compare Two Schedules
        </button>
      </motion.div>
    );
  }

  const parseDies = (t: string) =>
    t.replace(/[,;\t\n]/g, ' ').split(/\s+/).map(Number).filter((n) => !isNaN(n) && n > 0).sort((a, b) => b - a);

  const diesA = parseDies(inputA);
  const diesB = parseDies(inputB);
  const statsA = calculateStatistics(diesA, calculatePassData(diesA));
  const statsB = calculateStatistics(diesB, calculatePassData(diesB));

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="wdc-panel">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
            <GitCompareArrows className="w-4 h-4 text-violet-400" />
          </div>
          <h3 className="text-[15px] font-semibold text-[#F8FAFC] m-0">Compare Schedules</h3>
        </div>
        <button onClick={() => setEnabled(false)} className="wdc-btn wdc-btn-ghost text-xs">Close</button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-5">
        <div>
          <label className="wdc-label text-xs mb-1.5 block">Schedule A</label>
          <textarea value={inputA} onChange={(e) => setInputA(e.target.value)} className="wdc-textarea h-20 text-[11px]" />
        </div>
        <div>
          <label className="wdc-label text-xs mb-1.5 block">Schedule B</label>
          <textarea value={inputB} onChange={(e) => setInputB(e.target.value)} className="wdc-textarea h-20 text-[11px]" />
        </div>
      </div>

      {diesA.length >= 2 && diesB.length >= 2 && (
        <div className="overflow-x-auto">
          <table className="w-full text-[12px] border-collapse">
            <thead>
              <tr>
                <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-[#475569] uppercase tracking-wider border-b border-white/[0.06]">Metric</th>
                <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-blue-400 uppercase tracking-wider border-b border-white/[0.06]">A</th>
                <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-violet-400 uppercase tracking-wider border-b border-white/[0.06]">B</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Passes', String(statsA.totalPasses), String(statsB.totalPasses)],
                ['Starting Die', formatNumber(statsA.startingDie) + ' mm', formatNumber(statsB.startingDie) + ' mm'],
                ['Final Die', formatNumber(statsA.finalDie) + ' mm', formatNumber(statsB.finalDie) + ' mm'],
                ['Avg Elongation', formatNumber(statsA.avgElongation) + '%', formatNumber(statsB.avgElongation) + '%'],
                ['Max Elongation', formatNumber(statsA.maxElongation) + '%', formatNumber(statsB.maxElongation) + '%'],
                ['Min Elongation', formatNumber(statsA.minElongation) + '%', formatNumber(statsB.minElongation) + '%'],
                ['Overall Reduction', formatNumber(statsA.overallAreaReduction) + '%', formatNumber(statsB.overallAreaReduction) + '%'],
                ['Reduction Ratio', formatNumber(statsA.overallReductionRatio), formatNumber(statsB.overallReductionRatio)],
              ].map(([l, a, b]) => (
                <tr key={l} className="border-b border-white/[0.04]">
                  <td className="px-3 py-2 text-[#64748B]">{l}</td>
                  <td className="px-3 py-2 text-right font-mono text-blue-400">{a}</td>
                  <td className="px-3 py-2 text-right font-mono text-violet-400">{b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}
