import { useState } from 'react';
import { motion } from 'framer-motion';
import { ClipboardPaste, Wand2, Eraser, ArrowRight } from 'lucide-react';

interface InputPanelProps {
  onParse: (dies: number[]) => void;
  currentDies: number[];
}

const EXAMPLE = `2.490 2.217 1.974 1.757 1.564 1.392 1.239 1.103 0.982 0.874 0.778 0.693
0.617 0.550 0.490 0.437 0.389 0.347 0.309`;

export default function InputPanel({ onParse, currentDies }: InputPanelProps) {
  const [text, setText] = useState(
    currentDies.length > 0 ? currentDies.join('  ') : ''
  );
  const [error, setError] = useState('');

  const handleParse = () => {
    if (!text.trim()) {
      setError('Enter die diameters to calculate');
      return;
    }
    const cleaned = text
      .replace(/[""]/g, '').replace(/[""]/g, '')
      .replace(/\t/g, ' ').replace(/[,;|]/g, ' ')
      .replace(/\n/g, ' ').replace(/\r/g, '').trim();
    const tokens = cleaned.split(/\s+/).filter((t) => t.length > 0);
    const numbers: number[] = [];
    for (const token of tokens) {
      const num = parseFloat(token);
      if (isNaN(num) || num <= 0) {
        setError(`Invalid value: "${token}"`);
        return;
      }
      numbers.push(Math.round(num * 1000) / 1000);
    }
    if (numbers.length < 2) {
      setError('Need at least 2 die diameters');
      return;
    }
    setError('');
    onParse(numbers);
    setText(numbers.join('  '));
  };

  const handlePaste = async () => {
    try {
      const clipText = await navigator.clipboard.readText();
      setText(clipText);
      setError('');
    } catch { /* clipboard may fail */ }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="wdc-panel"
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <ArrowRight className="w-4 h-4 text-blue-400" />
          </div>
          <h2 className="text-[15px] font-semibold text-[#F8FAFC] m-0">
            Die Schedule Input
          </h2>
        </div>
        <div className="flex gap-1.5">
          <button onClick={handlePaste} className="wdc-btn wdc-btn-ghost text-xs" title="Paste from clipboard">
            <ClipboardPaste className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => { setText(EXAMPLE); setError(''); }} className="wdc-btn wdc-btn-ghost text-xs" title="Load example">
            <Wand2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => { setText(''); setError(''); }} className="wdc-btn wdc-btn-ghost text-xs" title="Clear input">
            <Eraser className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <textarea
        value={text}
        onChange={(e) => { setText(e.target.value); setError(''); }}
        placeholder="Paste die diameters (mm) — spaces, tabs, commas, or Excel paste"
        className="wdc-textarea h-32 mb-3"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleParse();
        }}
      />

      {error && (
        <p className="text-red-400/80 text-xs mb-3 font-medium">{error}</p>
      )}

      <div className="flex items-center justify-between">
        <span className="text-[11px] text-[#475569] font-mono tracking-wide">
          Ctrl+Enter to compute
          {currentDies.length > 0 && <span className="ml-2 text-[#3B82F6]/60">{currentDies.length} dies</span>}
        </span>
        <button onClick={handleParse} className="wdc-btn wdc-btn-primary">
          Calculate
        </button>
      </div>
    </motion.div>
  );
}
