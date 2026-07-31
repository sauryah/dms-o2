import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Calculator, Sliders, Zap, BookOpen, Layers, Ruler, Maximize2 } from 'lucide-react'
import { APP_VERSION } from '../version'
import { useCalculatorState } from './calculator/useCalculatorState'
import { FormulaReference } from './calculator/FormulaReference'
import { RoundCalculator } from './calculator/RoundCalculator'
import { SequenceCalculator } from './calculator/SequenceCalculator'
import { FlatCalculator } from './calculator/FlatCalculator'

export function CalculatorPage() {
  const navigate = useNavigate()
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
    <div className="min-h-screen bg-[#050816] text-slate-100 font-sans selection:bg-blue-500/30 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">

        {/* Top Hero Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 pb-6 border-b border-[#1b253b]/80">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold tracking-widest text-blue-400 uppercase bg-blue-950/40 px-2 py-0.5 rounded border border-blue-900/30">
                PHYSICS COMPILATION MODULE
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                CALC ENGINE: ACTIVE
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight font-heading flex items-center gap-3">
              <Calculator className="h-8 w-8 text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
              Deformation Sizing Engine
            </h1>
            <p className="text-slate-400 text-sm max-w-3xl leading-relaxed">
              Analyze mechanical cross-sectional reduction schedules, elongation strains, drawing ratios, and pass sequence geometry layouts for round wire drawing and flat strip profiling.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
            <button
              onClick={() => state.setShowFormulaInfo(!state.showFormulaInfo)}
              className={`flex items-center gap-2  py-2.5 text-xs font-semibold rounded-xl border transition-premium ${
                state.showFormulaInfo
                  ? 'bg-blue-500/10 border-blue-500/40 text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.08)]'
                  : 'bg-[#0D1325] border-[#1b253b] text-slate-400 hover:text-slate-200 hover:bg-[#121A2F]/65'
              }`}
            >
              <BookOpen className="h-4 w-4" />
              <span>Reference Manual</span>
              {state.showFormulaInfo && (
                <span className="relative flex h-2 w-2 ml-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
              )}
            </button>
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-[#0D1325] border border-[#1b253b] rounded-xl text-slate-500 text-xs font-mono">
              <Zap className="h-3.5 w-3.5 text-amber-500" />
              <span>V{APP_VERSION}</span>
            </div>
          </div>
        </div>

        {/* Global Material Selection & Draw Safety Limits */}
        <div className="bg-[#0D1325] border border-[#1b253b] rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-6 animate-fadeIn">
          <div className="space-y-1.5 max-w-xl">
            <div className="flex items-center gap-2">
              <Sliders className="h-4 w-4 text-blue-500" />
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider font-heading">
                Stock Material Configuration
              </span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              Select your raw wire/strip material to configure single-pass draft safety limits and calculate potential yield thresholds.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 shrink-0 w-full md:w-auto">
            <div className="flex-1 sm:flex-none">
              <select
                value={state.materialType}
                onChange={(e) => state.setMaterialType(e.target.value as any)}
                aria-label="Stock material type"
                className="w-full sm:w-64 bg-[#050816] border border-[#1b253b] rounded-xl px-4 py-3 text-white font-mono text-xs focus:border-blue-500/60 focus:outline-none cursor-pointer"
              >
                <option value="copper_soft">Copper (Soft/Annealed) — Max 30%</option>
                <option value="copper_hard">Copper (Hard-Drawn) — Max 20%</option>
                <option value="aluminum">Aluminum (EC Grade) — Max 25%</option>
                <option value="steel_low">Low-Carbon Steel — Max 22%</option>
                <option value="custom">Custom Limit...</option>
              </select>
            </div>

            {state.materialType === 'custom' && (
              <div className="relative rounded-xl shadow-sm w-full sm:w-32 animate-in slide-in-from-left-2 duration-150">
                <input
                  type="number"
                  step="0.1"
                  value={state.customLimit}
                  onChange={(e) => state.setCustomLimit(e.target.value)}
                  placeholder="Limit %"
                  aria-label="Custom material reduction limit percentage"
                  className="w-full bg-[#050816] border border-[#1b253b] rounded-xl px-3 py-3 pr-10 text-white font-mono text-xs focus:border-blue-500/60 focus:outline-none"
                />
                <div className="absolute right-2 top-2 px-1.5 py-0.5 bg-[#121A2F] border border-[#2b3a61]/40 rounded text-slate-400 text-[10px] font-mono font-bold shadow-inner">
                  %
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Physics and Power Configuration Panel */}
        <div className="bg-[#0D1325] border border-[#1b253b] rounded-2xl p-5 shadow-xl space-y-4 animate-fadeIn">
          <div className="flex items-center gap-2 border-b border-[#1b253b] pb-3">
            <Zap className="h-4 w-4 text-amber-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider font-heading">
              Physics & Power Calculations Settings
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <label htmlFor="calc-draw-speed" className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block mb-1.5">
                Drawing Speed (v)
              </label>
              <div className="relative rounded-xl shadow-sm">
                <input
                  id="calc-draw-speed"
                  type="number"
                  step="0.1"
                  value={state.drawSpeed}
                  onChange={(e) => state.setDrawSpeed(e.target.value)}
                  className="w-full bg-[#050816] border border-[#1b253b] rounded-xl px-3.5 py-2.5 pr-14 text-white font-mono text-xs focus:border-blue-500/60 focus:outline-none"
                />
                <div className="absolute right-2 top-2 px-1.5 py-0.5 bg-[#121A2F] border border-[#2b3a61]/40 rounded text-slate-400 text-[9px] font-mono shadow-inner">
                  m/s
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="calc-die-angle" className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block mb-1.5">
                Die Half-Angle (α)
              </label>
              <div className="relative rounded-xl shadow-sm">
                <input
                  id="calc-die-angle"
                  type="number"
                  step="0.5"
                  value={state.dieAngle}
                  onChange={(e) => state.setDieAngle(e.target.value)}
                  className="w-full bg-[#050816] border border-[#1b253b] rounded-xl px-3.5 py-2.5 pr-10 text-white font-mono text-xs focus:border-blue-500/60 focus:outline-none"
                />
                <div className="absolute right-2 top-2 px-1.5 py-0.5 bg-[#121A2F] border border-[#2b3a61]/40 rounded text-slate-400 text-[9px] font-mono shadow-inner">
                  °
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="calc-lubrication" className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block mb-1.5">
                Lubrication (μ)
              </label>
              <select
                id="calc-lubrication"
                value={state.lubrication}
                onChange={(e) => state.setLubrication(e.target.value as any)}
                className="w-full bg-[#050816] border border-[#1b253b] rounded-xl px-3 py-2.5 text-white font-mono text-xs focus:border-blue-500/60 focus:outline-none cursor-pointer h-[38px]"
              >
                <option value="hydrodynamic">Hydrodynamic (μ=0.02)</option>
                <option value="dry_soap">Dry Soap (μ=0.04)</option>
                <option value="wet_oil">Wet Oil (μ=0.06)</option>
                <option value="boundary">Boundary (μ=0.10)</option>
              </select>
            </div>

            <div>
              <label htmlFor="calc-yield-strength" className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block mb-1.5">
                Yield Strength (σ_y)
              </label>
              <div className="relative rounded-xl shadow-sm">
                <input
                  id="calc-yield-strength"
                  type="number"
                  value={state.yieldStrength}
                  onChange={(e) => state.setYieldStrength(e.target.value)}
                  className="w-full bg-[#050816] border border-[#1b253b] rounded-xl px-3.5 py-2.5 pr-14 text-white font-mono text-xs focus:border-blue-500/60 focus:outline-none"
                />
                <div className="absolute right-2 top-2 px-1.5 py-0.5 bg-[#121A2F] border border-[#2b3a61]/40 rounded text-slate-400 text-[9px] font-mono shadow-inner">
                  MPa
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="calc-uts" className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block mb-1.5">
                UTS (Strength limit)
              </label>
              <div className="relative rounded-xl shadow-sm">
                <input
                  id="calc-uts"
                  type="number"
                  value={state.uts}
                  onChange={(e) => state.setUts(e.target.value)}
                  className="w-full bg-[#050816] border border-[#1b253b] rounded-xl px-3.5 py-2.5 pr-14 text-white font-mono text-xs focus:border-blue-500/60 focus:outline-none"
                />
                <div className="absolute right-2 top-2 px-1.5 py-0.5 bg-[#121A2F] border border-[#2b3a61]/40 rounded text-slate-400 text-[9px] font-mono shadow-inner">
                  MPa
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Formula Reference Panel */}
        <FormulaReference showFormulaInfo={state.showFormulaInfo} />

        {/* Tab Selection Segmented Control */}
        <div className="bg-[#0D1325] border border-[#1b253b]/85 rounded-xl p-1 flex flex-col sm:flex-row gap-1 max-w-3xl mx-auto shadow-inner">
          <button
            onClick={() => state.setActiveTab('round')}
            className={`flex-1 flex items-center justify-center gap-2.5 py-3 px-4 rounded-lg text-xs font-bold uppercase tracking-wider transition-premium ${
              state.activeTab === 'round'
                ? 'bg-[#121A2F] text-blue-400 border border-[#2b3a61]/65 shadow-[0_4px_16px_rgba(59,130,246,0.12)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#121A2F]/40'
            }`}
          >
            <Sliders className="h-4 w-4" />
            Single Round Draft
          </button>
          <button
            onClick={() => state.setActiveTab('sequence')}
            className={`flex-1 flex items-center justify-center gap-2.5 py-3 px-4 rounded-lg text-xs font-bold uppercase tracking-wider transition-premium ${
              state.activeTab === 'sequence'
                ? 'bg-[#121A2F] text-purple-400 border border-[#2b3a61]/65 shadow-[0_4px_16px_rgba(168,85,247,0.12)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#121A2F]/40'
            }`}
          >
            <Layers className="h-4 w-4" />
            Multi-Draft Sequence
          </button>
          <button
            onClick={() => state.setActiveTab('flat')}
            className={`flex-1 flex items-center justify-center gap-2.5 py-3 px-4 rounded-lg text-xs font-bold uppercase tracking-wider transition-premium ${
              state.activeTab === 'flat'
                ? 'bg-[#121A2F] text-emerald-400 border border-[#2b3a61]/65 shadow-[0_4px_16px_rgba(16,185,129,0.12)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#121A2F]/40'
            }`}
          >
            <Ruler className="h-4 w-4" />
            Flat Sizing Profile
          </button>
        </div>

        {/* Tab Contents */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {state.activeTab === 'round' && <RoundCalculator {...roundProps} />}
          {state.activeTab === 'sequence' && <SequenceCalculator {...seqProps} />}
          {state.activeTab === 'flat' && <FlatCalculator {...flatProps} />}
        </div>

      </div>
    </div>
  )
}
