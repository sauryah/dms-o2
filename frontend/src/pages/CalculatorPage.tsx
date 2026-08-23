import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calculator,
  Sliders,
  Zap,
  BookOpen,
  Layers,
  Ruler,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Settings2,
  Activity,
  ShieldCheck
} from 'lucide-react'
import { APP_VERSION } from '../version'
import { useCalculatorState } from './calculator/useCalculatorState'
import { FormulaReference } from './calculator/FormulaReference'
import { RoundCalculator } from './calculator/RoundCalculator'
import { SequenceCalculator } from './calculator/SequenceCalculator'
import { FlatCalculator } from './calculator/FlatCalculator'

export function CalculatorPage() {
  const state = useCalculatorState()
  const [showAdvancedPhysics, setShowAdvancedPhysics] = useState(false)
  const [showFormulaModal, setShowFormulaModal] = useState(false)

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
    exportSequenceExcel: state.exportSequenceExcel,
    copySequenceClipboard: state.copySequenceClipboard,
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

  const materialNames: Record<string, string> = {
    copper_soft: 'Copper (Annealed)',
    copper_hard: 'Copper (Hard-Drawn)',
    aluminum: 'Aluminum (EC Grade)',
    steel_low: 'Low-Carbon Steel',
    custom: 'Custom Limit'
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] font-mono pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">

        {/* 1. Modern Hero Header with Quick Preset Pills */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono font-bold tracking-widest text-blue-400 uppercase bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/25 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                  PHYSICS SIZING ENGINE
                </span>
                <span className="text-[10px] text-[var(--color-muted)] font-mono uppercase tracking-wider">
                  REAL-TIME CONTACT MECHANICS
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-[var(--color-text)] uppercase tracking-tight flex items-center gap-2.5 font-heading">
                <Calculator className="h-6 w-6 text-blue-500" />
                Deformation Sizing Workspace
              </h1>
              <p className="text-[var(--color-muted)] text-xs max-w-3xl leading-relaxed">
                Compute single-pass & multi-pass reduction schedules, elongation strains, drawing force tension, and motor power requirements for wire drawing and strip profile rolling.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <button
                type="button"
                onClick={() => setShowFormulaModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold font-mono uppercase rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition cursor-pointer"
              >
                <BookOpen className="h-4 w-4" />
                <span>Reference Manual</span>
              </button>
              <div className="hidden sm:flex items-center gap-1 px-3 py-2 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl text-[var(--color-muted)] text-[11px] font-mono">
                <Zap className="h-3.5 w-3.5 text-amber-500" />
                <span>V{APP_VERSION}</span>
              </div>
            </div>
          </div>

          {/* Quick Schedule Presets */}
          <div className="pt-2 border-t border-[var(--color-border)] flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-amber-400" />
              Quick Presets:
            </span>
            <button
              type="button"
              onClick={() => state.loadPreset('copper_std')}
              className="px-2.5 py-1 rounded-lg bg-[var(--color-surface-2)] hover:bg-[var(--color-border)] text-xs text-[var(--color-text)] border border-[var(--color-border)] transition cursor-pointer"
            >
              Copper Rod (8.0 → 2.5 mm)
            </button>
            <button
              type="button"
              onClick={() => state.loadPreset('copper_fine')}
              className="px-2.5 py-1 rounded-lg bg-[var(--color-surface-2)] hover:bg-[var(--color-border)] text-xs text-[var(--color-text)] border border-[var(--color-border)] transition cursor-pointer"
            >
              Fine Wire (2.5 → 0.5 mm)
            </button>
            <button
              type="button"
              onClick={() => state.loadPreset('aluminum_rod')}
              className="px-2.5 py-1 rounded-lg bg-[var(--color-surface-2)] hover:bg-[var(--color-border)] text-xs text-[var(--color-text)] border border-[var(--color-border)] transition cursor-pointer"
            >
              Aluminum EC Rod (9.5 → 3.0 mm)
            </button>
            <button
              type="button"
              onClick={() => state.loadPreset('steel_breakdown')}
              className="px-2.5 py-1 rounded-lg bg-[var(--color-surface-2)] hover:bg-[var(--color-border)] text-xs text-[var(--color-text)] border border-[var(--color-border)] transition cursor-pointer"
            >
              Steel 20% Single Draft
            </button>
            <button
              type="button"
              onClick={() => state.loadPreset('flat_busbar')}
              className="px-2.5 py-1 rounded-lg bg-[var(--color-surface-2)] hover:bg-[var(--color-border)] text-xs text-[var(--color-text)] border border-[var(--color-border)] transition cursor-pointer"
            >
              Flat Busbar Strip (20×5 mm)
            </button>
          </div>
        </div>

        {/* 2. Global Material Configuration Bar with Collapsible Physics Drawer */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 shadow-sm space-y-4 font-mono">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
                <Sliders className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">
                    Raw Material & Deformation Safety Limits
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Max Safe Single Draft: {state.getMaterialLimit()}%
                  </span>
                </div>
                <p className="text-[11px] text-[var(--color-muted)] m-0">
                  Select alloy grade to calibrate allowable plastic flow limits and work-hardening thresholds.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <select
                value={state.materialType}
                onChange={(e) => state.setMaterialType(e.target.value as any)}
                aria-label="Stock material type"
                className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3.5 py-2 text-[var(--color-text)] font-mono text-xs focus:border-blue-500 focus:outline-none cursor-pointer uppercase font-bold"
              >
                <option value="copper_soft">Copper (Soft/Annealed) — Max 30%</option>
                <option value="copper_hard">Copper (Hard-Drawn) — Max 20%</option>
                <option value="aluminum">Aluminum (EC Grade) — Max 25%</option>
                <option value="steel_low">Low-Carbon Steel — Max 22%</option>
                <option value="custom">Custom Limit...</option>
              </select>

              {state.materialType === 'custom' && (
                <div className="relative rounded-xl w-24">
                  <input
                    type="number"
                    step="0.1"
                    value={state.customLimit}
                    onChange={(e) => state.setCustomLimit(e.target.value)}
                    placeholder="Limit %"
                    className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-2.5 py-2 pr-7 text-[var(--color-text)] font-mono text-xs focus:border-blue-500 focus:outline-none"
                  />
                  <span className="absolute right-2 top-2 text-[10px] text-[var(--color-muted)] font-bold">%</span>
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowAdvancedPhysics(!showAdvancedPhysics)}
                className={`p-2 rounded-xl border transition cursor-pointer flex items-center gap-1 text-xs ${
                  showAdvancedPhysics
                    ? 'bg-blue-500/15 border-blue-500/30 text-blue-400'
                    : 'bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-text)]'
                }`}
                title="Toggle Advanced Physics & Friction Parameters"
              >
                <Settings2 className="h-4 w-4" />
                {showAdvancedPhysics ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          {/* Collapsible Advanced Physics Deck */}
          <AnimatePresence>
            {showAdvancedPhysics && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="pt-4 border-t border-[var(--color-border)] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3"
              >
                {/* 1. Linear Speed */}
                <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-3 space-y-1">
                  <label htmlFor="calc-draw-speed" className="text-[10px] text-[var(--color-muted)] uppercase tracking-wider block font-bold">
                    Drawing Speed (v)
                  </label>
                  <div className="relative">
                    <input
                      id="calc-draw-speed"
                      type="number"
                      step="0.1"
                      value={state.drawSpeed}
                      onChange={(e) => state.setDrawSpeed(e.target.value)}
                      className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 pr-8 text-xs font-bold text-[var(--color-text)] focus:border-blue-500 focus:outline-none"
                    />
                    <span className="absolute right-2 top-1.5 text-[10px] text-[var(--color-muted)]">m/s</span>
                  </div>
                </div>

                {/* 2. Die Half-Angle */}
                <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-3 space-y-1">
                  <label htmlFor="calc-die-angle" className="text-[10px] text-[var(--color-muted)] uppercase tracking-wider block font-bold">
                    Die Half-Angle (α)
                  </label>
                  <div className="relative">
                    <input
                      id="calc-die-angle"
                      type="number"
                      step="0.5"
                      value={state.dieAngle}
                      onChange={(e) => state.setDieAngle(e.target.value)}
                      className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 pr-6 text-xs font-bold text-[var(--color-text)] focus:border-blue-500 focus:outline-none"
                    />
                    <span className="absolute right-2 top-1.5 text-[10px] text-[var(--color-muted)]">°</span>
                  </div>
                </div>

                {/* 3. Lubrication */}
                <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-3 space-y-1">
                  <label htmlFor="calc-lubrication" className="text-[10px] text-[var(--color-muted)] uppercase tracking-wider block font-bold">
                    Lubrication Regime (μ)
                  </label>
                  <select
                    id="calc-lubrication"
                    value={state.lubrication}
                    onChange={(e) => state.setLubrication(e.target.value as any)}
                    className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 text-xs font-bold text-[var(--color-text)] focus:border-blue-500 focus:outline-none cursor-pointer"
                  >
                    <option value="hydrodynamic">Hydrodynamic (μ=0.02)</option>
                    <option value="dry_soap">Dry Soap (μ=0.04)</option>
                    <option value="wet_oil">Wet Oil (μ=0.06)</option>
                    <option value="boundary">Boundary (μ=0.10)</option>
                  </select>
                </div>

                {/* 4. Yield Strength */}
                <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-3 space-y-1">
                  <label htmlFor="calc-yield-strength" className="text-[10px] text-[var(--color-muted)] uppercase tracking-wider block font-bold">
                    Yield Strength (σ_y)
                  </label>
                  <div className="relative">
                    <input
                      id="calc-yield-strength"
                      type="number"
                      value={state.yieldStrength}
                      onChange={(e) => state.setYieldStrength(e.target.value)}
                      className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 pr-10 text-xs font-bold text-[var(--color-text)] focus:border-blue-500 focus:outline-none"
                    />
                    <span className="absolute right-2 top-1.5 text-[10px] text-[var(--color-muted)]">MPa</span>
                  </div>
                </div>

                {/* 5. UTS Limit */}
                <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-3 space-y-1">
                  <label htmlFor="calc-uts" className="text-[10px] text-[var(--color-muted)] uppercase tracking-wider block font-bold">
                    UTS Tensile Limit
                  </label>
                  <div className="relative">
                    <input
                      id="calc-uts"
                      type="number"
                      value={state.uts}
                      onChange={(e) => state.setUts(e.target.value)}
                      className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 pr-10 text-xs font-bold text-[var(--color-text)] focus:border-blue-500 focus:outline-none"
                    />
                    <span className="absolute right-2 top-1.5 text-[10px] text-[var(--color-muted)]">MPa</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 3. Animated Segmented Tab Switcher */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-1.5 flex flex-col sm:flex-row gap-1.5 max-w-2xl mx-auto font-mono shadow-sm">
          <button
            type="button"
            onClick={() => state.setActiveTab('round')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
              state.activeTab === 'round'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]'
            }`}
          >
            <Sliders className="h-4 w-4" />
            <span>Single Round Draft</span>
          </button>
          <button
            type="button"
            onClick={() => state.setActiveTab('sequence')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
              state.activeTab === 'sequence'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Multi-Pass Sequence</span>
          </button>
          <button
            type="button"
            onClick={() => state.setActiveTab('flat')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
              state.activeTab === 'flat'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]'
            }`}
          >
            <Ruler className="h-4 w-4" />
            <span>Flat Strip Profiling</span>
          </button>
        </div>

        {/* 4. Active Tab Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start font-mono">
          {state.activeTab === 'round' && <RoundCalculator {...roundProps} />}
          {state.activeTab === 'sequence' && <SequenceCalculator {...seqProps} />}
          {state.activeTab === 'flat' && <FlatCalculator {...flatProps} />}
        </div>

        {/* 5. Reference Manual Modal */}
        <FormulaReference
          showFormulaInfo={showFormulaModal}
          onClose={() => setShowFormulaModal(false)}
          isModal={true}
        />

      </div>
    </div>
  )
}

