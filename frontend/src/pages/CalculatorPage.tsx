import { Calculator, Sliders, Zap, BookOpen, Layers, Ruler } from 'lucide-react'
import { APP_VERSION } from '../version'
import { useCalculatorState } from './calculator/useCalculatorState'
import { FormulaReference } from './calculator/FormulaReference'
import { RoundCalculator } from './calculator/RoundCalculator'
import { SequenceCalculator } from './calculator/SequenceCalculator'
import { FlatCalculator } from './calculator/FlatCalculator'

export function CalculatorPage() {
  const state = useCalculatorState()

  const roundProps = {
    roundCalcMode: state.roundCalcMode,
    setRoundCalcMode: state.setRoundCalcMode,
    roundInlet: state.roundInlet,
    setRoundInlet: state.setRoundInlet,
    roundOutlet: state.roundOutlet,
    setRoundOutlet: state.setRoundOutlet,
    roundTargetRed: state.roundTargetRed,
    setRoundTargetRed: state.setRoundTargetRed,
    roundTargetElong: state.roundTargetElong,
    setRoundTargetElong: state.setRoundTargetElong,
    roundResults: state.roundResults,
    roundValidationError: state.roundValidationError,
    drawSpeed: state.drawSpeed,
    dieAngle: state.dieAngle,
    yieldStrength: state.yieldStrength,
    uts: state.uts,
    mu: state.mu,
    materialType: state.materialType,
    matchingDies: state.matchingDies,
    loadingDies: state.loadingDies,
    findMatchingDies: state.findMatchingDies,
    getMaterialLimit: state.getMaterialLimit,
  }

  const seqProps = {
    seqStart: state.seqStart,
    setSeqStart: state.setSeqStart,
    seqEnd: state.seqEnd,
    setSeqEnd: state.setSeqEnd,
    seqReduction: state.seqReduction,
    setSeqReduction: state.setSeqReduction,
    seqOptMode: state.seqOptMode,
    setSeqOptMode: state.setSeqOptMode,
    sequenceResults: state.sequenceResults,
    sequenceValidationError: state.sequenceValidationError,
    drawSpeed: state.drawSpeed,
    dieAngle: state.dieAngle,
    mu: state.mu,
    materialType: state.materialType,
    yieldStrength: state.yieldStrength,
    uts: state.uts,
    getMaterialLimit: state.getMaterialLimit,
    exportSequenceCSV: state.exportSequenceCSV,
    matchingDies: state.matchingDies,
    loadingDies: state.loadingDies,
    findMatchingDies: state.findMatchingDies,
  }

  const flatProps = {
    flatInWidth: state.flatInWidth,
    setFlatInWidth: state.setFlatInWidth,
    flatInThick: state.flatInThick,
    setFlatInThick: state.setFlatInThick,
    flatOutWidth: state.flatOutWidth,
    setFlatOutWidth: state.setFlatOutWidth,
    flatOutThick: state.flatOutThick,
    setFlatOutThick: state.setFlatOutThick,
    flatResults: state.flatResults,
    flatValidationError: state.flatValidationError,
    drawSpeed: state.drawSpeed,
    dieAngle: state.dieAngle,
    mu: state.mu,
    materialType: state.materialType,
    yieldStrength: state.yieldStrength,
    uts: state.uts,
    getMaterialLimit: state.getMaterialLimit,
    matchingDies: state.matchingDies,
    loadingDies: state.loadingDies,
    findMatchingFlatDies: state.findMatchingFlatDies,
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e4e4e4] font-mono pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">

        {/* Top Hero Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-[#2a2a2a]">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold tracking-widest text-blue-400 uppercase bg-[#141414] px-1.5 py-0.2 rounded-sm border border-blue-500/30">
                01 PHYSICS COMPILATION MODULE
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-mono text-[#6b7280] uppercase tracking-wider">
                CALC ENGINE: ACTIVE
              </span>
            </div>
            <h1 className="text-base md:text-lg font-medium text-[#e4e4e4] uppercase tracking-[0.05em] flex items-center gap-2">
              <Calculator className="h-4 w-4 text-blue-500" />
              Deformation Sizing Engine
            </h1>
            <p className="text-[#6b7280] text-xs max-w-3xl leading-normal">
              Analyze mechanical cross-sectional reduction schedules, elongation strains, drawing ratios, and pass sequence geometry layouts for round wire drawing and flat strip profiling.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
            <button
              onClick={() => state.setShowFormulaInfo(!state.showFormulaInfo)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono uppercase rounded-sm border transition cursor-pointer ${
                state.showFormulaInfo
                  ? 'bg-[#141414] border-blue-500/50 text-blue-400 font-bold'
                  : 'bg-[#141414] border-[#2a2a2a] text-[#6b7280] hover:text-[#e4e4e4]'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Reference Manual</span>
            </button>
            <div className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 bg-[#141414] border border-[#2a2a2a] rounded-sm text-[#6b7280] text-[10px] font-mono">
              <Zap className="h-3 w-3 text-amber-500" />
              <span>V{APP_VERSION}</span>
            </div>
          </div>
        </div>

        {/* Global Material Selection & Draw Safety Limits */}
        <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 font-mono">
          <div className="space-y-0.5 max-w-xl">
            <div className="flex items-center gap-1.5">
              <Sliders className="h-3.5 w-3.5 text-blue-500" />
              <span className="text-xs font-bold text-[#e4e4e4] uppercase tracking-wider">
                02 STOCK MATERIAL CONFIGURATION
              </span>
            </div>
            <p className="text-[#6b7280] text-xs">
              Select raw wire/strip material to configure single-pass draft safety limits and calculate potential yield thresholds.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0 w-full md:w-auto">
            <div className="flex-1 sm:flex-none">
              <select
                value={state.materialType}
                onChange={(e) => state.setMaterialType(e.target.value as any)}
                aria-label="Stock material type"
                className="w-full sm:w-64 bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm px-3 py-1.5 text-[#e4e4e4] font-mono text-xs focus:border-blue-500 focus:outline-none cursor-pointer uppercase"
              >
                <option value="copper_soft">Copper (Soft/Annealed) — Max 30%</option>
                <option value="copper_hard">Copper (Hard-Drawn) — Max 20%</option>
                <option value="aluminum">Aluminum (EC Grade) — Max 25%</option>
                <option value="steel_low">Low-Carbon Steel — Max 22%</option>
                <option value="custom">Custom Limit...</option>
              </select>
            </div>

            {state.materialType === 'custom' && (
              <div className="relative rounded-sm w-full sm:w-28">
                <input
                  type="number"
                  step="0.1"
                  value={state.customLimit}
                  onChange={(e) => state.setCustomLimit(e.target.value)}
                  placeholder="Limit %"
                  aria-label="Custom material reduction limit percentage"
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm px-2.5 py-1.5 pr-8 text-[#e4e4e4] font-mono text-xs focus:border-blue-500 focus:outline-none"
                />
                <div className="absolute right-2 top-1.5 text-[#6b7280] text-[10px] font-mono font-bold">
                  %
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Physics and Power Configuration Panel */}
        <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm p-4 space-y-3 font-mono">
          <div className="flex items-center gap-1.5 border-b border-[#1a1a1a] pb-2">
            <Zap className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-xs font-bold text-[#e4e4e4] uppercase tracking-wider">
              03 PHYSICS & POWER SETTINGS
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            <div>
              <label htmlFor="calc-draw-speed" className="text-[10px] font-mono text-[#6b7280] uppercase tracking-widest block mb-1">
                Drawing Speed (v)
              </label>
              <div className="relative rounded-sm">
                <input
                  id="calc-draw-speed"
                  type="number"
                  step="0.1"
                  value={state.drawSpeed}
                  onChange={(e) => state.setDrawSpeed(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm px-2.5 py-1.5 pr-10 text-[#e4e4e4] font-mono text-xs focus:border-blue-500 focus:outline-none"
                />
                <div className="absolute right-2 top-1.5 text-[#6b7280] text-[10px] font-mono">
                  m/s
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="calc-die-angle" className="text-[10px] font-mono text-[#6b7280] uppercase tracking-widest block mb-1">
                Die Half-Angle (α)
              </label>
              <div className="relative rounded-sm">
                <input
                  id="calc-die-angle"
                  type="number"
                  step="0.5"
                  value={state.dieAngle}
                  onChange={(e) => state.setDieAngle(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm px-2.5 py-1.5 pr-8 text-[#e4e4e4] font-mono text-xs focus:border-blue-500 focus:outline-none"
                />
                <div className="absolute right-2 top-1.5 text-[#6b7280] text-[10px] font-mono">
                  °
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="calc-lubrication" className="text-[10px] font-mono text-[#6b7280] uppercase tracking-widest block mb-1">
                Lubrication (μ)
              </label>
              <select
                id="calc-lubrication"
                value={state.lubrication}
                onChange={(e) => state.setLubrication(e.target.value as any)}
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm px-2.5 py-1.5 text-[#e4e4e4] font-mono text-xs focus:border-blue-500 focus:outline-none cursor-pointer h-[33px] uppercase"
              >
                <option value="hydrodynamic">Hydrodynamic (μ=0.02)</option>
                <option value="dry_soap">Dry Soap (μ=0.04)</option>
                <option value="wet_oil">Wet Oil (μ=0.06)</option>
                <option value="boundary">Boundary (μ=0.10)</option>
              </select>
            </div>

            <div>
              <label htmlFor="calc-yield-strength" className="text-[10px] font-mono text-[#6b7280] uppercase tracking-widest block mb-1">
                Yield Strength (σ_y)
              </label>
              <div className="relative rounded-sm">
                <input
                  id="calc-yield-strength"
                  type="number"
                  value={state.yieldStrength}
                  onChange={(e) => state.setYieldStrength(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm px-2.5 py-1.5 pr-10 text-[#e4e4e4] font-mono text-xs focus:border-blue-500 focus:outline-none"
                />
                <div className="absolute right-2 top-1.5 text-[#6b7280] text-[10px] font-mono">
                  MPa
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="calc-uts" className="text-[10px] font-mono text-[#6b7280] uppercase tracking-widest block mb-1">
                UTS (Strength limit)
              </label>
              <div className="relative rounded-sm">
                <input
                  id="calc-uts"
                  type="number"
                  value={state.uts}
                  onChange={(e) => state.setUts(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm px-2.5 py-1.5 pr-10 text-[#e4e4e4] font-mono text-xs focus:border-blue-500 focus:outline-none"
                />
                <div className="absolute right-2 top-1.5 text-[#6b7280] text-[10px] font-mono">
                  MPa
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Formula Reference Panel */}
        <FormulaReference showFormulaInfo={state.showFormulaInfo} />

        {/* Tab Selection Segmented Control */}
        <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm p-1 flex flex-col sm:flex-row gap-1 max-w-2xl mx-auto font-mono">
          <button
            onClick={() => state.setActiveTab('round')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-sm text-xs font-mono uppercase tracking-wider transition cursor-pointer ${
              state.activeTab === 'round'
                ? 'bg-[#141414] text-blue-400 border border-blue-500/50 font-bold'
                : 'text-[#6b7280] hover:text-[#e4e4e4] hover:bg-[#141414]'
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>Single Round Draft</span>
          </button>
          <button
            onClick={() => state.setActiveTab('sequence')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-sm text-xs font-mono uppercase tracking-wider transition cursor-pointer ${
              state.activeTab === 'sequence'
                ? 'bg-[#141414] text-purple-400 border border-purple-500/50 font-bold'
                : 'text-[#6b7280] hover:text-[#e4e4e4] hover:bg-[#141414]'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Multi-Draft Sequence</span>
          </button>
          <button
            onClick={() => state.setActiveTab('flat')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-sm text-xs font-mono uppercase tracking-wider transition cursor-pointer ${
              state.activeTab === 'flat'
                ? 'bg-[#141414] text-emerald-400 border border-emerald-500/50 font-bold'
                : 'text-[#6b7280] hover:text-[#e4e4e4] hover:bg-[#141414]'
            }`}
          >
            <Ruler className="h-3.5 w-3.5" />
            <span>Flat Sizing Profile</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start font-mono">
          {state.activeTab === 'round' && <RoundCalculator {...roundProps} />}
          {state.activeTab === 'sequence' && <SequenceCalculator {...seqProps} />}
          {state.activeTab === 'flat' && <FlatCalculator {...flatProps} />}
        </div>

      </div>
    </div>
  )
}
