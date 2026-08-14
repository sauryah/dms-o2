import { useEffect, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Zap } from 'lucide-react';
import { useUndo } from '../features/wire-drawing-calculator/hooks/useUndo';
import { useApi } from '../hooks/useApi';
import DieSeriesGenerator from '../features/wire-drawing-calculator/components/DieSeriesGenerator';
import ResultsTable from '../features/wire-drawing-calculator/components/ResultsTable';
import StatisticsPanel from '../features/wire-drawing-calculator/components/StatisticsPanel';
import PassConsistency from '../features/wire-drawing-calculator/components/PassConsistency';
import ElongationChart from '../features/wire-drawing-calculator/components/ElongationChart';
import AreaReductionChart from '../features/wire-drawing-calculator/components/AreaReductionChart';
import DieProgression from '../features/wire-drawing-calculator/components/DieProgression';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

export function DieSeriesGeneratorPage() {
  const navigate = useNavigate();
  const { state: dies, set: setDies, undo, redo, canUndo, canRedo } = useUndo<number[]>([]);
  const [selectedPassIdx, setSelectedPassIdx] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDies, setPendingDies] = useState<number[] | null>(null);

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

  const handleApplyGenerated = useCallback((newDies: number[]) => {
    if (dies.length > 0) {
      setPendingDies(newDies);
      setConfirmOpen(true);
      return;
    }
    setDies(newDies);
  }, [dies.length, setDies]);

  const handleConfirmApply = useCallback(() => {
    if (pendingDies) {
      setDies(pendingDies);
      setPendingDies(null);
    }
    setConfirmOpen(false);
  }, [pendingDies, setDies]);

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
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-[#2a2a2a] pb-4">
          <button
            onClick={() => navigate('/tools')}
            className="p-1.5 rounded-sm bg-[#141414] border border-[#2a2a2a] text-[#6b7280] hover:text-[#e4e4e4] hover:border-blue-500/50 transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-sm bg-[#141414] border border-purple-500/30 text-purple-400">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-[10px] text-[#6b7280] uppercase tracking-wider">
                <span>01 SERIES GENERATION ENGINE</span>
              </div>
              <h1 className="text-sm md:text-base font-medium text-[#e4e4e4] uppercase tracking-[0.05em]">Die Series Generator</h1>
            </div>
          </div>
        </div>

        {/* Generator Input */}
        <DieSeriesGenerator onApply={handleApplyGenerated} />

        {/* Results (shown after generating) */}
        {passes.length > 0 && (
          <>
            <ResultsTable
              passes={passes}
              dies={dies}
              onDiesChange={setDies}
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={undo}
              onRedo={redo}
              selectedPassIdx={selectedPassIdx}
              onSelectPass={setSelectedPassIdx}
            />

            <DieProgression dies={dies} onDiesChange={setDies} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ElongationChart passes={passes} />
              <AreaReductionChart passes={passes} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {stats && <StatisticsPanel stats={stats} />}
              {consistency && <PassConsistency consistency={consistency} />}
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Overwrite Die Sequence?"
        message="Apply new die sequence? This will replace your current calculated schedule."
        confirmLabel="Apply"
        cancelLabel="Cancel"
        danger
        onConfirm={handleConfirmApply}
        onCancel={() => { setConfirmOpen(false); setPendingDies(null); }}
      />
    </div>
  );
}
