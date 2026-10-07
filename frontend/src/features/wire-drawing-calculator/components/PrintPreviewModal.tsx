import React, { useState } from 'react';
import { X, Printer, FileText, SlidersHorizontal, Loader2 } from 'lucide-react';
import type { PassData, Statistics, ConsistencyData, PrintRecord } from '../types';
import { WireDrawingPrintReport } from './WireDrawingPrintReport';
import { useApi } from '../../../hooks/useApi';

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  passes: PassData[];
  stats: Statistics | null;
  dies: number[];
  consistency?: ConsistencyData | null;
  docRef?: string;
  onDocRefChange?: (val: string) => void;
  workOrder?: string;
  onWorkOrderChange?: (val: string) => void;
  machineName?: string;
  onMachineNameChange?: (val: string) => void;
  notes?: string;
  onNotesChange?: (val: string) => void;
  operator?: string;
  onPrintCompleted?: () => void;
}

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  isOpen,
  onClose,
  passes,
  stats,
  dies,
  consistency,
  docRef,
  onDocRefChange,
  workOrder: externalWorkOrder,
  onWorkOrderChange,
  machineName: externalMachineName,
  onMachineNameChange,
  notes: externalNotes,
  onNotesChange,
  operator,
  onPrintCompleted,
}) => {
  const { request } = useApi();
  const [internalWorkOrder, setInternalWorkOrder] = useState('WDC-JOB-2026-001');
  const [internalMachineName, setInternalMachineName] = useState('Multi-Wire Drawing Line 01');
  const [internalNotes, setInternalNotes] = useState(
    'Production drafting schedule verified within standard elongation tolerances. No central burst defect risk detected.'
  );
  const [isSaving, setIsSaving] = useState(false);

  const workOrder = externalWorkOrder ?? internalWorkOrder;
  const setWorkOrder = onWorkOrderChange ?? setInternalWorkOrder;
  const machineName = externalMachineName ?? internalMachineName;
  const setMachineName = onMachineNameChange ?? setInternalMachineName;
  const notes = externalNotes ?? internalNotes;
  const setNotes = onNotesChange ?? setInternalNotes;

  const [showConfig, setShowConfig] = useState(false);

  if (!isOpen) return null;

  const handlePrint = async () => {
    setIsSaving(true);
    try {
      const payload = {
        doc_type: 'WIRE_DRAWING_TDS',
        doc_ref: docRef || undefined,
        work_order: workOrder,
        machine_name: machineName,
        material_profile: 'Standard Wire Drawing',
        quality_status: consistency ? `${consistency.qualityRating} (${consistency.stars}★)` : 'VERIFIED',
        notes: notes,
        inlet_size: stats?.startingDie ? stats.startingDie.toFixed(3) : null,
        finish_size: stats?.finalDie ? stats.finalDie.toFixed(3) : null,
        total_passes: passes.length,
        overall_reduction: stats?.overallAreaReduction ? stats.overallAreaReduction.toFixed(2) : null,
        avg_elongation: stats?.avgElongation ? stats.avgElongation.toFixed(2) : null,
        dies: dies,
        passes_data: passes,
      };

      const res = await request<PrintRecord>('/api/history/print-records/', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res && res.doc_ref && onDocRefChange) {
        onDocRefChange(res.doc_ref);
      }
    } catch (err) {
      console.error('Failed to log print record:', err);
    } finally {
      setIsSaving(false);
      window.print();
      onPrintCompleted?.();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-2 sm:p-4 print:hidden">
      <div className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-sm w-full max-w-5xl h-[92vh] flex flex-col shadow-2xl font-mono text-[#e4e4e4]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a] bg-[#141414]">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#e4e4e4]">
              Technical Data Sheet (TDS) — Print Preview
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs border border-[#2a2a2a] bg-[#0a0a0a] hover:bg-[#1a1a1a] rounded-sm text-[#94a3b8] hover:text-[#e4e4e4] transition cursor-pointer"
              title="Configure Document Header"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Job Info</span>
            </button>

            <button
              onClick={handlePrint}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold uppercase border border-blue-500/60 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-sm shadow-xs transition cursor-pointer"
            >
              {isSaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Printer className="h-3.5 w-3.5" />
              )}
              <span>{isSaving ? 'Logging & Printing...' : 'Print / Save PDF'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1 text-[#6b7280] hover:text-[#e4e4e4] hover:bg-[#1f1f1f] rounded-sm transition cursor-pointer"
              title="Close Preview"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Optional Collapsible Job / Metadata Configuration Drawer */}
        {showConfig && (
          <div className="p-3 bg-[#0a0a0a] border-b border-[#2a2a2a] grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs animate-fadeIn">
            <div>
              <label className="text-[10px] text-[#6b7280] uppercase block mb-1">Doc Reference (Auto)</label>
              <input
                type="text"
                value={docRef || 'Auto-generated on print'}
                disabled
                className="w-full bg-[#141414] border border-[#2a2a2a] rounded-sm px-2 py-1 text-xs text-blue-400 font-bold focus:outline-none uppercase font-mono opacity-80 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#6b7280] uppercase block mb-1">Work Order / Batch #</label>
              <input
                type="text"
                value={workOrder}
                onChange={(e) => setWorkOrder(e.target.value)}
                className="w-full bg-[#141414] border border-[#2a2a2a] rounded-sm px-2 py-1 text-xs text-[#e4e4e4] focus:outline-none focus:border-blue-500 uppercase font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#6b7280] uppercase block mb-1">Machine Assignment</label>
              <input
                type="text"
                value={machineName}
                onChange={(e) => setMachineName(e.target.value)}
                className="w-full bg-[#141414] border border-[#2a2a2a] rounded-sm px-2 py-1 text-xs text-[#e4e4e4] focus:outline-none focus:border-blue-500 uppercase font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#6b7280] uppercase block mb-1">Shopfloor Notes & Instructions</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-[#141414] border border-[#2a2a2a] rounded-sm px-2 py-1 text-xs text-[#e4e4e4] focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
          </div>
        )}

        {/* 1:1 Paper Viewport Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#0a0a0a]">
          <div className="max-w-[850px] mx-auto bg-white rounded-xs shadow-2xl overflow-hidden border border-slate-300">
            <WireDrawingPrintReport
              passes={passes}
              stats={stats}
              dies={dies}
              consistency={consistency}
              docRef={docRef}
              workOrder={workOrder}
              machineName={machineName}
              notes={notes}
              operator={operator}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
export default PrintPreviewModal;
