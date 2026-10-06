import React from 'react';
import type { PassData, Statistics, ConsistencyData } from '../types';
import { PrintSchematicPipeline } from './PrintSchematicPipeline';
import { PrintPassChart } from './PrintPassChart';

interface WireDrawingPrintReportProps {
  passes: PassData[];
  stats: Statistics | null;
  dies: number[];
  consistency?: ConsistencyData | null;
  workOrder?: string;
  machineName?: string;
  notes?: string;
}

export const WireDrawingPrintReport: React.FC<WireDrawingPrintReportProps> = ({
  passes,
  stats,
  dies,
  consistency,
  workOrder = 'WDC-JOB-2026-001',
  machineName = 'Multi-Wire Drawing Line 01',
  notes = 'Production drafting schedule verified within standard elongation tolerances. No central burst risk detected.',
}) => {
  if (dies.length === 0 || !stats) return null;

  const dateStr = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timeStr = new Date().toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Calculate min/max reduction for summary
  const reductions = passes.map((p) => p.areaReduction);
  const elongations = passes.map((p) => p.elongation);
  const minRed = reductions.length > 0 ? Math.min(...reductions) : 0;
  const maxRed = reductions.length > 0 ? Math.max(...reductions) : 0;

  return (
    <div className="bg-white text-slate-900 p-6 max-w-[900px] mx-auto font-mono text-[11px] leading-normal print:p-2 print:max-w-none print:w-full select-text">
      {/* =========================================================================
          DOCUMENT HEADER BLOCK (ISO / DIN Standard)
          ========================================================================= */}
      <div className="border-b-2 border-slate-900 pb-3 mb-4">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-slate-900 text-white px-2 py-0.5 text-xs font-bold tracking-wider rounded-xs">
                DMS-O2
              </span>
              <span className="text-xs font-bold text-slate-700 tracking-wider">
                DIE MANAGEMENT OPERATING SYSTEM
              </span>
            </div>
            <h1 className="text-base font-extrabold text-slate-950 mt-1 uppercase tracking-tight">
              Wire Drawing Technical Data Sheet (TDS) & Drafting Schedule
            </h1>
            <p className="text-[10px] text-slate-600 mt-0.5 font-mono">
              Industrial Pass Progression, Deformation Mechanics & Elongation Profile
            </p>
          </div>

          <div className="text-right border border-slate-300 bg-slate-50 p-2 rounded-xs min-w-[190px]">
            <div className="text-[9px] text-slate-500 uppercase font-semibold">Document Reference</div>
            <div className="text-xs font-bold text-slate-900">TDS-{dateStr.replace(/ /g, '')}</div>
            <div className="text-[9px] text-slate-600 mt-0.5">
              Generated: {dateStr} • {timeStr}
            </div>
          </div>
        </div>

        {/* Operational Context Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-2.5 border-t border-slate-200 text-[10px]">
          <div>
            <span className="text-slate-500 uppercase block font-semibold">Work Order:</span>
            <span className="font-bold text-slate-900">{workOrder}</span>
          </div>
          <div>
            <span className="text-slate-500 uppercase block font-semibold">Drawing Machine:</span>
            <span className="font-bold text-slate-900">{machineName}</span>
          </div>
          <div>
            <span className="text-slate-500 uppercase block font-semibold">Material Profile:</span>
            <span className="font-bold text-slate-900">Standard Wire Drawing</span>
          </div>
          <div>
            <span className="text-slate-500 uppercase block font-semibold">Quality Status:</span>
            <span className="font-bold text-emerald-700">
              {consistency ? `${consistency.qualityRating} (${consistency.stars}★)` : 'VERIFIED'}
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 01: DRAFTING SCHEDULE & SERIES SUMMARY
          ========================================================================= */}
      <div className="mb-5 border border-slate-300 rounded-sm p-3 bg-slate-50/60 print:border-slate-400">
        <div className="flex justify-between items-center mb-2.5 pb-1 border-b border-slate-200">
          <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            01. Drafting Schedule & Series Summary
          </span>
          <span className="text-[10px] text-slate-500 font-semibold">
            {stats.totalPasses} Drawing Passes Total
          </span>
        </div>

        {/* High-level KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center mb-3">
          <div className="bg-white border border-slate-200 p-1.5 rounded-sm">
            <span className="text-[9px] text-slate-500 uppercase block">Inlet Size</span>
            <span className="text-xs font-bold text-slate-900 mt-0.5 block">Ø {stats.startingDie.toFixed(3)} mm</span>
          </div>
          <div className="bg-white border border-slate-200 p-1.5 rounded-sm">
            <span className="text-[9px] text-slate-500 uppercase block">Finish Size</span>
            <span className="text-xs font-bold text-slate-900 mt-0.5 block">Ø {stats.finalDie.toFixed(3)} mm</span>
          </div>
          <div className="bg-white border border-slate-200 p-1.5 rounded-sm">
            <span className="text-[9px] text-slate-500 uppercase block">Overall Area Red.</span>
            <span className="text-xs font-bold text-emerald-700 mt-0.5 block">
              {stats.overallAreaReduction.toFixed(2)} %
            </span>
          </div>
          <div className="bg-white border border-slate-200 p-1.5 rounded-sm">
            <span className="text-[9px] text-slate-500 uppercase block">Total Ratio</span>
            <span className="text-xs font-bold text-blue-700 mt-0.5 block">
              {stats.overallReductionRatio.toFixed(2)}
            </span>
          </div>
          <div className="bg-white border border-slate-200 p-1.5 rounded-sm">
            <span className="text-[9px] text-slate-500 uppercase block">Avg Elongation</span>
            <span className="text-xs font-bold text-purple-700 mt-0.5 block">
              {stats.avgElongation.toFixed(2)} %
            </span>
          </div>
          <div className="bg-white border border-slate-200 p-1.5 rounded-sm">
            <span className="text-[9px] text-slate-500 uppercase block">Avg Area Red.</span>
            <span className="text-xs font-bold text-slate-900 mt-0.5 block">
              {stats.avgAreaReduction.toFixed(2)} %
            </span>
          </div>
        </div>

        {/* Complete Series progression string */}
        <div>
          <span className="text-[10px] font-bold text-slate-700 uppercase block mb-1">
            Complete Die Series Sequence:
          </span>
          <div className="flex flex-wrap items-center gap-1 bg-white border border-slate-200 p-2 rounded-sm text-[10.5px]">
            {dies.map((d, i) => (
              <React.Fragment key={i}>
                <span className="font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300">
                  Ø {d.toFixed(3)}
                </span>
                {i < dies.length - 1 && <span className="text-slate-400 font-bold">→</span>}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 02: SCHEMATIC DRAFTING PIPELINE
          ========================================================================= */}
      <div className="mb-5 page-break-inside-avoid">
        <PrintSchematicPipeline dies={dies} passes={passes} />
      </div>

      {/* =========================================================================
          SECTION 03: ELONGATION & REDUCTION ENGINEERING DATA TABLE
          ========================================================================= */}
      <div className="mb-5 page-break-inside-avoid">
        <div className="bg-white border border-slate-300 rounded-sm p-4 print:border-slate-400">
          <div className="flex justify-between items-center mb-2 pb-1.5 border-b border-slate-200">
            <div>
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                03. Elongation & Reduction Engineering Data Table
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Pass-by-pass dimensional reduction and cross-sectional transformation schedule
              </span>
            </div>
            <span className="text-[10px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-semibold">
              UNITS: mm, mm², %
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse border border-slate-300 text-[10px]">
              <thead>
                <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-300">
                  <th className="p-1.5 border border-slate-300 text-center w-12">PASS</th>
                  <th className="p-1.5 border border-slate-300 text-right">FROM (Ø mm)</th>
                  <th className="p-1.5 border border-slate-300 text-right">TO (Ø mm)</th>
                  <th className="p-1.5 border border-slate-300 text-right">AREA IN (mm²)</th>
                  <th className="p-1.5 border border-slate-300 text-right">AREA OUT (mm²)</th>
                  <th className="p-1.5 border border-slate-300 text-right bg-emerald-50 text-emerald-900">
                    AREA RED. ΔA (%)
                  </th>
                  <th className="p-1.5 border border-slate-300 text-right bg-blue-50 text-blue-900">
                    ELONGATION E (%)
                  </th>
                  <th className="p-1.5 border border-slate-300 text-right">RATIO R</th>
                </tr>
              </thead>
              <tbody>
                {passes.map((p, idx) => (
                  <tr
                    key={p.pass}
                    className={`border-b border-slate-200 ${
                      idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'
                    }`}
                  >
                    <td className="p-1.5 border border-slate-200 text-center font-bold text-slate-700">
                      P{p.pass}
                    </td>
                    <td className="p-1.5 border border-slate-200 text-right font-medium">
                      {p.fromDie.toFixed(3)}
                    </td>
                    <td className="p-1.5 border border-slate-200 text-right font-bold text-slate-900">
                      {p.toDie.toFixed(3)}
                    </td>
                    <td className="p-1.5 border border-slate-200 text-right text-slate-600">
                      {p.areaBefore.toFixed(3)}
                    </td>
                    <td className="p-1.5 border border-slate-200 text-right text-slate-600">
                      {p.areaAfter.toFixed(3)}
                    </td>
                    <td className="p-1.5 border border-slate-200 text-right font-bold text-emerald-700 bg-emerald-50/40">
                      {p.areaReduction.toFixed(2)} %
                    </td>
                    <td className="p-1.5 border border-slate-200 text-right font-bold text-blue-700 bg-blue-50/40">
                      {p.elongation.toFixed(2)} %
                    </td>
                    <td className="p-1.5 border border-slate-200 text-right text-slate-700 font-medium">
                      {p.reductionRatio.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                {/* Average Row */}
                <tr className="bg-slate-100 font-bold border-t-2 border-slate-400 text-slate-900">
                  <td className="p-1.5 border border-slate-300 text-center uppercase">AVG</td>
                  <td className="p-1.5 border border-slate-300 text-right text-slate-400">—</td>
                  <td className="p-1.5 border border-slate-300 text-right text-slate-400">—</td>
                  <td className="p-1.5 border border-slate-300 text-right text-slate-400">—</td>
                  <td className="p-1.5 border border-slate-300 text-right text-slate-400">—</td>
                  <td className="p-1.5 border border-slate-300 text-right text-emerald-800 bg-emerald-100/50">
                    {stats.avgAreaReduction.toFixed(2)} %
                  </td>
                  <td className="p-1.5 border border-slate-300 text-right text-blue-800 bg-blue-100/50">
                    {stats.avgElongation.toFixed(2)} %
                  </td>
                  <td className="p-1.5 border border-slate-300 text-right">
                    {(passes.reduce((s, p) => s + p.reductionRatio, 0) / passes.length).toFixed(2)}
                  </td>
                </tr>
                {/* Min / Max Row */}
                <tr className="bg-slate-50 font-semibold border-t border-slate-200 text-slate-700">
                  <td className="p-1.5 border border-slate-300 text-center uppercase">RANGE</td>
                  <td className="p-1.5 border border-slate-300 text-right text-slate-400">—</td>
                  <td className="p-1.5 border border-slate-300 text-right text-slate-400">—</td>
                  <td className="p-1.5 border border-slate-300 text-right text-slate-400">—</td>
                  <td className="p-1.5 border border-slate-300 text-right text-slate-400">—</td>
                  <td className="p-1.5 border border-slate-300 text-right text-slate-700">
                    {minRed.toFixed(1)}% – {maxRed.toFixed(1)}%
                  </td>
                  <td className="p-1.5 border border-slate-300 text-right text-slate-700">
                    {stats.minElongation.toFixed(1)}% – {stats.maxElongation.toFixed(1)}%
                  </td>
                  <td className="p-1.5 border border-slate-300 text-right text-slate-400">—</td>
                </tr>
                {/* Total / Overall Row */}
                <tr className="bg-slate-200 font-extrabold border-t border-slate-300 text-slate-950">
                  <td className="p-1.5 border border-slate-300 text-center uppercase">TOTAL</td>
                  <td className="p-1.5 border border-slate-300 text-right">{stats.startingDie.toFixed(3)}</td>
                  <td className="p-1.5 border border-slate-300 text-right">{stats.finalDie.toFixed(3)}</td>
                  <td className="p-1.5 border border-slate-300 text-right">
                    {passes[0]?.areaBefore.toFixed(3)}
                  </td>
                  <td className="p-1.5 border border-slate-300 text-right">
                    {passes[passes.length - 1]?.areaAfter.toFixed(3)}
                  </td>
                  <td className="p-1.5 border border-slate-300 text-right text-emerald-950 bg-emerald-200/60">
                    {stats.overallAreaReduction.toFixed(2)} %
                  </td>
                  <td className="p-1.5 border border-slate-300 text-right text-blue-950 bg-blue-200/60">
                    {((stats.overallReductionRatio - 1) * 100).toFixed(1)} %
                  </td>
                  <td className="p-1.5 border border-slate-300 text-right">
                    {stats.overallReductionRatio.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 04: GRAPHICAL ANALYSIS (PURE SVG VECTOR PASS GRAPHS)
          ========================================================================= */}
      <div className="mb-5 space-y-4 page-break-inside-avoid">
        <div>
          <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block mb-1">
            04. Graphical Pass Analysis
          </span>
          <span className="text-[10px] text-slate-500 block mb-2.5">
            High-contrast vector profiles with mean drafting reference lines and process tolerance limits
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <PrintPassChart
            title="Elongation per Pass (%)"
            metric="elongation"
            passes={passes}
            barColor="#3b82f6"
            targetMin={20}
            targetMax={28}
          />
          <PrintPassChart
            title="Area Reduction per Pass (%)"
            metric="areaReduction"
            passes={passes}
            barColor="#10b981"
            targetMin={18}
            targetMax={24}
          />
        </div>
      </div>

      {/* =========================================================================
          SECTION 05: ENGINEERING SIGN-OFF & OPERATIONAL NOTES
          ========================================================================= */}
      <div className="border border-slate-300 rounded-sm p-3.5 bg-slate-50/70 page-break-inside-avoid print:border-slate-400">
        <div className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 pb-1 border-b border-slate-200">
          05. Operational Notes & Engineering Sign-Off
        </div>

        <div className="mb-3 text-[10px]">
          <span className="text-slate-500 font-bold uppercase block mb-0.5">Shopfloor Notes & Instructions:</span>
          <p className="text-slate-800 bg-white p-2 border border-slate-200 rounded-xs">
            {notes}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-3 border-t border-slate-200 text-[10px]">
          <div>
            <span className="text-slate-500 uppercase block font-semibold">Prepared By:</span>
            <div className="h-6 border-b border-slate-400 mt-2" />
            <span className="text-slate-600 text-[9px] mt-0.5 block">Tool Room Engineer</span>
          </div>
          <div>
            <span className="text-slate-500 uppercase block font-semibold">Verified By:</span>
            <div className="h-6 border-b border-slate-400 mt-2" />
            <span className="text-slate-600 text-[9px] mt-0.5 block">Production Supervisor</span>
          </div>
          <div>
            <span className="text-slate-500 uppercase block font-semibold">Quality Approval:</span>
            <div className="h-6 border-b border-slate-400 mt-2" />
            <span className="text-slate-600 text-[9px] mt-0.5 block">QA / Metallurgist</span>
          </div>
        </div>
      </div>
    </div>
  );
};
export default WireDrawingPrintReport;
