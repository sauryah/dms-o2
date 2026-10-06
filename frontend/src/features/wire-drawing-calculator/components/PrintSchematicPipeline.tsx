import React from 'react';
import type { PassData } from '../types';

interface PrintSchematicPipelineProps {
  dies: number[];
  passes?: PassData[];
}

export const PrintSchematicPipeline: React.FC<PrintSchematicPipelineProps> = ({
  dies,
  passes = [],
}) => {
  if (dies.length === 0) return null;

  const maxDiameter = Math.max(...dies, 1);

  // Chunk passes into rows of 6 for clean A4/Letter multi-row wrapping
  const CHUNK_SIZE = 6;
  const totalSteps = dies.length - 1;
  const numRows = Math.ceil(Math.max(totalSteps, 1) / CHUNK_SIZE);

  return (
    <div className="bg-white border border-slate-300 rounded-sm p-4 font-mono print:border-slate-400 space-y-4">
      <div className="flex justify-between items-center pb-2 border-b border-slate-200">
        <div>
          <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
            02. Schematic Drafting Pipeline
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            Sequential cross-section wire reduction and deformation taper through tungsten carbide dies
          </span>
        </div>
        <span className="text-[11px] font-bold text-slate-800 bg-slate-100 border border-slate-300 px-2 py-0.5 rounded">
          {dies.length} STATIONS • {totalSteps} DRAFT PASSES
        </span>
      </div>

      <div className="space-y-4">
        {Array.from({ length: numRows }).map((_, rowIndex) => {
          const startIndex = rowIndex * CHUNK_SIZE;
          const endIndex = Math.min(startIndex + CHUNK_SIZE, dies.length - 1);
          const rowDies = dies.slice(startIndex, endIndex + 1);

          return (
            <div key={rowIndex} className="relative">
              {/* Row header indicator if multi-row */}
              {numRows > 1 && (
                <div className="text-[10px] text-slate-500 font-semibold mb-1.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 inline-block" />
                  <span>DRAFTING STAGE {rowIndex + 1} (PASSES {startIndex + 1} – {endIndex + 1})</span>
                </div>
              )}

              <div className="flex items-center flex-wrap gap-y-3 gap-x-1.5 justify-start">
                {rowDies.map((diameter, idxInRow) => {
                  const globalDieIdx = startIndex + idxInRow;
                  const isLastOverall = globalDieIdx === dies.length - 1;
                  const passData = passes[globalDieIdx];

                  // Calculate proportional wire thickness
                  const normRadiusLeft = Math.max(3, Math.min(14, (diameter / maxDiameter) * 14));
                  const nextDie = globalDieIdx < dies.length - 1 ? dies[globalDieIdx + 1] : diameter;
                  const normRadiusRight = Math.max(3, Math.min(14, (nextDie / maxDiameter) * 14));

                  // Pass reduction percentages
                  const areaReduction = passData
                    ? passData.areaReduction
                    : globalDieIdx < dies.length - 1
                    ? ((Math.pow(diameter, 2) - Math.pow(nextDie, 2)) / Math.pow(diameter, 2)) * 100
                    : 0;

                  const elongation = passData
                    ? passData.elongation
                    : globalDieIdx < dies.length - 1
                    ? ((Math.pow(diameter, 2) / Math.pow(nextDie, 2)) - 1) * 100
                    : 0;

                  return (
                    <React.Fragment key={globalDieIdx}>
                      {/* Precision Die Station Card */}
                      <div className="border border-slate-300 bg-slate-50/80 rounded-sm p-2 w-[104px] flex flex-col justify-between shadow-xs print:border-slate-400">
                        <div className="flex justify-between items-center border-b border-slate-200 pb-1 mb-1">
                          <span className="text-[9px] font-bold text-slate-500 uppercase">
                            {globalDieIdx === 0 ? 'START' : isLastOverall ? 'FINISH' : `STATION ${globalDieIdx + 1}`}
                          </span>
                          <span className="text-[8.5px] px-1 py-0.2 bg-slate-200 text-slate-700 rounded font-bold">
                            #{globalDieIdx + 1}
                          </span>
                        </div>

                        <div>
                          <span className="text-[12px] font-bold text-slate-900 block leading-tight">
                            Ø {diameter.toFixed(3)}
                          </span>
                          <span className="text-[9px] text-slate-500 font-mono block">mm diameter</span>
                        </div>
                      </div>

                      {/* Inter-Die Connecting Wire & Reduction Metrics */}
                      {!isLastOverall && idxInRow < rowDies.length - 1 && (
                        <div className="flex items-center justify-center w-[58px] h-12 relative select-none">
                          <svg width="58" height="48" className="overflow-visible">
                            {/* Shaded tapered wire representing deformation */}
                            <path
                              d={`M 0 ${24 - normRadiusLeft} L 58 ${24 - normRadiusRight} L 58 ${24 + normRadiusRight} L 0 ${24 + normRadiusLeft} Z`}
                              fill="#fed7aa"
                              stroke="#ea580c"
                              strokeWidth="0.75"
                              opacity={0.8}
                            />

                            {/* Center centerline */}
                            <line
                              x1="0"
                              y1="24"
                              x2="58"
                              y2="24"
                              stroke="#c2410c"
                              strokeWidth="0.5"
                              strokeDasharray="2 2"
                            />

                            {/* Metrics pill */}
                            <rect
                              x="5"
                              y="7"
                              width="48"
                              height="34"
                              rx="2"
                              fill="#ffffff"
                              stroke="#94a3b8"
                              strokeWidth="0.75"
                            />
                            <text
                              x="29"
                              y="19"
                              textAnchor="middle"
                              fontSize="8.5"
                              fontWeight="700"
                              fill="#047857"
                            >
                              -{areaReduction.toFixed(1)}%
                            </text>
                            <line x1="10" y1="23" x2="48" y2="23" stroke="#e2e8f0" strokeWidth="0.5" />
                            <text
                              x="29"
                              y="34"
                              textAnchor="middle"
                              fontSize="8.5"
                              fontWeight="700"
                              fill="#b45309"
                            >
                              +{elongation.toFixed(1)}%
                            </text>
                          </svg>
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default PrintSchematicPipeline;
