import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Plus, ArrowUpDown, ArrowDownUp, ArrowLeftRight, Undo2, Redo2,
} from 'lucide-react';
import type { PassData } from '../types';
import { formatNumber } from '../utils/parsing';

interface ResultsTableProps {
  passes: PassData[];
  dies: number[];
  onDiesChange: (dies: number[]) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

function elongationBadge(val: number) {
  if (val < 20) return 'bg-blue-500/15 text-blue-400 border-blue-500/20';
  if (val <= 24) return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20';
  if (val <= 28) return 'bg-amber-500/15 text-amber-400 border-amber-500/20';
  return 'bg-red-500/15 text-red-400 border-red-500/20';
}

export default function ResultsTable({
  passes, dies, onDiesChange, canUndo, canRedo, onUndo, onRedo,
}: ResultsTableProps) {
  const [editing, setEditing] = useState<{ pass: number; field: 'fromDie' | 'toDie' } | null>(null);
  const [editVal, setEditVal] = useState('');

  const saveEdit = () => {
    if (!editing) return;
    const v = parseFloat(editVal);
    if (isNaN(v) || v <= 0) { setEditing(null); return; }
    const nd = [...dies];
    const idx = editing.field === 'fromDie' ? editing.pass - 1 : editing.pass;
    if (idx >= 0 && idx < nd.length) nd[idx] = Math.round(v * 1000) / 1000;
    onDiesChange(nd);
    setEditing(null);
  };

  const addDie = () => {
    const last = dies[dies.length - 1];
    onDiesChange([...dies, Math.round(last * 0.9 * 1000) / 1000]);
  };

  const insertDie = (after: number) => {
    const mid = Math.round(((dies[after] + dies[after + 1]) / 2) * 1000) / 1000;
    const nd = [...dies];
    nd.splice(after + 1, 0, mid);
    onDiesChange(nd);
  };

  const headers = ['Pass', 'From', 'To', 'Area Bef', 'Area Aft', 'Red %', 'Elong %', 'Ratio'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="wdc-panel"
    >
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h2 className="text-[15px] font-semibold text-[#F8FAFC] m-0">Results</h2>
        <div className="flex flex-wrap gap-1.5 items-center">
          <button onClick={onUndo} disabled={!canUndo} className="wdc-btn wdc-btn-ghost text-xs px-2" title="Undo (Ctrl+Z)">
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={onRedo} disabled={!canRedo} className="wdc-btn wdc-btn-ghost text-xs px-2" title="Redo (Ctrl+Shift+Z)">
            <Redo2 className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-5 bg-white/[0.06] mx-1" />
          <button onClick={() => onDiesChange([...dies].reverse())} className="wdc-btn wdc-btn-ghost text-xs">
            <ArrowLeftRight className="w-3.5 h-3.5" /> Reverse
          </button>
          <button onClick={() => onDiesChange([...dies].sort((a, b) => a - b))} className="wdc-btn wdc-btn-ghost text-xs">
            <ArrowUpDown className="w-3.5 h-3.5" /> Asc
          </button>
          <button onClick={() => onDiesChange([...dies].sort((a, b) => b - a))} className="wdc-btn wdc-btn-ghost text-xs">
            <ArrowDownUp className="w-3.5 h-3.5" /> Desc
          </button>
          <button onClick={addDie} className="wdc-btn wdc-btn-primary text-xs">
            <Plus className="w-3.5 h-3.5" /> Add Die
          </button>
        </div>
      </div>

      <div className="overflow-x-auto -mx-5 px-5">
        <table className="w-full text-[13px] border-collapse">
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th
                  key={h}
                  className={`px-3 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#64748B] border-b border-white/[0.06] ${
                    i === 0 ? 'text-left' : 'text-right'
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {passes.map((p) => {
              const isEF = editing?.pass === p.pass && editing.field === 'fromDie';
              const isET = editing?.pass === p.pass && editing.field === 'toDie';
              return (
                <tr
                  key={p.pass}
                  className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-3 py-2.5 text-[#94A3B8] font-medium">{p.pass}</td>
                  {(['fromDie', 'toDie'] as const).map((field) => {
                    const val = field === 'fromDie' ? p.fromDie : p.toDie;
                    const isEdit = field === 'fromDie' ? isEF : isET;
                    return (
                      <td
                        key={field}
                        className="px-3 py-2.5 text-right font-mono text-[#F8FAFC] cursor-pointer hover:bg-blue-500/[0.06] rounded transition-colors relative group"
                        onClick={() => { setEditing({ pass: p.pass, field }); setEditVal(String(val)); }}
                      >
                        {isEdit ? (
                          <input
                            autoFocus type="number" step="0.001" value={editVal}
                            onChange={(e) => setEditVal(e.target.value)}
                            onBlur={saveEdit}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditing(null); }}
                            className="w-20 text-right bg-[#0F172A] border border-blue-500/40 rounded-lg px-2 py-1 text-xs font-mono text-[#F8FAFC] outline-none"
                          />
                        ) : (
                          <>
                            {formatNumber(val)}
                            <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] text-blue-400/0 group-hover:text-blue-400/60 transition-colors">✎</span>
                          </>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2.5 text-right font-mono text-[#64748B]">{formatNumber(p.areaBefore)}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-[#64748B]">{formatNumber(p.areaAfter)}</td>
                  <td className="px-3 py-2.5 text-right">
                    <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-mono font-medium border ${elongationBadge(p.areaReduction)}`}>
                      {formatNumber(p.areaReduction)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-mono font-medium border ${elongationBadge(p.elongation)}`}>
                      {formatNumber(p.elongation)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-[#64748B]">{formatNumber(p.reductionRatio)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex gap-1 mt-3 justify-center">
        {dies.map((_, i) => {
          if (i === dies.length - 1) return null;
          return (
            <button key={i} onClick={() => insertDie(i)} className="text-[10px] text-[#334155] hover:text-[#3B82F6] transition-colors p-0.5" title="Insert die">
              <Plus className="w-3 h-3" />
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
