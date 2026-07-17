import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, MoveHorizontal } from 'lucide-react';

interface DieProgressionProps {
  dies: number[];
  onDiesChange?: (dies: number[]) => void;
}

export default function DieProgression({ dies, onDiesChange }: DieProgressionProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [hoveredDieIndex, setHoveredDieIndex] = useState<number | null>(null);
  const [hoveredArrowIndex, setHoveredArrowIndex] = useState<number | null>(null);

  if (dies.length === 0) return null;

  const getArea = (diameter: number) => Math.PI * Math.pow(diameter / 2, 2);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="wdc-panel bg-[#050913]/90 border border-slate-900 rounded-xl p-6 relative overflow-hidden shadow-2xl"
    >
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-900/60">
        <div>
          <h3 className="text-sm font-semibold text-[#F8FAFC] tracking-tight block">Schematic Drafting Pipeline</h3>
          <span className="text-slate-450 text-xs block mt-1 font-mono">
            Drag to sequence passes • Hover node to delete • Hover taper connector to insert inline die
          </span>
        </div>
        <span className="text-xs font-mono font-bold text-blue-400 bg-blue-950/20 px-2 py-0.5 border border-blue-900/30 rounded-md">
          {dies.length} PASS SCHEDULE
        </span>
      </div>

      <div className="flex items-center justify-start flex-wrap gap-y-6 gap-x-2 py-4 overflow-x-auto w-full px-1">
        <AnimatePresence>
          {dies.map((d, i) => {
            const isDragging = draggedIndex === i;
            const wireRadiusLeft = 14;
            
            // Calculate taper details if there is a next die
            let areaRedPercent = 0;
            let wireRadiusRight = wireRadiusLeft;
            if (i < dies.length - 1) {
              const areaBef = getArea(d);
              const areaAft = getArea(dies[i + 1]);
              areaRedPercent = ((areaBef - areaAft) / areaBef) * 100;
              // Scale right side wire proportional to reduction
              wireRadiusRight = Math.max(4, wireRadiusLeft * (dies[i + 1] / d));
            }

            return (
              <React.Fragment key={`${d}-${i}`}>
                {/* Precision CAD Pass Card */}
                <motion.div
                  layout
                  draggable
                  onDragStart={((e: any) => {
                    setDraggedIndex(i);
                    if (e.dataTransfer) {
                      e.dataTransfer.effectAllowed = 'move';
                    }
                  }) as any}
                  onDragEnter={() => {
                    if (draggedIndex === null || draggedIndex === i || !onDiesChange) return;
                    const updated = [...dies];
                    const [movedItem] = updated.splice(draggedIndex, 1);
                    updated.splice(i, 0, movedItem);
                    setDraggedIndex(i);
                    onDiesChange(updated);
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDragEnd={() => setDraggedIndex(null)}
                  onMouseEnter={() => setHoveredDieIndex(i)}
                  onMouseLeave={() => setHoveredDieIndex(null)}
                  className={`relative select-none transition-all duration-200 w-28 h-16 rounded-lg border bg-slate-950/90 flex flex-col justify-between p-2.5 ${
                    isDragging 
                      ? 'opacity-25 scale-95 border-dashed border-blue-500/50 shadow-none' 
                      : 'border-slate-900 hover:border-slate-800 hover:shadow-[0_4px_20px_rgba(0,0,0,0.4)]'
                  }`}
                  style={{ cursor: draggedIndex !== null ? 'grabbing' : 'grab' }}
                >
                  {/* Card Header: Pass Indicator & Drag handle */}
                  <div className="flex justify-between items-center w-full">
                    <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                      Pass {i + 1}
                    </span>
                    <MoveHorizontal className="h-3 w-3 text-slate-500 opacity-60 group-hover:opacity-100 transition-opacity" />
                  </div>

                  {/* Card Center: Die diameter size */}
                  <div className="text-left">
                    <span className="text-[13px] font-mono font-bold text-[#F8FAFC] block">
                      Ø {d.toFixed(3)}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono block">diameter (mm)</span>
                  </div>

                  {/* Hover Delete Action Button */}
                  {hoveredDieIndex === i && dies.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onDiesChange) onDiesChange(dies.filter((_, idx) => idx !== i));
                      }}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-950/80 hover:bg-rose-900 text-rose-400 hover:text-rose-200 border border-rose-900/40 flex items-center justify-center shadow-lg transition cursor-pointer"
                      title="Remove Pass"
                    >
                      <X className="w-2.5 h-2.5 stroke-[3]" />
                    </button>
                  )}
                </motion.div>

                {/* Cyber Connector showing Tapered Wire & Reduction % */}
                {i < dies.length - 1 && (
                  <div
                    onMouseEnter={() => setHoveredArrowIndex(i)}
                    onMouseLeave={() => setHoveredArrowIndex(null)}
                    className="flex items-center justify-center w-16 h-16 relative select-none transition-all duration-200"
                  >
                    {hoveredArrowIndex === i ? (
                      <button
                        onClick={() => {
                          if (!onDiesChange) return;
                          const midVal = Math.round(((d + dies[i + 1]) / 2) * 1000) / 1000;
                          const updated = [...dies];
                          updated.splice(i + 1, 0, midVal);
                          onDiesChange(updated);
                        }}
                        className="w-5 h-5 rounded-full bg-emerald-950/80 hover:bg-emerald-900 text-emerald-450 border border-emerald-900/40 flex items-center justify-center shadow-lg transition transform hover:scale-110 cursor-pointer absolute z-10 animate-scaleIn"
                        title={`Insert pass size between ${d} and ${dies[i+1]}`}
                      >
                        <Plus className="w-3 h-3 stroke-[3]" />
                      </button>
                    ) : (
                      <svg width="60" height="40" className="opacity-75">
                        <defs>
                          <linearGradient id={`copper-grad-${i}`} x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#b45309" stopOpacity="0.45" />
                            <stop offset="100%" stopColor="#d97706" stopOpacity="0.25" />
                          </linearGradient>
                        </defs>
                        
                        {/* Shaded tapered wire representing physics deformation */}
                        <path 
                          d={`M 0 ${20 - wireRadiusLeft} L 60 ${20 - wireRadiusRight} L 60 ${20 + wireRadiusRight} L 0 ${20 + wireRadiusLeft} Z`} 
                          fill={`url(#copper-grad-${i})`}
                        />
                        
                        {/* Center line with reduction text */}
                        <line x1="0" y1="20" x2="60" y2="20" stroke="rgba(16, 185, 129, 0.15)" strokeWidth="1" strokeDasharray="2 2" />
                        
                        {/* Display Area Reduction % */}
                        <rect x="9" y="11" width="42" height="18" rx="3" fill="#04060b" stroke="rgba(30, 41, 59, 0.6)" strokeWidth="0.75" />
                        <text x="30" y="23" textAnchor="middle" className="fill-emerald-500/80 font-mono text-[10.5px] font-bold">
                          -{areaRedPercent.toFixed(1)}%
                        </text>
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
