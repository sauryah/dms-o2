import React, { useState } from 'react'
import { Calculator, Ruler, RotateCcw, TrendingDown, ArrowRight, Table, HelpCircle, Layers } from 'lucide-react'

export function CalculatorPage() {
  const [activeTab, setActiveTab] = useState<'round' | 'sequence' | 'flat'>('round')

  // Tab 1: Round Die State
  const [roundCalcMode, setRoundCalcMode] = useState<'forward' | 'backward_red' | 'backward_elong'>('forward')
  const [roundInlet, setRoundInlet] = useState<string>('8.00')
  const [roundOutlet, setRoundOutlet] = useState<string>('6.50')
  const [roundTargetRed, setRoundTargetRed] = useState<string>('20.0')
  const [roundTargetElong, setRoundTargetElong] = useState<string>('25.0')

  // Tab 2: Sequence State
  const [seqStart, setSeqStart] = useState<string>('8.00')
  const [seqEnd, setSeqEnd] = useState<string>('2.50')
  const [seqReduction, setSeqReduction] = useState<string>('20.0')

  // Tab 3: Flat Die State
  const [flatInWidth, setFlatInWidth] = useState<string>('20.00')
  const [flatInThick, setFlatInThick] = useState<string>('5.00')
  const [flatOutWidth, setFlatOutWidth] = useState<string>('18.00')
  const [flatOutThick, setFlatOutThick] = useState<string>('4.50')

  // Formulas explanations
  const [showFormulaInfo, setShowFormulaInfo] = useState<boolean>(true)

  // 1. Calculate Single Round
  const getRoundResults = () => {
    const inVal = parseFloat(roundInlet)
    const outVal = parseFloat(roundOutlet)
    const targetRed = parseFloat(roundTargetRed)
    const targetElong = parseFloat(roundTargetElong)

    if (isNaN(inVal) || inVal <= 0) return null

    const inArea = Math.PI * Math.pow(inVal / 2, 2)

    if (roundCalcMode === 'forward') {
      if (isNaN(outVal) || outVal <= 0 || outVal >= inVal) return null
      const outArea = Math.PI * Math.pow(outVal / 2, 2)
      const reduction = ((inArea - outArea) / inArea) * 100
      const elongation = ((inArea / outArea) - 1) * 100
      const elongationRatio = inArea / outArea
      return {
        outlet: outVal,
        reduction,
        elongation,
        elongationRatio,
        inArea,
        outArea
      }
    } else if (roundCalcMode === 'backward_red') {
      if (isNaN(targetRed) || targetRed <= 0 || targetRed >= 100) return null
      const outArea = inArea * (1 - targetRed / 100)
      const outValCalced = 2 * Math.sqrt(outArea / Math.PI)
      const elongation = ((inArea / outArea) - 1) * 100
      return {
        outlet: outValCalced,
        reduction: targetRed,
        elongation,
        elongationRatio: inArea / outArea,
        inArea,
        outArea
      }
    } else {
      // backward_elong
      if (isNaN(targetElong) || targetElong <= 0) return null
      const outArea = inArea / (1 + targetElong / 100)
      const outValCalced = 2 * Math.sqrt(outArea / Math.PI)
      const reduction = ((inArea - outArea) / inArea) * 100
      return {
        outlet: outValCalced,
        reduction,
        elongation: targetElong,
        elongationRatio: 1 + targetElong / 100,
        inArea,
        outArea
      }
    }
  }

  // 2. Calculate Multi-Draft Sequence
  const getSequenceResults = () => {
    const start = parseFloat(seqStart)
    const end = parseFloat(seqEnd)
    const avgRed = parseFloat(seqReduction)

    if (isNaN(start) || start <= 0 || isNaN(end) || end <= 0 || start <= end || isNaN(avgRed) || avgRed <= 0 || avgRed >= 100) {
      return null
    }

    const steps = []
    let currentDia = start
    const targetRedMultiplier = 1 - avgRed / 100
    let safetyCounter = 0

    while (currentDia > end && safetyCounter < 50) {
      safetyCounter++
      const nextArea = (Math.PI * Math.pow(currentDia / 2, 2)) * targetRedMultiplier
      const nextDia = 2 * Math.sqrt(nextArea / Math.PI)

      if (nextDia <= end) {
        // Last step goes straight to target end diameter
        const inArea = Math.PI * Math.pow(currentDia / 2, 2)
        const outArea = Math.PI * Math.pow(end / 2, 2)
        const actualRed = ((inArea - outArea) / inArea) * 100
        const actualElong = ((inArea / outArea) - 1) * 100
        steps.push({
          draft: steps.length + 1,
          inlet: currentDia,
          outlet: end,
          reduction: actualRed,
          elongation: actualElong
        })
        break
      } else {
        steps.push({
          draft: steps.length + 1,
          inlet: currentDia,
          outlet: nextDia,
          reduction: avgRed,
          elongation: (1 / targetRedMultiplier - 1) * 100
        })
        currentDia = nextDia
      }
    }

    // Cumulative stats
    const startArea = Math.PI * Math.pow(start / 2, 2)
    const endArea = Math.PI * Math.pow(end / 2, 2)
    const totalReduction = ((startArea - endArea) / startArea) * 100
    const totalElongation = ((startArea / endArea) - 1) * 100

    return {
      steps,
      totalReduction,
      totalElongation
    }
  }

  // 3. Calculate Flat Draft
  const getFlatResults = () => {
    const inW = parseFloat(flatInWidth)
    const inT = parseFloat(flatInThick)
    const outW = parseFloat(flatOutWidth)
    const outT = parseFloat(flatOutThick)

    if (isNaN(inW) || inW <= 0 || isNaN(inT) || inT <= 0 || isNaN(outW) || outW <= 0 || isNaN(outT) || outT <= 0) {
      return null
    }

    const inArea = inW * inT
    const outArea = outW * outT

    if (outArea >= inArea) return null

    const reduction = ((inArea - outArea) / inArea) * 100
    const elongation = ((inArea / outArea) - 1) * 100
    const aspectIn = inW / inT
    const aspectOut = outW / outT

    return {
      inArea,
      outArea,
      reduction,
      elongation,
      aspectIn,
      aspectOut
    }
  }

  const roundResults = getRoundResults()
  const sequenceResults = getSequenceResults()
  const flatResults = getFlatResults()

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <Calculator className="h-8 w-8 text-blue-500" />
            Engineering Sizing & Elongation Calculator
          </h1>
          <p className="text-slate-400 mt-2 text-sm max-w-2xl">
            Compute draft schedules, percentage elongation, area reduction, and multi-pass sequences for round wire and flat strip drawing.
          </p>
        </div>
        
        <button 
          onClick={() => setShowFormulaInfo(!showFormulaInfo)}
          className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-350 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all"
        >
          <HelpCircle className="h-4 w-4 text-blue-400" />
          {showFormulaInfo ? 'Hide formulas' : 'Show formulas'}
        </button>
      </div>

      {/* Formula Cheat Sheet */}
      {showFormulaInfo && (
        <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-6 mb-8 grid grid-cols-1 md:grid-cols-3 gap-6 transition-all duration-355">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-2">Area Reduction (Draft)</h4>
            <p className="text-slate-300 text-sm font-mono mb-2">R = ((A₁ - A₂) / A₁) × 100%</p>
            <p className="text-slate-500 text-xs leading-relaxed">
              Represents the percentage decrease in the wire's cross-sectional area as it passes through the die.
            </p>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400 mb-2">Elongation</h4>
            <p className="text-slate-300 text-sm font-mono mb-2">E = ((A₁ / A₂) - 1) × 100%</p>
            <p className="text-slate-500 text-xs leading-relaxed">
              Measures how much the length of the wire increases due to plastic deformation. Direct consequence of conservation of volume.
            </p>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2">Elongation Ratio</h4>
            <p className="text-slate-300 text-sm font-mono mb-2">λ = A₁ / A₂ = L₂ / L₁</p>
            <p className="text-slate-500 text-xs leading-relaxed">
              The ratio of raw inlet area to finished outlet area. Also corresponds to the velocity increase ratio of the wire.
            </p>
          </div>
        </div>
      )}

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-800 mb-8 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('round')}
          className={`flex items-center gap-2 px-6 py-4.5 text-sm font-bold border-b-2 whitespace-nowrap transition-all duration-200 ${
            activeTab === 'round' 
              ? 'border-blue-500 text-blue-400 bg-slate-950/20' 
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-950/10'
          }`}
        >
          <Calculator className="h-4.5 w-4.5" />
          Single Round Draft
        </button>
        <button
          onClick={() => setActiveTab('sequence')}
          className={`flex items-center gap-2 px-6 py-4.5 text-sm font-bold border-b-2 whitespace-nowrap transition-all duration-200 ${
            activeTab === 'sequence' 
              ? 'border-purple-500 text-purple-400 bg-slate-950/20' 
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-950/10'
          }`}
        >
          <Layers className="h-4.5 w-4.5" />
          Multi-Draft Sequence
        </button>
        <button
          onClick={() => setActiveTab('flat')}
          className={`flex items-center gap-2 px-6 py-4.5 text-sm font-bold border-b-2 whitespace-nowrap transition-all duration-200 ${
            activeTab === 'flat' 
              ? 'border-emerald-500 text-emerald-400 bg-slate-950/20' 
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-950/10'
          }`}
        >
          <Ruler className="h-4.5 w-4.5" />
          Flat Rectangular Sizing
        </button>
      </div>

      {/* Tabs Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* TAB 1: SINGLE ROUND DRAFT */}
        {activeTab === 'round' && (
          <>
            {/* Input Form Column */}
            <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
              <h3 className="text-lg font-bold text-white mb-4">Draft Inputs</h3>
              
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Calculation Mode</label>
                <div className="grid grid-cols-1 gap-2">
                  <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    roundCalcMode === 'forward' ? 'bg-blue-500/10 border-blue-500/40 text-blue-400' : 'bg-slate-950/40 border-slate-850 text-slate-400 hover:bg-slate-950/60'
                  }`}>
                    <input 
                      type="radio" 
                      name="calcMode" 
                      checked={roundCalcMode === 'forward'} 
                      onChange={() => setRoundCalcMode('forward')} 
                      className="accent-blue-500"
                    />
                    <div>
                      <span className="text-sm font-bold block">Forward Calculation</span>
                      <span className="text-[10px] text-slate-500 font-medium">Input inlet & outlet diameters to get Reduction / Elongation</span>
                    </div>
                  </label>

                  <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    roundCalcMode === 'backward_red' ? 'bg-blue-500/10 border-blue-500/40 text-blue-400' : 'bg-slate-950/40 border-slate-850 text-slate-400 hover:bg-slate-950/60'
                  }`}>
                    <input 
                      type="radio" 
                      name="calcMode" 
                      checked={roundCalcMode === 'backward_red'} 
                      onChange={() => setRoundCalcMode('backward_red')} 
                      className="accent-blue-500"
                    />
                    <div>
                      <span className="text-sm font-bold block">Target Area Reduction</span>
                      <span className="text-[10px] text-slate-500 font-medium">Input inlet diameter & desired reduction to calculate outlet size</span>
                    </div>
                  </label>

                  <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    roundCalcMode === 'backward_elong' ? 'bg-blue-500/10 border-blue-500/40 text-blue-400' : 'bg-slate-950/40 border-slate-850 text-slate-400 hover:bg-slate-950/60'
                  }`}>
                    <input 
                      type="radio" 
                      name="calcMode" 
                      checked={roundCalcMode === 'backward_elong'} 
                      onChange={() => setRoundCalcMode('backward_elong')} 
                      className="accent-blue-500"
                    />
                    <div>
                      <span className="text-sm font-bold block">Target Elongation</span>
                      <span className="text-[10px] text-slate-500 font-medium">Input inlet diameter & desired elongation to calculate outlet size</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-850">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Inlet Diameter (d₁)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      step="0.01" 
                      value={roundInlet}
                      onChange={(e) => setRoundInlet(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-white font-mono focus:border-blue-500 focus:outline-none"
                    />
                    <span className="absolute right-4 top-3 text-slate-500 font-bold text-sm">mm</span>
                  </div>
                </div>

                {roundCalcMode === 'forward' && (
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Outlet Diameter (d₂)</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        step="0.01" 
                        value={roundOutlet}
                        onChange={(e) => setRoundOutlet(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-white font-mono focus:border-blue-500 focus:outline-none"
                      />
                      <span className="absolute right-4 top-3 text-slate-500 font-bold text-sm">mm</span>
                    </div>
                  </div>
                )}

                {roundCalcMode === 'backward_red' && (
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Target Area Reduction (R)</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        step="0.1" 
                        value={roundTargetRed}
                        onChange={(e) => setRoundTargetRed(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-white font-mono focus:border-blue-500 focus:outline-none"
                      />
                      <span className="absolute right-4 top-3 text-slate-500 font-bold text-sm">%</span>
                    </div>
                  </div>
                )}

                {roundCalcMode === 'backward_elong' && (
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Target Elongation (E)</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        step="0.1" 
                        value={roundTargetElong}
                        onChange={(e) => setRoundTargetElong(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-white font-mono focus:border-blue-500 focus:outline-none"
                      />
                      <span className="absolute right-4 top-3 text-slate-500 font-bold text-sm">%</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Results Display Column */}
            <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-white mb-6">Draft Calculation Output</h3>
                
                {roundResults ? (
                  <div className="space-y-6">
                    {/* Visual Drawing representation */}
                    <div className="bg-slate-950 border border-slate-850 rounded-2xl p-6 flex items-center justify-center gap-8 relative overflow-hidden">
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Inlet</span>
                        <div 
                          className="bg-blue-600/20 border border-blue-500/40 rounded-full flex items-center justify-center text-blue-300 font-bold text-xs"
                          style={{ 
                            width: `${Math.min(100, Math.max(40, parseFloat(roundInlet) * 8))}px`, 
                            height: `${Math.min(100, Math.max(40, parseFloat(roundInlet) * 8))}px` 
                          }}
                        >
                          {parseFloat(roundInlet).toFixed(2)}
                        </div>
                      </div>

                      <div className="flex flex-col items-center">
                        <ArrowRight className="h-6 w-6 text-slate-500 animate-pulse" />
                        <span className="text-[10px] font-bold text-blue-400/80 mt-1 font-mono">
                          -{roundResults.reduction.toFixed(1)}% Area
                        </span>
                      </div>

                      <div className="flex flex-col items-center">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Outlet</span>
                        <div 
                          className="bg-purple-600/20 border border-purple-500/40 rounded-full flex items-center justify-center text-purple-300 font-bold text-xs"
                          style={{ 
                            width: `${Math.min(100, Math.max(30, roundResults.outlet * 8))}px`, 
                            height: `${Math.min(100, Math.max(30, roundResults.outlet * 8))}px` 
                          }}
                        >
                          {roundResults.outlet.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {/* Stats details */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="bg-slate-950/40 border border-slate-850 p-4.5 rounded-2xl">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Calculated Outlet Size</span>
                        <span className="text-xl font-extrabold text-white font-mono">
                          {roundResults.outlet.toFixed(3)} <span className="text-xs text-slate-400">mm</span>
                        </span>
                      </div>

                      <div className="bg-slate-950/40 border border-slate-850 p-4.5 rounded-2xl">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Area Reduction (Draft)</span>
                        <span className="text-xl font-extrabold text-blue-400 font-mono">
                          {roundResults.reduction.toFixed(2)}%
                        </span>
                      </div>

                      <div className="bg-slate-950/40 border border-slate-850 p-4.5 rounded-2xl">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Elongation</span>
                        <span className="text-xl font-extrabold text-purple-400 font-mono">
                          {roundResults.elongation.toFixed(2)}%
                        </span>
                      </div>

                      <div className="bg-slate-950/40 border border-slate-850 p-4.5 rounded-2xl">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Elongation Ratio (λ)</span>
                        <span className="text-xl font-extrabold text-emerald-400 font-mono">
                          {roundResults.elongationRatio.toFixed(3)}
                        </span>
                      </div>

                      <div className="bg-slate-950/40 border border-slate-850 p-4.5 rounded-2xl">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Inlet Area (A₁)</span>
                        <span className="text-sm font-bold text-slate-355 font-mono">
                          {roundResults.inArea.toFixed(3)} <span className="text-[10px] text-slate-500">mm²</span>
                        </span>
                      </div>

                      <div className="bg-slate-950/40 border border-slate-850 p-4.5 rounded-2xl">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Outlet Area (A₂)</span>
                        <span className="text-sm font-bold text-slate-355 font-mono">
                          {roundResults.outArea.toFixed(3)} <span className="text-[10px] text-slate-500">mm²</span>
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-slate-500 italic text-sm py-12 text-center">
                    Please provide valid input dimensions above to view sizing outputs.
                  </div>
                )}
              </div>

              {roundResults && (
                <div className="mt-8 border-t border-slate-850 pt-4 text-xs text-slate-500 flex justify-between">
                  <span>Volume balance: A₁L₁ = A₂L₂</span>
                  <span>Rounded to 3 decimal places</span>
                </div>
              )}
            </div>
          </>
        )}

        {/* TAB 2: MULTI-DRAFT SEQUENCE GENERATOR */}
        {activeTab === 'sequence' && (
          <>
            {/* Input Form Column */}
            <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
              <h3 className="text-lg font-bold text-white mb-4">Sequence Inputs</h3>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Start Wire Diameter</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      step="0.01" 
                      value={seqStart}
                      onChange={(e) => setSeqStart(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-white font-mono focus:border-purple-500 focus:outline-none"
                    />
                    <span className="absolute right-4 top-3 text-slate-500 font-bold text-sm">mm</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Target End Diameter</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      step="0.01" 
                      value={seqEnd}
                      onChange={(e) => setSeqEnd(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-white font-mono focus:border-purple-500 focus:outline-none"
                    />
                    <span className="absolute right-4 top-3 text-slate-500 font-bold text-sm">mm</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Target Area Reduction / Pass</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      step="0.5" 
                      value={seqReduction}
                      onChange={(e) => setSeqReduction(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-white font-mono focus:border-purple-500 focus:outline-none"
                    />
                    <span className="absolute right-4 top-3 text-slate-500 font-bold text-sm">%</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Standard reduction averages between 15% and 25% per drawing pass.
                  </p>
                </div>
              </div>
            </div>

            {/* Results Display Column */}
            <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-6">Generated Sizing Sequence</h3>

              {sequenceResults && sequenceResults.steps.length > 0 ? (
                <div className="space-y-6">
                  {/* Sequence Summary cards */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-slate-950/40 border border-slate-850 p-4.5 rounded-2xl">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Total Passes (Dies)</span>
                      <span className="text-2xl font-black text-purple-400 font-mono">
                        {sequenceResults.steps.length}
                      </span>
                    </div>
                    <div className="bg-slate-950/40 border border-slate-850 p-4.5 rounded-2xl">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Total Cumulative Reduction</span>
                      <span className="text-2xl font-black text-blue-400 font-mono">
                        {sequenceResults.totalReduction.toFixed(1)}%
                      </span>
                    </div>
                    <div className="bg-slate-950/40 border border-slate-850 p-4.5 rounded-2xl">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Total Elongation Factor</span>
                      <span className="text-2xl font-black text-emerald-400 font-mono">
                        {((sequenceResults.totalElongation / 100) + 1).toFixed(2)}x
                      </span>
                    </div>
                  </div>

                  {/* Sizing sequence list */}
                  <div className="border border-slate-850 rounded-2xl overflow-hidden bg-slate-950/30">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-850 bg-slate-950/80">
                          <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400">Pass</th>
                          <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400">Inlet Size</th>
                          <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400"></th>
                          <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400">Die Sizing (Outlet)</th>
                          <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400 text-right">Draft Reduction</th>
                          <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400 text-right">Elongation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850/60 font-mono text-sm">
                        {sequenceResults.steps.map((step) => (
                          <tr key={step.draft} className="hover:bg-slate-900/40 transition-colors">
                            <td className="p-4 font-bold text-slate-400">{step.draft}</td>
                            <td className="p-4 text-slate-350">{step.inlet.toFixed(3)} mm</td>
                            <td className="p-4">
                              <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
                            </td>
                            <td className="p-4 text-white font-bold">{step.outlet.toFixed(3)} mm</td>
                            <td className="p-4 text-right text-blue-400 font-bold">{step.reduction.toFixed(1)}%</td>
                            <td className="p-4 text-right text-purple-400 font-medium">+{step.elongation.toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-slate-500 italic text-sm py-12 text-center">
                  Invalid sequence range. Sizing sequence will be plotted here once valid values are entered.
                </div>
              )}
            </div>
          </>
        )}

        {/* TAB 3: FLAT RECTANGULAR SIZING */}
        {activeTab === 'flat' && (
          <>
            {/* Input Form Column */}
            <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
              <h3 className="text-lg font-bold text-white mb-4">Rectangular Draft Inputs</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Inlet Dimensions (Raw)</h4>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Width (w₁)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      step="0.01" 
                      value={flatInWidth}
                      onChange={(e) => setFlatInWidth(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-white font-mono focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Thickness (t₁)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      step="0.01" 
                      value={flatInThick}
                      onChange={(e) => setFlatInThick(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-white font-mono focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="col-span-2 pt-4 border-t border-slate-850">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Outlet Dimensions (Finished)</h4>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Width (w₂)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      step="0.01" 
                      value={flatOutWidth}
                      onChange={(e) => setFlatOutWidth(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-white font-mono focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Thickness (t₂)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      step="0.01" 
                      value={flatOutThick}
                      onChange={(e) => setFlatOutThick(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-white font-mono focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Results Display Column */}
            <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-white mb-6">Flat Deformation Metrics</h3>

                {flatResults ? (
                  <div className="space-y-6">
                    {/* Visual Comparison box */}
                    <div className="bg-slate-950 border border-slate-850 rounded-2xl p-6 flex flex-col items-center justify-center gap-6 relative overflow-hidden">
                      <div className="flex items-center gap-8">
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Inlet Profile</span>
                          <div 
                            className="bg-emerald-600/10 border border-emerald-500/40 rounded flex items-center justify-center text-emerald-300 font-bold text-xs"
                            style={{ 
                              width: `${Math.min(120, parseFloat(flatInWidth) * 4)}px`, 
                              height: `${Math.min(60, parseFloat(flatInThick) * 4)}px` 
                            }}
                          >
                            {parseFloat(flatInWidth).toFixed(1)}x{parseFloat(flatInThick).toFixed(1)}
                          </div>
                        </div>

                        <ArrowRight className="h-5 w-5 text-slate-500" />

                        <div className="flex flex-col items-center">
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Outlet Profile</span>
                          <div 
                            className="bg-blue-600/10 border border-blue-500/40 rounded flex items-center justify-center text-blue-300 font-bold text-xs"
                            style={{ 
                              width: `${Math.min(120, parseFloat(flatOutWidth) * 4)}px`, 
                              height: `${Math.min(60, parseFloat(flatOutThick) * 4)}px` 
                            }}
                          >
                            {parseFloat(flatOutWidth).toFixed(1)}x{parseFloat(flatOutThick).toFixed(1)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Flat Stats Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-950/40 border border-slate-850 p-4.5 rounded-2xl">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Inlet Area (A₁)</span>
                        <span className="text-lg font-bold text-white font-mono">
                          {flatResults.inArea.toFixed(2)} <span className="text-xs text-slate-400">mm²</span>
                        </span>
                      </div>

                      <div className="bg-slate-950/40 border border-slate-850 p-4.5 rounded-2xl">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Outlet Area (A₂)</span>
                        <span className="text-lg font-bold text-white font-mono">
                          {flatResults.outArea.toFixed(2)} <span className="text-xs text-slate-400">mm²</span>
                        </span>
                      </div>

                      <div className="bg-slate-950/45 border border-slate-850 p-4.5 rounded-2xl">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Area Reduction (Draft)</span>
                        <span className="text-xl font-extrabold text-emerald-450 font-mono">
                          {flatResults.reduction.toFixed(2)}%
                        </span>
                      </div>

                      <div className="bg-slate-950/45 border border-slate-850 p-4.5 rounded-2xl">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Elongation</span>
                        <span className="text-xl font-extrabold text-blue-450 font-mono">
                          {flatResults.elongation.toFixed(2)}%
                        </span>
                      </div>

                      <div className="bg-slate-950/40 border border-slate-850 p-4.5 rounded-2xl">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Inlet Aspect Ratio (w/t)</span>
                        <span className="text-sm font-bold text-slate-350 font-mono">
                          {flatResults.aspectIn.toFixed(2)}:1
                        </span>
                      </div>

                      <div className="bg-slate-950/40 border border-slate-850 p-4.5 rounded-2xl">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Outlet Aspect Ratio (w/t)</span>
                        <span className="text-sm font-bold text-slate-355 font-mono">
                          {flatResults.aspectOut.toFixed(2)}:1
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-slate-500 italic text-sm py-12 text-center">
                    Please provide valid input dimensions above to view rectangular draft metrics.
                  </div>
                )}
              </div>

              {flatResults && (
                <div className="mt-8 border-t border-slate-850 pt-4 text-xs text-slate-500">
                  Flat strip rolling or drawing assumes uniform deformation profile.
                </div>
              )}
            </div>
          </>
        )}

      </div>
    </div>
  )
}
