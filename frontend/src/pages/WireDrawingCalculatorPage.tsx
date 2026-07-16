import { useRef, useCallback, useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { useUndo } from '../features/wire-drawing-calculator/hooks/useUndo';
import { calculatePassData, calculateStatistics, calculateConsistency } from '../features/wire-drawing-calculator/utils/calculations';
import Header from '../features/wire-drawing-calculator/components/Header';
import { DieBlueprint } from '../features/inventory/components/CadRenderer';
import InputPanel from '../features/wire-drawing-calculator/components/InputPanel';
import ResultsTable from '../features/wire-drawing-calculator/components/ResultsTable';
import ElongationChart from '../features/wire-drawing-calculator/components/ElongationChart';
import AreaReductionChart from '../features/wire-drawing-calculator/components/AreaReductionChart';
import DieProgression from '../features/wire-drawing-calculator/components/DieProgression';
import StatisticsPanel from '../features/wire-drawing-calculator/components/StatisticsPanel';
import ExportPanel from '../features/wire-drawing-calculator/components/ExportPanel';
import SaveLoad from '../features/wire-drawing-calculator/components/SaveLoad';
import TargetChecker from '../features/wire-drawing-calculator/components/TargetChecker';
import DieSuggester from '../features/wire-drawing-calculator/components/DieSuggester';
import ComparePanel from '../features/wire-drawing-calculator/components/ComparePanel';
import PassConsistency from '../features/wire-drawing-calculator/components/PassConsistency';
import TheoryPanel from '../features/wire-drawing-calculator/components/TheoryPanel';

const DEFAULT_DIES = [
  2.490, 2.217, 1.974, 1.757, 1.564, 1.392, 1.239, 1.103, 0.982, 0.874,
  0.778, 0.693, 0.617, 0.550, 0.490, 0.437, 0.389, 0.347, 0.309,
];

export function WireDrawingCalculatorPage() {
  const { state: dies, set: setDies, undo, redo, canUndo, canRedo } = useUndo<number[]>(DEFAULT_DIES);
  const [selectedPassIdx, setSelectedPassIdx] = useState<number | null>(0);
  const printRef = useRef<HTMLDivElement>(null);

  const passes = calculatePassData(dies);
  const stats = calculateStatistics(dies, passes);
  const consistency = calculateConsistency(passes);
  const handleParse = useCallback((d: number[]) => setDies(d), [setDies]);
  const handleDiesChange = useCallback((d: number[]) => setDies(d), [setDies]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#0B1220] py-8 px-4 sm:px-6 lg:px-8">
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1E293B',
            color: '#F8FAFC',
            borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.08)',
            fontSize: 13,
            fontFamily: 'Inter',
          },
        }}
      />

      <div className="max-w-[1400px] mx-auto space-y-6" ref={printRef}>
        <Header dark={true} toggleDark={() => {}} />

        <InputPanel onParse={handleParse} currentDies={dies} />

        {passes.length > 0 && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <ResultsTable
                  passes={passes}
                  dies={dies}
                  onDiesChange={handleDiesChange}
                  canUndo={canUndo}
                  canRedo={canRedo}
                  onUndo={undo}
                  onRedo={redo}
                  selectedPassIdx={selectedPassIdx}
                  onSelectPass={setSelectedPassIdx}
                />
              </div>
              <div className="lg:col-span-1">
                {(() => {
                  const selectedPass = selectedPassIdx !== null && selectedPassIdx < passes.length ? passes[selectedPassIdx] : null;
                  const simulatedDie = selectedPass ? {
                    die_type: 'ROUND',
                    die_id: `PASS-${selectedPass.draft}`,
                    punched_size: selectedPass.toDie.toString(),
                    current_size: selectedPass.toDie.toString(),
                    inlet_size: selectedPass.fromDie.toString(),
                    status: 'RUNNING',
                    casing: 'Standard Carbide'
                  } : null;

                  return simulatedDie ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-5 bg-blue-600 rounded-sm" />
                        <h3 className="text-sm font-extrabold text-white uppercase tracking-wider font-heading">Pass CAD Visualizer</h3>
                      </div>
                      <DieBlueprint 
                        die={simulatedDie}
                        activeHighlight={null}
                        onHoverDim={() => {}}
                      />
                      <div className="bg-[#0b1428]/45 border border-slate-800/40 p-4 rounded-xl text-xs space-y-2">
                        <h4 className="font-bold text-slate-300 font-sans uppercase tracking-wider text-[10px]">Simulated Pass Operations</h4>
                        <p className="text-slate-450 leading-relaxed font-sans text-[11px]">
                          Visualizing the draft progression geometry for **Pass #{selectedPass?.draft}**. 
                          Click any row in the results table to select that draft, zoom/pan the viewport, or view the internal cross-sectional channel.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[#0b1428]/20 border border-slate-800/40 p-6 rounded-xl text-slate-500 text-xs text-center flex items-center justify-center h-[280px]">
                      Select a pass row in the results table to activate live CAD simulation.
                    </div>
                  );
                })()}
              </div>
            </div>

            <DieProgression dies={dies} onDiesChange={handleDiesChange} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ElongationChart passes={passes} />
              <AreaReductionChart passes={passes} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <StatisticsPanel stats={stats} />
              <div className="space-y-6">
                <PassConsistency consistency={consistency} />
                <ExportPanel passes={passes} stats={stats} dies={dies} />
                <SaveLoad dies={dies} onLoad={setDies} />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TargetChecker passes={passes} />
              <DieSuggester dies={dies} />
            </div>

            <ComparePanel currentDies={dies} />
          </>
        )}

        <TheoryPanel />
      </div>
    </div>
  );
}
