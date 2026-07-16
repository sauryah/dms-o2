import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, ArrowRight } from 'lucide-react';

interface DieProgressionProps {
  dies: number[];
  onDiesChange?: (dies: number[]) => void;
}

export default function DieProgression({ dies, onDiesChange }: DieProgressionProps) {
  if (dies.length === 0) return null;

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [hoveredDieIndex, setHoveredDieIndex] = useState<number | null>(null);
  const [hoveredArrowIndex, setHoveredArrowIndex] = useState<number | null>(null);

  const maxDie = dies[0];
  const minDie = dies[dies.length - 1];
  const range = maxDie - minDie;

  const getCircleSize = (d: number) => {
    const minPx = 28;
    const maxPx = 54;
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

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    // Set blank image to let framer-motion or custom styles handle visual drag naturally if needed, 
    // or just let native preview render.
  };

  const handleDragEnter = (targetIdx: number) => {
    if (draggedIndex === null || draggedIndex === targetIdx || !onDiesChange) return;
    
    const updated = [...dies];
    const [movedItem] = updated.splice(draggedIndex, 1);
    updated.splice(targetIdx, 0, movedItem);
    
    setDraggedIndex(targetIdx);
    onDiesChange(updated);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDeleteDie = (index: number) => {
    if (!onDiesChange) return;
    const updated = dies.filter((_, i) => i !== index);
    onDiesChange(updated);
  };

  const handleInsertMidDie = (afterIndex: number) => {
    if (!onDiesChange) return;
    const midVal = Math.round(((dies[afterIndex] + dies[afterIndex + 1]) / 2) * 1000) / 1000;
    const updated = [...dies];
    updated.splice(afterIndex + 1, 0, midVal);
    onDiesChange(updated);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="wdc-panel bg-[#0B1220]/45 border border-slate-900/60 p-6 rounded-2xl relative overflow-hidden"
    >
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-[15px] font-semibold text-[#F8FAFC] m-0">Visual Drafting Path Builder</h3>
          <span className="text-slate-500 text-[10.5px] block mt-1 font-sans">
            Drag die nodes to reorder draft sequences. Hover to delete. Click transitions to insert.
          </span>
        </div>
        <span className="text-[10px] font-mono font-bold text-blue-400 bg-blue-950/20 px-2 py-0.5 border border-blue-900/35 rounded-md">
          {dies.length} passes
        </span>
      </div>

      <div className="flex items-center justify-start flex-wrap gap-y-6 gap-x-2 py-6 overflow-x-auto min-h-[90px] w-full px-2">
        <AnimatePresence>
          {dies.map((d, i) => {
            const size = getCircleSize(d);
            const color = getColor(d);
            const isDragging = draggedIndex === i;

            return (
              <React.Fragment key={`${d}-${i}`}>
                {/* Die Node circle */}
                <motion.div
                  layout
                  draggable
                  onDragStart={(e) => handleDragStart(e, i)}
                  onDragEnter={() => handleDragEnter(i)}
                  onDragOver={handleDragOver}
                  onDragEnd={() => setDraggedIndex(null)}
                  onMouseEnter={() => setHoveredDieIndex(i)}
                  onMouseLeave={() => setHoveredDieIndex(null)}
                  className={`relative flex items-center select-none transition-all duration-200 ${
                    isDragging ? 'opacity-30 scale-95 border-dashed border-2 border-blue-500/50 rounded-full' : ''
                  }`}
                  style={{ cursor: draggedIndex !== null ? 'grabbing' : 'grab' }}
                >
                  <div className="flex flex-col items-center gap-2 group relative">
                    <div
                      className="rounded-full transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_0_15px_rgba(59,130,246,0.25)] flex items-center justify-center font-mono font-semibold"
                      style={{
                        width: size + 20 + 'px',
                        height: size + 20 + 'px',
                        backgroundColor: isDragging ? 'transparent' : `${color}15`,
                        fontSize: Math.max(9, (size + 15) / 5) + 'px',
                        minWidth: '38px',
                        minHeight: '38px',
                        color: color,
                        boxShadow: isDragging ? 'none' : `inset 0 0 10px ${color}20`,
                        border: `1.5px solid ${color}80`,
                      }}
                      title={`Pass ${i + 1}: ${d} mm (Drag to reorder)`}
                    >
                      <span>{d}</span>
                    </div>
                    
                    <span className="text-[9px] font-mono font-bold text-slate-500 group-hover:text-slate-350 transition-colors uppercase tracking-wider">
                      P-{i + 1}
                    </span>

                    {/* Delete button (Root / on hover) */}
                    {hoveredDieIndex === i && dies.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDie(i);
                        }}
                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg border border-rose-700/30 transition cursor-pointer"
                        title="Remove Pass"
                      >
                        <X className="w-2.5 h-2.5 stroke-[3]" />
                      </button>
                    )}
                  </div>
                </motion.div>

                {/* Arrow Connector (with hover-to-insert mechanism) */}
                {i < dies.length - 1 && (
                  <div
                    onMouseEnter={() => setHoveredArrowIndex(i)}
                    onMouseLeave={() => setHoveredArrowIndex(null)}
                    className="flex items-center justify-center w-8 h-10 relative select-none transition-all duration-200"
                  >
                    {hoveredArrowIndex === i ? (
                      <button
                        onClick={() => handleInsertMidDie(i)}
                        className="w-5 h-5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-lg border border-emerald-700/30 transition transform hover:scale-110 cursor-pointer absolute z-10 animate-scaleIn"
                        title={`Insert draft size between ${d} and ${dies[i+1]}`}
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                      </button>
                    ) : (
                      <svg width="24" height="8" viewBox="0 0 24 8" className="text-slate-800 transition-colors duration-200">
                        <line x1="0" y1="4" x2="16" y2="4" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
                        <polygon points="16,1 24,4 16,7" fill="currentColor" opacity="0.25" />
                      </svg>
                    )}
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
