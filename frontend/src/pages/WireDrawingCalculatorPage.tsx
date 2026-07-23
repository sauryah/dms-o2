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
import { useAuth } from '../contexts/AuthContext';
import { Lock, ShieldAlert } from 'lucide-react';
import PassConsistency from '../features/wire-drawing-calculator/components/PassConsistency';
import TheoryPanel from '../features/wire-drawing-calculator/components/TheoryPanel';
import StressHeatmap3D from '../features/wire-drawing-calculator/components/StressHeatmap3D';

const DEFAULT_DIES = [
  2.490, 2.217, 1.974, 1.757, 1.564, 1.392, 1.239, 1.103, 0.982, 0.874,
  0.778, 0.693, 0.617, 0.550, 0.490, 0.437, 0.389, 0.347, 0.309,
];

export function WireDrawingCalculatorPage() {
  const { role, authorizedTools = [] } = useAuth();
  const { state: dies, set: setDies, undo, redo, canUndo, canRedo } = useUndo<number[]>(DEFAULT_DIES);
  const [selectedPassIdx, setSelectedPassIdx] = useState<number | null>(0);
  const printRef = useRef<HTMLDivElement>(null);

  // Manual Lock Toggle State (stored in localStorage)
  const [isManuallyLocked, setIsManuallyLocked] = useState<boolean>(() => {
    return localStorage.getItem('dms_lock_3d_theory') === 'true';
  });

  const toggleManualLock = () => {
    setIsManuallyLocked((prev) => {
      const next = !prev;
      localStorage.setItem('dms_lock_3d_theory', String(next));
      return next;
    });
  };

  const isRoot = role === 'ROOT';
  const hasSpecificToolAuth =
    authorizedTools.includes('3d-stress-heatmap') ||
    authorizedTools.includes('engineering-theory') ||
    authorizedTools.includes('wire-drawing-calculator');

  // ADMIN users are locked out by default unless ROOT explicitly assigns specific tool authorization!
  const isAuthorizedRole = isRoot || hasSpecificToolAuth;
  const isEngineeringAuthorized = isAuthorizedRole && !isManuallyLocked;

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
                    die_id: `PASS-${selectedPass.pass}`,
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
                          Visualizing the draft progression geometry for **Pass #{selectedPass?.pass}**. 
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

        {isAuthorizedRole ? (
          <div className="space-y-6">
            {/* Workbench Section Header & Manual Lock/Unlock Switch */}
            <div className="flex items-center justify-between bg-slate-950/60 border border-slate-900 px-5 py-3 rounded-xl">
              <div className="flex items-center space-x-2.5">
                <div className={`w-2.5 h-2.5 rounded-full ${isManuallyLocked ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`} />
                <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                  Advanced Engineering Modules: {isManuallyLocked ? 'Locked' : 'Active & Unlocked'}
                </span>
              </div>
              <button
                onClick={toggleManualLock}
                className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition border cursor-pointer ${
                  isManuallyLocked
                    ? 'bg-amber-950/40 text-amber-300 border-amber-800/40 hover:bg-amber-900/40'
                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{isManuallyLocked ? 'Unlock 3D & Theory' : 'Lock 3D & Theory'}</span>
              </button>
            </div>

            {!isManuallyLocked && (
              <>
                {passes.length > 0 && <StressHeatmap3D passes={passes} />}
                <TheoryPanel />
              </>
            )}
          </div>
        ) : (
          <div className="bg-[#050913]/90 border border-slate-900 rounded-xl p-8 text-center relative overflow-hidden shadow-2xl">
            <div className="flex justify-center mb-4">
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-full text-rose-400">
                <Lock className="w-6 h-6" />
              </div>
            </div>
            <h3 className="text-base font-bold text-white mb-1 font-heading">
              Advanced 3D Stress Model & Theory Engine Restricted
            </h3>
            <p className="text-slate-400 text-xs max-w-lg mx-auto mb-4 leading-relaxed">
              Access to the 3D von Mises Stress Heatmap & Flow Visualizer and Theory & Fundamentals is locked. Admin and Operator accounts require explicit Tool Authorization granted by the ROOT Superadmin.
            </p>
            <div className="inline-flex items-center gap-2 text-[11px] font-mono text-slate-400 bg-slate-900/60 border border-slate-800 px-3.5 py-1.5 rounded-lg">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Authorization required: ROOT Superadmin or Explicit Tool Authorization</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
