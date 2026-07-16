import { useState } from 'react';
import { motion } from 'framer-motion';
import { Save, Trash2 } from 'lucide-react';
import type { DieSchedule } from '../types';
import { toast } from 'react-hot-toast';

interface SaveLoadProps {
  dies: number[];
  onLoad: (dies: number[]) => void;
}

const STORAGE_KEY = 'wire-draw-schedules';

function getSchedules(): DieSchedule[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}

function saveSchedules(s: DieSchedule[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }

export default function SaveLoad({ dies, onLoad }: SaveLoadProps) {
  const [schedules, setSchedules] = useState<DieSchedule[]>(getSchedules);
  const [name, setName] = useState('');

  const handleSave = () => {
    if (dies.length === 0) return;
    const n = name.trim() || 'Schedule ' + new Date().toLocaleDateString();
    const s: DieSchedule = { id: Date.now().toString(), name: n, dies: [...dies], timestamp: Date.now() };
    const u = [...schedules, s];
    setSchedules(u);
    saveSchedules(u);
    setName('');
    toast.success('Saved "' + n + '"');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.5 }}
      className="wdc-panel"
    >
      <h3 className="text-[15px] font-semibold text-[#F8FAFC] m-0 mb-4">Saved Schedules</h3>

      <div className="flex gap-2 mb-4">
        <input
          type="text" value={name} onChange={(e) => setName(e.target.value)}
          placeholder="Name..."
          className="wdc-input flex-1 text-[13px]"
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        />
        <button onClick={handleSave} disabled={dies.length === 0} className="wdc-btn wdc-btn-primary text-xs">
          <Save className="w-3.5 h-3.5" /> Save
        </button>
      </div>

      {schedules.length === 0 ? (
        <p className="text-[12px] text-[#334155] text-center py-4">No saved schedules</p>
      ) : (
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {schedules.map((s) => (
            <div key={s.id} className="flex items-center justify-between p-2.5 bg-white/[0.02] rounded-[8px] border border-white/[0.04] hover:border-white/[0.08] transition-all group">
              <div className="cursor-pointer flex-1 min-w-0" onClick={() => { onLoad(s.dies); toast.success('Loaded "' + s.name + '"'); }}>
                <div className="text-[12px] font-medium text-[#94A3B8] group-hover:text-[#F8FAFC] transition-colors truncate">{s.name}</div>
                <div className="text-[10px] text-[#334155] font-mono">{s.dies.length} dies · {s.dies[0]} → {s.dies[s.dies.length - 1]}</div>
              </div>
              <button onClick={() => { const u = schedules.filter((x) => x.id !== s.id); setSchedules(u); saveSchedules(u); toast.success('Deleted'); }} className="wdc-btn wdc-btn-danger text-xs px-2 py-1">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
