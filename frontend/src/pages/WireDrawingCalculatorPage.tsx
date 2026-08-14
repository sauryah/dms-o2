import { useRef, useCallback, useEffect, useState, Suspense } from 'react';
import { Toaster } from 'react-hot-toast';
import { useUndo } from '../features/wire-drawing-calculator/hooks/useUndo';
import { useApi } from '../hooks/useApi';
import Header from '../features/wire-drawing-calculator/components/Header';
import InputPanel from '../features/wire-drawing-calculator/components/InputPanel';
import ResultsTable from '../features/wire-drawing-calculator/components/ResultsTable';
import DieProgression from '../features/wire-drawing-calculator/components/DieProgression';
import StatisticsPanel from '../features/wire-drawing-calculator/components/StatisticsPanel';
import ExportPanel from '../features/wire-drawing-calculator/components/ExportPanel';
import SaveLoad from '../features/wire-drawing-calculator/components/SaveLoad';
import TargetChecker from '../features/wire-drawing-calculator/components/TargetChecker';
import DieSuggester from '../features/wire-drawing-calculator/components/DieSuggester';
import ComparePanel from '../features/wire-drawing-calculator/components/ComparePanel';
import { useAuth } from '../contexts/AuthContext';
import PassConsistency from '../features/wire-drawing-calculator/components/PassConsistency';
import { lazyWithRetry } from '../utils/lazyWithRetry';

// Skeleton loading fallbacks
const ChartSkeleton = () => (
  <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm p-4 h-[260px] flex flex-col justify-between animate-pulse font-mono">
    <div className="h-3 w-1/3 bg-[#141414]" />
    <div className="h-36 bg-[#0a0a0a] flex items-center justify-center">
      <div className="w-5 h-5 border border-[#2a2a2a] border-t-blue-500 animate-spin" />
    </div>
    <div className="h-3 w-2/3 bg-[#141414]" />
  </div>
);

const BlueprintSkeleton = () => (
  <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm p-4 h-[240px] flex items-center justify-center animate-pulse">
    <div className="w-6 h-6 border border-[#2a2a2a] border-t-blue-500 animate-spin" />
  </div>
);

const PanelSkeleton = () => (
  <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm p-4 h-[300px] flex items-center justify-center animate-pulse">
    <div className="w-6 h-6 border border-[#2a2a2a] border-t-blue-500 animate-spin" />
  </div>
);

// Lazy components using automatic chunk failure recovery wrapper
const DieBlueprint = lazyWithRetry(() =>
  import('../features/inventory/components/CadRenderer').then(m => ({ default: m.DieBlueprint }))
);
const ElongationChart = lazyWithRetry(() =>
  import('../features/wire-drawing-calculator/components/ElongationChart')
);
const AreaReductionChart = lazyWithRetry(() =>
  import('../features/wire-drawing-calculator/components/AreaReductionChart')
);
const TheoryPanel = lazyWithRetry(() =>
  import('../features/wire-drawing-calculator/components/TheoryPanel')
);
const StressHeatmap3D = lazyWithRetry(() =>
  import('../features/wire-drawing-calculator/components/StressHeatmap3D')
);

const DEFAULT_DIES = [
  2.490, 2.217, 1.974, 1.757, 1.564, 1.392, 1.239, 1.103, 0.982, 0.874,
  0.778, 0.693, 0.617, 0.550, 0.490, 0.437, 0.389, 0.347, 0.309,
];

