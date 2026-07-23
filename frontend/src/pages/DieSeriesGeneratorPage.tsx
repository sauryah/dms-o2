import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Zap } from 'lucide-react';
import DieSeriesGenerator from '../features/wire-drawing-calculator/components/DieSeriesGenerator';
import { calculatePassData, calculateStatistics, calculateConsistency } from '../features/wire-drawing-calculator/utils/calculations';
import ResultsTable from '../features/wire-drawing-calculator/components/ResultsTable';
import StatisticsPanel from '../features/wire-drawing-calculator/components/StatisticsPanel';
import PassConsistency from '../features/wire-drawing-calculator/components/PassConsistency';
import ElongationChart from '../features/wire-drawing-calculator/components/ElongationChart';
import AreaReductionChart from '../features/wire-drawing-calculator/components/AreaReductionChart';
import DieProgression from '../features/wire-drawing-calculator/components/DieProgression';

export function DieSeriesGeneratorPage() {
  const navigate = useNavigate();
  const [dies, setDies] = useState<number[]>([]);

  const passes = calculatePassData(dies);
  const stats = calculateStatistics(dies, passes);
  const consistency = calculateConsistency(passes);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#0B1220] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/tools')}
            className="p-2 rounded-lg bg-[#1E293B] border border-white/[0.06] text-[#94A3B8] hover:text-white hover:border-blue-500/30 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white m-0">Die Series Generator</h1>
              <p className="text-xs text-[#475569] m-0">Generate optimized die schedules from elongation targets</p>
            </div>
          </div>
        </div>

        {/* Generator Input */}
        <DieSeriesGenerator onApply={setDies} />

        {/* Results (shown after generating) */}
        {passes.length > 0 && (
          <>
            <ResultsTable
              passes={passes}
              dies={dies}
              onDiesChange={setDies}
              canUndo={false}
              canRedo={false}
              onUndo={() => {}}
              onRedo={() => {}}
            />

            <DieProgression dies={dies} onDiesChange={setDies} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ElongationChart passes={passes} />
              <AreaReductionChart passes={passes} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <StatisticsPanel stats={stats} />
              <PassConsistency consistency={consistency} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
