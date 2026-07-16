import { motion } from 'framer-motion';
import { FileSpreadsheet, FileText, FileDown, Copy, Printer } from 'lucide-react';
import type { PassData, Statistics } from '../types';
import { exportCSV, exportExcel, exportPDF, copyResultsToClipboard } from '../utils/export';
import { toast } from 'react-hot-toast';

interface ExportPanelProps {
  passes: PassData[];
  stats: Statistics;
  dies: number[];
}

export default function ExportPanel({ passes, stats, dies }: ExportPanelProps) {
  const handleCopy = async () => {
    await copyResultsToClipboard(passes, stats);
    toast.success('Copied to clipboard');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.45 }}
      className="wdc-panel"
    >
      <h3 className="text-[15px] font-semibold text-[#F8FAFC] m-0 mb-4">Export</h3>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => exportExcel(passes, stats, dies)} className="wdc-btn wdc-btn-primary text-xs">
          <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
        </button>
        <button onClick={() => exportCSV(passes, stats)} className="wdc-btn wdc-btn-secondary text-xs">
          <FileText className="w-3.5 h-3.5" /> CSV
        </button>
        <button onClick={() => exportPDF(passes, stats, dies)} className="wdc-btn wdc-btn-secondary text-xs">
          <FileDown className="w-3.5 h-3.5" /> PDF
        </button>
        <button onClick={handleCopy} className="wdc-btn wdc-btn-ghost text-xs">
          <Copy className="w-3.5 h-3.5" /> Copy
        </button>
        <button onClick={() => window.print()} className="wdc-btn wdc-btn-ghost text-xs">
          <Printer className="w-3.5 h-3.5" /> Print
        </button>
      </div>
    </motion.div>
  );
}