export function WireDrawingCalculatorPage() {
  const { role, authorizedTools = [], refetchPermissions } = useAuth();
  const { state: dies, set: setDies, undo, redo, canUndo, canRedo } = useUndo<number[]>(DEFAULT_DIES);
  const [selectedPassIdx, setSelectedPassIdx] = useState<number | null>(0);
  const printRef = useRef<HTMLDivElement>(null);

  // Sync latest permissions on page load
  useEffect(() => {
    refetchPermissions?.();
  }, [refetchPermissions]);

  const isRoot = role === 'ROOT';
  const canAccess3DHeatmap = isRoot || authorizedTools.includes('3d-stress-heatmap');
  const canAccessTheory = isRoot || authorizedTools.includes('engineering-theory');

  const { request } = useApi();
  const [passes, setPasses] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [consistency, setConsistency] = useState<any>(null);

  useEffect(() => {
    if (dies.length < 2) {
      setPasses([]);
      setStats(null);
      setConsistency(null);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await request('/api/go/tools/calculate/wire-drawing', {
          method: 'POST',
          body: JSON.stringify({ dies }),
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal
        });
        if (res) {
          setPasses(res.passes.map((p: any) => ({
            pass: p.pass,
            fromDie: p.from_die,
            toDie: p.to_die,
            areaBefore: p.area_before,
            areaAfter: p.area_after,
            areaReduction: p.area_reduction,
            elongation: p.elongation,
            reductionRatio: p.reduction_ratio
          })));
          setStats({
            totalPasses: res.stats.total_passes,
            startingDie: res.stats.starting_die,
            finalDie: res.stats.final_die,
            avgElongation: res.stats.avg_elongation,
            maxElongation: res.stats.max_elongation,
            minElongation: res.stats.min_elongation,
            avgAreaReduction: res.stats.avg_area_reduction,
            overallAreaReduction: res.stats.overall_area_reduction,
            overallReductionRatio: res.stats.overall_reduction_ratio
          });
          setConsistency({
            avgElongation: res.consistency.avg_elongation,
            variation: res.consistency.variation,
            qualityRating: res.consistency.quality_rating,
            stars: res.consistency.stars
          });
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError' && err?.type !== 'aborted') {
          console.error(err);
        }
      }
    }, 150);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [dies, request]);

  const handleParse = useCallback((d: number[]) => setDies(d), [setDies]);
  const handleDiesChange = useCallback((d: number[]) => setDies(d), [setDies]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        const target = e.target as HTMLElement | null;
        if (target && (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable
        )) {
          return;
        }
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#0a0a0a] text-[#e4e4e4] py-6 px-4 sm:px-6 lg:px-8 font-mono">
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#0f0f0f',
            color: '#e4e4e4',
            borderRadius: '2px',
            border: '1px solid #2a2a2a',
            fontSize: '12px',
            fontFamily: 'monospace',
          },
        }}
      />

      <div className="max-w-[1400px] mx-auto space-y-6" ref={printRef}>
        <Header dark={true} toggleDark={() => {}} />

        <InputPanel onParse={handleParse} currentDies={dies} />

        {passes.length > 0 && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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
                    <div className="space-y-3 font-mono">
                      <div className="flex items-center gap-1.5 border-b border-[#1a1a1a] pb-1.5">
                        <span className="text-xs font-bold text-[#e4e4e4] uppercase tracking-wider">Pass CAD Visualizer</span>
                      </div>
                      <Suspense fallback={<BlueprintSkeleton />}>
                        <DieBlueprint 
                          die={simulatedDie as any}
                          activeHighlight={null}
                          onHoverDim={() => {}}
                        />
                      </Suspense>
                      <div className="bg-[#0f0f0f] border border-[#1a1a1a] p-3 rounded-sm text-xs space-y-1">
                        <h4 className="font-bold text-[#e4e4e4] uppercase tracking-wider text-[10px]">Pass #{selectedPass?.pass} Telemetry</h4>
                        <p className="text-[#6b7280] leading-normal text-[11px]">
                          Visualizing draft geometry. Click any row in the results table to select that draft.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[#0f0f0f] border border-[#1a1a1a] p-6 rounded-sm text-[#6b7280] text-xs text-center flex items-center justify-center h-[240px]">
                      Select a pass row in the results table to activate CAD simulation.
                    </div>
                  );
                })()}
              </div>
            </div>

            <DieProgression dies={dies} onDiesChange={handleDiesChange} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Suspense fallback={<ChartSkeleton />}>
                <ElongationChart passes={passes} />
              </Suspense>
              <Suspense fallback={<ChartSkeleton />}>
                <AreaReductionChart passes={passes} />
              </Suspense>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {stats && <StatisticsPanel stats={stats} />}
              <div className="space-y-4">
                {consistency && <PassConsistency consistency={consistency} />}
                {stats && <ExportPanel passes={passes} stats={stats} dies={dies} />}
                <SaveLoad dies={dies} onLoad={setDies} />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <TargetChecker passes={passes} />
              <DieSuggester dies={dies} />
            </div>

            <ComparePanel currentDies={dies} />
          </>
        )}

        {/* 3D Stress Heatmap Module */}
        {canAccess3DHeatmap && passes.length > 0 && (
          <Suspense fallback={<PanelSkeleton />}>
            <StressHeatmap3D passes={passes} />
          </Suspense>
        )}

        {/* Theory & Fundamentals Module */}
        {canAccessTheory && (
          <Suspense fallback={<PanelSkeleton />}>
            <TheoryPanel />
          </Suspense>
        )}
      </div>
    </div>
  );
}
