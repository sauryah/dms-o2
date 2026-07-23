import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Sliders, ArrowRight, Zap, Settings2 } from 'lucide-react';
import {
  generateDieSeriesFromElongation,
  generateDieSeriesFromPasses,
  calculatePassData,
} from '../utils/calculations';
import { formatNumber } from '../utils/parsing';

type Mode = 'target' | 'passes';

interface DieSeriesGeneratorProps {
  onApply: (dies: number[]) => void;
}

export default function DieSeriesGenerator({ onApply }: DieSeriesGeneratorProps) {
  const [mode, setMode] = useState<Mode>('target');
  const [dStart, setDStart] = useState<string>('2.500');
  const [dEnd, setDEnd] = useState<string>('0.309');
  const [elongation, setElongation] = useState<string>('25');
  const [passCount, setPassCount] = useState<string>('10');
  const [showRange, setShowRange] = useState(false);
  const [rangeMin, setRangeMin] = useState<string>('8');
  const [rangeMax, setRangeMax] = useState<string>('30');

  const rMin = parseFloat(rangeMin);
  const rMax = parseFloat(rangeMax);
  const hasRange = showRange && !isNaN(rMin) && !isNaN(rMax) && rMin > 0 && rMax > rMin;

  const generated = useMemo(() => {
    const ds = parseFloat(dStart);
    const de = parseFloat(dEnd);
    const el = parseFloat(elongation);
    const pc = parseInt(passCount, 10);

    if (isNaN(ds) || ds <= 0 || isNaN(el) || el <= 0) return null;

    const rMinArg = hasRange ? rMin : undefined;
    const rMaxArg = hasRange ? rMax : undefined;

    if (mode === 'target') {
      if (isNaN(de) || de <= 0 || de >= ds) return null;
      return generateDieSeriesFromElongation(ds, de, el, rMinArg, rMaxArg);
    } else {
      if (isNaN(pc) || pc <= 0) return null;
      return generateDieSeriesFromPasses(ds, el, pc, rMinArg, rMaxArg);
    }
  }, [dStart, dEnd, elongation, passCount, mode, rangeMin, rangeMax, hasRange]);

  const impossible = hasRange && generated === null && mode === 'target';

  const previewPasses = useMemo(() => {
    if (!generated || generated.length < 2) return [];
    return calculatePassData(generated);
  }, [generated]);

  const avgElongation = useMemo(() => {
    if (previewPasses.length === 0) return 0;
    return previewPasses.reduce((s, p) => s + p.elongation, 0) / previewPasses.length;
  }, [previewPasses]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.5 }}
      className="wdc-panel"
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
          <Zap className="w-4 h-4 text-violet-400" />
        </div>
        <h3 className="text-[15px] font-semibold text-[#F8FAFC] m-0">Die Series Generator</h3>
      </div>

      {/* Mode Tabs */}
      <div className="flex gap-1 mb-5 p-1 bg-[#0F172A] rounded-lg w-fit">
        <button
          onClick={() => setMode('target')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            mode === 'target'
              ? 'bg-violet-600 text-white shadow-sm'
              : 'text-[#64748B] hover:text-[#94A3B8]'
          }`}
        >
          By Target Diameter
        </button>
        <button
          onClick={() => setMode('passes')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            mode === 'passes'
              ? 'bg-violet-600 text-white shadow-sm'
              : 'text-[#64748B] hover:text-[#94A3B8]'
          }`}
        >
          By Pass Count
        </button>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
        <div>
          <label className="block text-[11px] text-[#475569] font-medium mb-1.5 uppercase tracking-wider">
            Start Die (mm)
          </label>
          <input
            type="number"
            step="0.001"
            value={dStart}
            onChange={(e) => setDStart(e.target.value)}
            className="wdc-input w-full font-mono text-sm"
          />
        </div>

        {mode === 'target' ? (
          <div>
            <label className="block text-[11px] text-[#475569] font-medium mb-1.5 uppercase tracking-wider">
              End Die (mm)
            </label>
            <input
              type="number"
              step="0.001"
              value={dEnd}
              onChange={(e) => setDEnd(e.target.value)}
              className="wdc-input w-full font-mono text-sm"
            />
          </div>
        ) : (
          <div>
            <label className="block text-[11px] text-[#475569] font-medium mb-1.5 uppercase tracking-wider">
              Passes
            </label>
            <input
              type="number"
              step="1"
              min="1"
              value={passCount}
              onChange={(e) => setPassCount(e.target.value)}
              className="wdc-input w-full font-mono text-sm"
            />
          </div>
        )}

        <div>
          <label className="block text-[11px] text-[#475569] font-medium mb-1.5 uppercase tracking-wider">
            Elongation %
          </label>
          <input
            type="number"
            step="0.5"
            value={elongation}
            onChange={(e) => setElongation(e.target.value)}
            className="wdc-input w-full font-mono text-sm"
          />
        </div>

        <div className="flex items-end">
          <button
            onClick={() => generated && onApply(generated)}
            disabled={!generated}
            className="wdc-btn wdc-btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-40"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            Apply
          </button>
        </div>
      </div>

      {/* Range Toggle */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setShowRange(!showRange)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all border ${
            showRange
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              : 'bg-transparent border-white/[0.06] text-[#475569] hover:text-[#94A3B8]'
          }`}
        >
          <Settings2 className="w-3 h-3" />
          Final Pass Range
        </button>
        {hasRange && (
          <span className="text-[10px] text-amber-400/70 font-mono">
            {formatNumber(rMin)}% – {formatNumber(rMax)}%
          </span>
        )}
      </div>

      {/* Range Inputs */}
      {showRange && (
        <div className="grid grid-cols-2 gap-3 mb-5 p-3 bg-[#0F172A]/60 rounded-lg border border-amber-500/10">
          <div>
            <label className="block text-[11px] text-amber-500/70 font-medium mb-1.5 uppercase tracking-wider">
              Min Elongation %
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              value={rangeMin}
              onChange={(e) => setRangeMin(e.target.value)}
              className="wdc-input w-full font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-[11px] text-amber-500/70 font-medium mb-1.5 uppercase tracking-wider">
              Max Elongation %
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              value={rangeMax}
              onChange={(e) => setRangeMax(e.target.value)}
              className="wdc-input w-full font-mono text-sm"
            />
          </div>
        </div>
      )}

      {/* Impossible message */}
      {impossible && (
        <p className="text-[12px] text-red-400/80 mb-3 font-medium">
          Cannot reach {formatNumber(parseFloat(dEnd))}mm within {formatNumber(rMin)}%–{formatNumber(rMax)}% range. Widen the range or reduce the start/end gap.
        </p>
      )}

      {/* Results Preview */}
      {generated && generated.length > 1 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[12px] text-[#475569]">
              {generated.length - 1} passes · avg elongation {formatNumber(avgElongation)}%
              {hasRange && (
                <span className="ml-2 text-amber-400/70">
                  (last pass fitted to range)
                </span>
              )}
            </p>
            <p className="text-[11px] text-[#334155] font-mono">
              {generated.map((d) => formatNumber(d)).join(' → ')}
            </p>
          </div>

          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-[12px] border-collapse">
              <thead>
                <tr>
                  {['Pass', 'From', 'To', 'Elong %', 'Red %'].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2.5 text-right first:text-left text-[10px] font-semibold text-[#475569] uppercase tracking-wider border-b border-white/[0.06]"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewPasses.map((p) => {
                  const isFinal = hasRange && p.pass === previewPasses.length;

                  return (
                    <tr key={p.pass} className={`border-b border-white/[0.04] hover:bg-white/[0.02] ${isFinal ? 'bg-amber-500/[0.06]' : ''}`}>
                      <td className="px-3 py-2 text-left text-[#64748B] font-medium">
                        {p.pass}
                        {isFinal && <span className="ml-1 text-[9px] text-amber-400 font-bold">F</span>}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-[#94A3B8]">{formatNumber(p.fromDie)}</td>
                      <td className="px-3 py-2 text-right font-mono text-[#94A3B8]">{formatNumber(p.toDie)}</td>
                      <td className={`px-3 py-2 text-right font-mono font-semibold ${isFinal ? 'text-amber-400' : 'text-violet-400'}`}>
                        {formatNumber(p.elongation)}%
                        {isFinal && hasRange && (
                          <span className="ml-1 text-[9px] font-normal opacity-60">
                            [{formatNumber(rMin)}–{formatNumber(rMax)}]
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-[#64748B]">
                        {formatNumber(p.areaReduction)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => generated && onApply(generated)}
              className="wdc-btn wdc-btn-primary text-xs flex items-center gap-2"
            >
              <Sliders className="w-3.5 h-3.5" />
              Load into Calculator
            </button>
            <span className="text-[11px] text-[#334155]">
              {generated[0]}mm → {generated[generated.length - 1]}mm
            </span>
          </div>
        </div>
      )}

      {generated && generated.length <= 1 && !impossible && (
        <p className="text-[12px] text-amber-500/70">
          Start diameter must be larger than end diameter.
        </p>
      )}
    </motion.div>
  );
}
