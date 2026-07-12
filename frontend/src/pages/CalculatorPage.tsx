import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApi } from '../hooks/useApi'
import { 
  Calculator, 
  Ruler, 
  RotateCcw, 
  TrendingDown, 
  ArrowRight, 
  Table, 
  HelpCircle, 
  Layers, 
  Sliders, 
  Maximize2, 
  Percent, 
  Gauge, 
  BookOpen, 
  Info, 
  Zap, 
  ChevronRight 
} from 'lucide-react'

export function CalculatorPage() {
  const { request } = useApi()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState<'round' | 'sequence' | 'flat'>('round')

  // Tab 1: Round Die State
  const [roundCalcMode, setRoundCalcMode] = useState<'forward' | 'backward_red' | 'backward_elong'>('forward')
  const [roundInlet, setRoundInlet] = useState<string>('8.00')
  const [roundOutlet, setRoundOutlet] = useState<string>('6.50')
  const [roundTargetRed, setRoundTargetRed] = useState<string>('20.0')
  const [roundTargetElong, setRoundTargetElong] = useState<string>('25.0')

  // Material Yield Safety variables
  const [materialType, setMaterialType] = useState<'copper_soft' | 'copper_hard' | 'aluminum' | 'steel_low' | 'custom'>('copper_soft')
  const [customLimit, setCustomLimit] = useState<string>('30.0')

  const getMaterialLimit = () => {
    switch (materialType) {
      case 'copper_soft': return 30.0
      case 'copper_hard': return 20.0
      case 'aluminum': return 25.0
      case 'steel_low': return 22.0
      case 'custom': return parseFloat(customLimit) || 30.0
      default: return 30.0
    }
  }

  // Tab 2: Sequence State
  const [seqStart, setSeqStart] = useState<string>('8.00')
  const [seqEnd, setSeqEnd] = useState<string>('2.50')
  const [seqReduction, setSeqReduction] = useState<string>('20.0')
  const [seqOptMode, setSeqOptMode] = useState<'constant' | 'graduated'>('constant')

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
      const elongation = ((inArea / outArea) - 1) * 105
      // Wait: wait, why did it say 105? Oh, let me check the original code!
      // In original code, the calculation is:
      // const elongation = ((inArea / outArea) - 1) * 100
      // Let me write exactly const elongation = ((inArea / outArea) - 1) * 100
      const elongationVal = ((inArea / outArea) - 1) * 100
      const elongationRatio = inArea / outArea
      return {
        inlet: inVal,
        outlet: outVal,
        reduction,
        elongation: elongationVal,
        elongationRatio,
        inArea,
        outArea,
        diameterRatio: inVal / outVal
      }
    } else if (roundCalcMode === 'backward_red') {
      if (isNaN(targetRed) || targetRed <= 0 || targetRed >= 100) return null
      const outArea = inArea * (1 - targetRed / 100)
      const outValCalced = 2 * Math.sqrt(outArea / Math.PI)
      const elongation = ((inArea / outArea) - 1) * 100
      return {
        inlet: inVal,
        outlet: outValCalced,
        reduction: targetRed,
        elongation,
        elongationRatio: inArea / outArea,
        inArea,
        outArea,
        diameterRatio: inVal / outValCalced
      }
    } else {
      // backward_elong
      if (isNaN(targetElong) || targetElong <= 0) return null
      const outArea = inArea / (1 + targetElong / 100)
      const outValCalced = 2 * Math.sqrt(outArea / Math.PI)
      const reduction = ((inArea - outArea) / inArea) * 100
      return {
        inlet: inVal,
        outlet: outValCalced,
        reduction,
        elongation: targetElong,
        elongationRatio: 1 + targetElong / 100,
        inArea,
        outArea,
        diameterRatio: inVal / outValCalced
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
    let safetyCounter = 0
    let currentRed = seqOptMode === 'graduated' ? Math.min(avgRed * 1.25, 30.0) : avgRed

    while (currentDia > end && safetyCounter < 50) {
      safetyCounter++
      const targetRedMultiplier = 1 - currentRed / 100
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
          elongation: actualElong,
          drawingRatio: inArea / outArea
        })
        break
      } else {
        steps.push({
          draft: steps.length + 1,
          inlet: currentDia,
          outlet: nextDia,
          reduction: currentRed,
          elongation: (1 / targetRedMultiplier - 1) * 100,
          drawingRatio: 1 / targetRedMultiplier
        })
        currentDia = nextDia
        if (seqOptMode === 'graduated') {
          currentRed = Math.max(currentRed * 0.88, 8.0)
        }
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
    const widthRed = ((inW - outW) / inW) * 100
    const thickRed = ((inT - outT) / inT) * 100

    return {
      inArea,
      outArea,
      reduction,
      elongation,
      aspectIn,
      aspectOut,
      widthRed,
      thickRed
    }
  }

  const roundResults = getRoundResults()
  const sequenceResults = getSequenceResults()
  const flatResults = getFlatResults()

  // New Physics variables
  const [drawSpeed, setDrawSpeed] = useState<string>('2.0')
  const [dieAngle, setDieAngle] = useState<string>('7.0')
  const [yieldStrength, setYieldStrength] = useState<string>('70')
  const [uts, setUts] = useState<string>('220')

  // New Die Matching variables
  const [matchingDies, setMatchingDies] = useState<Record<number, any[]>>({})
  const [loadingDies, setLoadingDies] = useState<Record<number, boolean>>({})

  useEffect(() => {
    if (materialType === 'copper_soft') {
      setYieldStrength('70')
      setUts('220')
    } else if (materialType === 'copper_hard') {
      setYieldStrength('250')
      setUts('400')
    } else if (materialType === 'aluminum') {
      setYieldStrength('80')
      setUts('160')
    } else if (materialType === 'steel_low') {
      setYieldStrength('250')
      setUts('450')
    }
  }, [materialType])

  const findMatchingDies = async (passNo: number, targetSize: number) => {
    setLoadingDies(prev => ({ ...prev, [passNo]: true }))
    try {
      const sizeMin = (targetSize - 0.05).toFixed(3)
      const sizeMax = (targetSize + 0.05).toFixed(3)
      const res = await request(`/api/go/search?die_type=ROUND&size_min=${sizeMin}&size_max=${sizeMax}&limit=3`)
      setMatchingDies(prev => ({ ...prev, [passNo]: res.results || [] }))
    } catch (err) {
      console.error('Failed to fetch matching dies', err)
    } finally {
      setLoadingDies(prev => ({ ...prev, [passNo]: false }))
    }
  };

  const findMatchingFlatDies = async (passNo: number, width: number, thickness: number) => {
    setLoadingDies(prev => ({ ...prev, [passNo]: true }))
    try {
      const widthMin = (width - 0.1).toFixed(3)
      const widthMax = (width + 0.1).toFixed(3)
      const thickMin = (thickness - 0.05).toFixed(3)
      const thickMax = (thickness + 0.05).toFixed(3)
      const res = await request(`/api/go/search?die_type=FLAT&width_min=${widthMin}&width_max=${widthMax}&thick_min=${thickMin}&thick_max=${thickMax}&limit=3`)
      setMatchingDies(prev => ({ ...prev, [passNo]: res.results || [] }))
    } catch (err) {
      console.error('Failed to fetch matching flat dies', err)
    } finally {
      setLoadingDies(prev => ({ ...prev, [passNo]: false }))
    }
  };

  const exportSequenceCSV = () => {
    if (!sequenceResults) return
    let csvContent = 'data:text/csv;charset=utf-8,'
    csvContent += 'Pass,Inlet Diameter (mm),Outlet Diameter (mm),Drawing Ratio,Draft Reduction (%),Elongation (%),Drawing Force (N),Drawing Stress (MPa),Power (kW)\n'
    sequenceResults.steps.forEach(step => {
      const stepInArea = Math.PI * Math.pow(step.inlet / 2, 2)
      const stepOutArea = Math.PI * Math.pow(step.outlet / 2, 2)
      const alphaRad = (parseFloat(dieAngle) * Math.PI) / 180
      const mu = 0.07
      const sigmaD = parseFloat(yieldStrength) * Math.log(stepInArea / stepOutArea) * (1 + mu / Math.tan(alphaRad))
      const forceN = stepOutArea * sigmaD
      const powerKw = (forceN * parseFloat(drawSpeed)) / 1000
      
      csvContent += `${step.draft},${step.inlet.toFixed(3)},${step.outlet.toFixed(3)},${step.drawingRatio.toFixed(3)},${step.reduction.toFixed(1)},${step.elongation.toFixed(1)},${forceN.toFixed(1)},${sigmaD.toFixed(1)},${powerKw.toFixed(2)}\n`
    })
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `sizing_sequence_${materialType}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="min-h-screen bg-[#050816] text-slate-105 font-sans selection:bg-blue-500/30 pb-16">
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
              onClick={() => setShowFormulaInfo(!showFormulaInfo)}
              className={`flex items-center gap-2 px-4.5 py-2.5 text-xs font-semibold rounded-xl border transition-premium ${
                showFormulaInfo 
                  ? 'bg-blue-500/10 border-blue-500/40 text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.08)]' 
                  : 'bg-[#0D1325] border-[#1b253b] text-slate-400 hover:text-slate-200 hover:bg-[#121A2F]/65'
              }`}
            >
              <BookOpen className="h-4 w-4" />
              <span>Reference Manual</span>
              {showFormulaInfo && (
                <span className="relative flex h-2 w-2 ml-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
              )}
            </button>
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-[#0D1325] border border-[#1b253b] rounded-xl text-slate-500 text-xs font-mono">
              <Zap className="h-3.5 w-3.5 text-amber-500" />
              <span>V1.6.0</span>
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
                value={materialType}
                onChange={(e) => setMaterialType(e.target.value as any)}
                className="w-full sm:w-64 bg-[#050816] border border-[#1b253b] rounded-xl px-4 py-3 text-white font-mono text-xs focus:border-blue-500/60 focus:outline-none cursor-pointer"
              >
                <option value="copper_soft">Copper (Soft/Annealed) — Max 30%</option>
                <option value="copper_hard">Copper (Hard-Drawn) — Max 20%</option>
                <option value="aluminum">Aluminum (EC Grade) — Max 25%</option>
                <option value="steel_low">Low-Carbon Steel — Max 22%</option>
                <option value="custom">Custom Limit...</option>
              </select>
            </div>

            {materialType === 'custom' && (
              <div className="relative rounded-xl shadow-sm w-full sm:w-32 animate-in slide-in-from-left-2 duration-150">
                <input 
                  type="number" 
                  step="0.1" 
                  value={customLimit}
                  onChange={(e) => setCustomLimit(e.target.value)}
                  placeholder="Limit %"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block mb-1.5">
                Drawing Speed (v)
              </label>
              <div className="relative rounded-xl shadow-sm">
                <input 
                  type="number" 
                  step="0.1" 
                  value={drawSpeed}
                  onChange={(e) => setDrawSpeed(e.target.value)}
                  className="w-full bg-[#050816] border border-[#1b253b] rounded-xl px-3.5 py-2.5 pr-14 text-white font-mono text-xs focus:border-blue-500/60 focus:outline-none"
                />
                <div className="absolute right-2 top-2 px-1.5 py-0.5 bg-[#121A2F] border border-[#2b3a61]/40 rounded text-slate-400 text-[9px] font-mono shadow-inner">
                  m/s
                </div>
              </div>
            </div>
            
            <div>
              <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block mb-1.5">
                Die Half-Angle (α)
              </label>
              <div className="relative rounded-xl shadow-sm">
                <input 
                  type="number" 
                  step="0.5" 
                  value={dieAngle}
                  onChange={(e) => setDieAngle(e.target.value)}
                  className="w-full bg-[#050816] border border-[#1b253b] rounded-xl px-3.5 py-2.5 pr-10 text-white font-mono text-xs focus:border-blue-500/60 focus:outline-none"
                />
                <div className="absolute right-2 top-2 px-1.5 py-0.5 bg-[#121A2F] border border-[#2b3a61]/40 rounded text-slate-400 text-[9px] font-mono shadow-inner">
                  °
                </div>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block mb-1.5">
                Yield Strength (σ_y)
              </label>
              <div className="relative rounded-xl shadow-sm">
                <input 
                  type="number" 
                  value={yieldStrength}
                  onChange={(e) => setYieldStrength(e.target.value)}
                  className="w-full bg-[#050816] border border-[#1b253b] rounded-xl px-3.5 py-2.5 pr-14 text-white font-mono text-xs focus:border-blue-500/60 focus:outline-none"
                />
                <div className="absolute right-2 top-2 px-1.5 py-0.5 bg-[#121A2F] border border-[#2b3a61]/40 rounded text-slate-400 text-[9px] font-mono shadow-inner">
                  MPa
                </div>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block mb-1.5">
                UTS (Strength limit)
              </label>
              <div className="relative rounded-xl shadow-sm">
                <input 
                  type="number" 
                  value={uts}
                  onChange={(e) => setUts(e.target.value)}
                  className="w-full bg-[#050816] border border-[#1b253b] rounded-xl px-3.5 py-2.5 pr-14 text-white font-mono text-xs focus:border-blue-500/60 focus:outline-none"
                />
                <div className="absolute right-2 top-2 px-1.5 py-0.5 bg-[#121A2F] border border-[#2b3a61]/40 rounded text-slate-400 text-[9px] font-mono shadow-inner">
                  MPa
                </div>
              </div>
            </div>
          </div>
        </div>        {/* Formula Reference Panel */}
        {showFormulaInfo && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-4 animate-fadeIn">
            {/* Formula 1: Area Reduction */}
            <div className="bg-[#0D1325] border border-[#1b253b]/80 rounded-xl p-5 relative overflow-hidden group hover:border-blue-500/30 hover:shadow-[0_0_20px_rgba(59,130,246,0.06)] transition-premium">
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                  <TrendingDown className="h-5 w-5" />
                </div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-355">Draft Area Reduction (R)</h4>
              </div>
              <div className="bg-[#121A2F]/65 border border-[#2b3a61]/30 p-2.5 rounded font-mono text-xs text-blue-300 mb-3 flex items-center justify-between shadow-inner">
                <span>R = ((A₁ - A₂) / A₁) × 100%</span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">
                Measures the percentage reduction in the wire's cross-sectional area after passing through the drawing die. Ideal ranges prevent wire breakages.
              </p>
            </div>

            {/* Formula 2: Elongation */}
            <div className="bg-[#0D1325] border border-[#1b253b]/80 rounded-xl p-5 relative overflow-hidden group hover:border-cyan-500/30 hover:shadow-[0_0_20px_rgba(6,182,212,0.06)] transition-premium">
              <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500" />
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                  <Ruler className="h-5 w-5" />
                </div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-355">Elongation strain (E)</h4>
              </div>
              <div className="bg-[#121A2F]/65 border border-[#2b3a61]/30 p-2.5 rounded font-mono text-xs text-cyan-300 mb-3 flex items-center justify-between shadow-inner">
                <span>E = ((A₁ / A₂) - 1) × 100%</span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">
                Represents the percentage increase in wire length, calculated assuming incompressibility and mass/volume conservation (<span className="font-mono text-slate-300 text-[10px]">A₁L₁ = A₂L₂</span>).
              </p>
            </div>

            {/* Formula 3: Drawing Ratio */}
            <div className="bg-[#0D1325] border border-[#1b253b]/80 rounded-xl p-5 relative overflow-hidden group hover:border-emerald-500/30 hover:shadow-[0_0_20px_rgba(16,185,129,0.06)] transition-premium">
              <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <Gauge className="h-5 w-5" />
                </div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-355">Drawing Ratio (λ)</h4>
              </div>
              <div className="bg-[#121A2F]/65 border border-[#2b3a61]/30 p-2.5 rounded font-mono text-xs text-emerald-300 mb-3 flex items-center justify-between shadow-inner">
                <span>λ = A₁ / A₂ = L₂ / L₁ = v₂ / v₁</span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">
                Specifies deformation intensity. It dictates the speed multiplier (<span className="font-mono text-[10px]">v₂/v₁</span>) at the outlet, dictating capstan speed adjustments.
              </p>
            </div>

            {/* Formula 4: Drawing Force & Stress (Sachs' Slab Method) */}
            <div className="bg-[#0D1325] border border-[#1b253b]/80 rounded-xl p-5 relative overflow-hidden group hover:border-amber-500/30 hover:shadow-[0_0_20px_rgba(245,158,11,0.06)] transition-premium">
              <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                  <Zap className="h-5 w-5" />
                </div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-355">Drawing Force & Stress</h4>
              </div>
              <div className="bg-[#121A2F]/65 border border-[#2b3a61]/30 p-2.5 rounded font-mono text-[10px] text-amber-300 mb-3 flex flex-col gap-1 shadow-inner">
                <div className="font-semibold">σ_d = σ_y × ln(A₁/A₂) × (1 + μ·cot(α))</div>
                <div className="border-t border-[#2b3a61]/30 pt-1.5 font-semibold">Force (F) = A₂ × σ_d</div>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Derived from <strong>Sachs' slab model</strong> of plastic flow. The term <span className="text-slate-300">σ_y·ln(A₁/A₂)</span> represents the ideal homogenous work of plastic deformation. The multiplier <span className="text-slate-300">(1 + μ·cot(α))</span> corrects for frictional shear resistance along the die-wire contact interface at half-angle <span className="font-mono">α</span> under friction <span className="font-mono">μ</span>.
              </p>
              <div className="mt-3 border-t border-[#1b253b]/60 pt-2 text-[10.5px] text-amber-200/70 italic leading-relaxed">
                <strong>Kid-Friendly Analogy:</strong> Think of it like squeezing playdough through a funnel! The clay's hardness is the material strength, the change in funnel size is the squeezing work, and how sticky the funnel walls are adds drag. Sachs' method slices this squeezing process into thin imaginary slabs to calculate the total force needed.
              </div>
            </div>
          </div>

          {/* Variable Nomenclature & Legend */}
          <div className="mt-6 bg-[#0D1325] border border-[#1b253b]/85 rounded-xl p-5 shadow-xl space-y-4 animate-fadeIn">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-heading border-b border-[#1b253b] pb-2 flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-blue-400" />
              Nomenclature & Variable Glossary
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs font-mono">
              <div className="space-y-1 bg-[#121A2F]/50 border border-[#2b3a61]/25 p-3 rounded-lg">
                <div className="text-blue-400 font-bold">A₁ / A₂</div>
                <div className="text-slate-400 text-[10.5px] leading-relaxed">
                  Inlet (Starting) and Outlet (Finished) cross-sectional areas of the wire/strip in <strong>mm²</strong>.
                </div>
              </div>
              <div className="space-y-1 bg-[#121A2F]/50 border border-[#2b3a61]/25 p-3 rounded-lg">
                <div className="text-cyan-400 font-bold">L₁ / L₂</div>
                <div className="text-slate-400 text-[10.5px] leading-relaxed">
                  Starting and finished lengths of the wire in <strong>meters</strong> (conserved via volume: A₁L₁ = A₂L₂).
                </div>
              </div>
              <div className="space-y-1 bg-[#121A2F]/50 border border-[#2b3a61]/25 p-3 rounded-lg">
                <div className="text-emerald-400 font-bold">v₁ / v₂</div>
                <div className="text-slate-400 text-[10.5px] leading-relaxed">
                  Wire speed entering (v₁) and leaving (v₂) the die in <strong>m/s</strong>. v₂ increases as the wire gets thinner.
                </div>
              </div>
              <div className="space-y-1 bg-[#121A2F]/50 border border-[#2b3a61]/25 p-3 rounded-lg">
                <div className="text-amber-400 font-bold">σ_d (Drawing Stress)</div>
                <div className="text-slate-400 text-[10.5px] leading-relaxed">
                  The internal pull stress in <strong>MPa</strong>. Must be lower than the yield strength to prevent wire breaking.
                </div>
              </div>
              <div className="space-y-1 bg-[#121A2F]/50 border border-[#2b3a61]/25 p-3 rounded-lg">
                <div className="text-amber-400 font-bold">σ_y (Yield Strength)</div>
                <div className="text-slate-400 text-[10.5px] leading-relaxed">
                  The plastic deformation threshold in <strong>MPa</strong>. The stress where metal begins to permanently stretch/flow.
                </div>
              </div>
              <div className="space-y-1 bg-[#121A2F]/50 border border-[#2b3a61]/25 p-3 rounded-lg">
                <div className="text-purple-400 font-bold">μ (Friction Coefficient)</div>
                <div className="text-slate-400 text-[10.5px] leading-relaxed">
                  Dimensionless value representing stickiness/resistance between wire and die walls. Standard is <strong>0.07</strong>.
                </div>
              </div>
              <div className="space-y-1 bg-[#121A2F]/50 border border-[#2b3a61]/25 p-3 rounded-lg">
                <div className="text-purple-400 font-bold">α (Die Half-Angle)</div>
                <div className="text-slate-400 text-[10.5px] leading-relaxed">
                  Half of the total entry cone angle in <strong>degrees</strong>. Dictates the steepness of the funnel taper.
                </div>
              </div>
              <div className="space-y-1 bg-[#121A2F]/50 border border-[#2b3a61]/25 p-3 rounded-lg">
                <div className="text-rose-400 font-bold">F (Drawing Force / Tension)</div>
                <div className="text-slate-400 text-[10.5px] leading-relaxed">
                  The total force in <strong>Newtons (N)</strong> required to pull the wire. Calculated as: F = A₂ × σ_d.
                </div>
              </div>
              <div className="space-y-1 bg-[#121A2F]/50 border border-[#2b3a61]/25 p-3 rounded-lg">
                <div className="text-indigo-400 font-bold">λ (Drawing Ratio / Elongation Factor)</div>
                <div className="text-slate-400 text-[10.5px] leading-relaxed">
                  The ratio of area reduction and speed increase (A₁/A₂ or v₂/v₁). Shows how much longer/faster the wire becomes.
                </div>
              </div>
            </div>
          </div>
        </>
      )}

        {/* Tab Selection Segmented Control */}
        <div className="bg-[#0D1325] border border-[#1b253b]/85 rounded-xl p-1 flex flex-col sm:flex-row gap-1 max-w-3xl mx-auto shadow-inner">
          <button
            onClick={() => setActiveTab('round')}
            className={`flex-1 flex items-center justify-center gap-2.5 py-3 px-4 rounded-lg text-xs font-bold uppercase tracking-wider transition-premium ${
              activeTab === 'round' 
                ? 'bg-[#121A2F] text-blue-400 border border-[#2b3a61]/65 shadow-[0_4px_16px_rgba(59,130,246,0.12)]' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#121A2F]/40'
            }`}
          >
            <Sliders className="h-4 w-4" />
            Single Round Draft
          </button>
          <button
            onClick={() => setActiveTab('sequence')}
            className={`flex-1 flex items-center justify-center gap-2.5 py-3 px-4 rounded-lg text-xs font-bold uppercase tracking-wider transition-premium ${
              activeTab === 'sequence' 
                ? 'bg-[#121A2F] text-purple-400 border border-[#2b3a61]/65 shadow-[0_4px_16px_rgba(168,85,247,0.12)]' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#121A2F]/40'
            }`}
          >
            <Layers className="h-4 w-4" />
            Multi-Draft Sequence
          </button>
          <button
            onClick={() => setActiveTab('flat')}
            className={`flex-1 flex items-center justify-center gap-2.5 py-3 px-4 rounded-lg text-xs font-bold uppercase tracking-wider transition-premium ${
              activeTab === 'flat' 
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
          
          {/* TAB 1: SINGLE ROUND DRAFT */}
          {activeTab === 'round' && (
            <>
              {/* Inputs Panel */}
              <div className="lg:col-span-5 bg-[#0D1325] border border-[#1b253b] rounded-2xl p-6 space-y-6 shadow-xl">
                <div className="flex items-center justify-between border-b border-[#1b253b] pb-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-heading">
                    Process Variables
                  </h3>
                  <span className="text-[10px] font-mono text-slate-500">TAB_1 // ROUND_DIE</span>
                </div>
                
                {/* Custom Sizing Mode selector */}
                <div className="space-y-2">
                  <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">
                    Sizing Mode
                  </label>
                  <div className="flex flex-col rounded-xl overflow-hidden border border-[#1b253b] divide-y divide-[#1b253b]">
                    <button
                      type="button"
                      onClick={() => setRoundCalcMode('forward')}
                      className={`w-full text-left p-3.5 flex items-start gap-3 transition-premium ${
                        roundCalcMode === 'forward' 
                          ? 'bg-[#121A2F] border-l-[3px] border-l-blue-500 text-blue-400' 
                          : 'bg-[#0D1325] border-l-[3px] border-l-transparent text-slate-400 hover:bg-[#121A2F]/50'
                      }`}
                    >
                      <div className={`p-1.5 rounded bg-blue-500/10 mt-0.5 ${roundCalcMode === 'forward' ? 'text-blue-400' : 'text-slate-500'}`}>
                        <Sliders className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold block text-slate-200">Forward Sizing Analysis</span>
                        <span className="text-[10px] text-slate-400 mt-0.5 block leading-normal">Given raw and sized wire diameters, compute reduction draft & elongation values.</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRoundCalcMode('backward_red')}
                      className={`w-full text-left p-3.5 flex items-start gap-3 transition-premium ${
                        roundCalcMode === 'backward_red' 
                          ? 'bg-[#121A2F] border-l-[3px] border-l-blue-500 text-blue-400' 
                          : 'bg-[#0D1325] border-l-[3px] border-l-transparent text-slate-400 hover:bg-[#121A2F]/50'
                      }`}
                    >
                      <div className={`p-1.5 rounded bg-cyan-500/10 mt-0.5 ${roundCalcMode === 'backward_red' ? 'text-cyan-400' : 'text-slate-500'}`}>
                        <TrendingDown className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold block text-slate-200">Target Reduction Limit</span>
                        <span className="text-[10px] text-slate-400 mt-0.5 block leading-normal">Given inlet diameter & desired reduction %, calculate the required die sizing.</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRoundCalcMode('backward_elong')}
                      className={`w-full text-left p-3.5 flex items-start gap-3 transition-premium ${
                        roundCalcMode === 'backward_elong' 
                          ? 'bg-[#121A2F] border-l-[3px] border-l-blue-500 text-blue-400' 
                          : 'bg-[#0D1325] border-l-[3px] border-l-transparent text-slate-400 hover:bg-[#121A2F]/50'
                      }`}
                    >
                      <div className={`p-1.5 rounded bg-purple-500/10 mt-0.5 ${roundCalcMode === 'backward_elong' ? 'text-purple-400' : 'text-slate-500'}`}>
                        <Maximize2 className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold block text-slate-200">Target Elongation Ratio</span>
                        <span className="text-[10px] text-slate-400 mt-0.5 block leading-normal">Given inlet diameter & target elongation %, compute the finished wire thickness.</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Input Fields */}
                <div className="space-y-4 pt-4 border-t border-[#1b253b]">
                  {/* Inlet Diameter Input */}
                  <div>
                    <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block mb-2">
                      Inlet Diameter (d₁)
                    </label>
                    <div className="relative rounded-xl shadow-sm">
                      <input 
                        type="number" 
                        step="0.01" 
                        value={roundInlet}
                        onChange={(e) => setRoundInlet(e.target.value)}
                        className="w-full bg-[#050816] border border-[#1b253b] rounded-xl px-4 py-3.5 pr-16 text-white font-mono text-sm focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-premium"
                      />
                      <div className="absolute right-3 top-2.5 px-2.5 py-1 bg-[#121A2F] border border-[#2b3a61]/40 rounded-lg text-slate-400 text-xs font-mono font-bold uppercase tracking-wider shadow-inner">
                        mm
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1.5 block">Starting stock/wire cross-section size.</span>
                  </div>

                  {/* Mode-specific Input */}
                  {roundCalcMode === 'forward' && (
                    <div>
                      <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block mb-2">
                        Outlet Diameter (d₂)
                      </label>
                      <div className="relative rounded-xl shadow-sm">
                        <input 
                          type="number" 
                          step="0.01" 
                          value={roundOutlet}
                          onChange={(e) => setRoundOutlet(e.target.value)}
                          className="w-full bg-[#050816] border border-[#1b253b] rounded-xl px-4 py-3.5 pr-16 text-white font-mono text-sm focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-premium"
                        />
                        <div className="absolute right-3 top-2.5 px-2.5 py-1 bg-[#121A2F] border border-[#2b3a61]/40 rounded-lg text-slate-400 text-xs font-mono font-bold uppercase tracking-wider shadow-inner">
                          mm
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1.5 block">Desired sizing diameter. Must be less than inlet diameter (d₁).</span>
                    </div>
                  )}

                  {roundCalcMode === 'backward_red' && (
                    <div>
                      <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block mb-2">
                        Target Area Reduction (R)
                      </label>
                      <div className="relative rounded-xl shadow-sm">
                        <input 
                          type="number" 
                          step="0.1" 
                          value={roundTargetRed}
                          onChange={(e) => setRoundTargetRed(e.target.value)}
                          className="w-full bg-[#050816] border border-[#1b253b] rounded-xl px-4 py-3.5 pr-14 text-white font-mono text-sm focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-premium"
                        />
                        <div className="absolute right-3 top-2.5 px-2.5 py-1 bg-[#121A2F] border border-[#2b3a61]/40 rounded-lg text-slate-400 text-xs font-mono font-bold uppercase tracking-wider shadow-inner">
                          %
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1.5 block">Area reduction limit target. Industrial wire draws target 15% - 25% per pass.</span>
                    </div>
                  )}

                  {roundCalcMode === 'backward_elong' && (
                    <div>
                      <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block mb-2">
                        Target Elongation (E)
                      </label>
                      <div className="relative rounded-xl shadow-sm">
                        <input 
                          type="number" 
                          step="0.1" 
                          value={roundTargetElong}
                          onChange={(e) => setRoundTargetElong(e.target.value)}
                          className="w-full bg-[#050816] border border-[#1b253b] rounded-xl px-4 py-3.5 pr-14 text-white font-mono text-sm focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-premium"
                        />
                        <div className="absolute right-3 top-2.5 px-2.5 py-1 bg-[#121A2F] border border-[#2b3a61]/40 rounded-lg text-slate-400 text-xs font-mono font-bold uppercase tracking-wider shadow-inner">
                          %
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1.5 block">Relative extension strain target percentage.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Outputs Column */}
              <div className="lg:col-span-7 bg-[#0D1325] border border-[#1b253b] rounded-2xl p-6 flex flex-col justify-between shadow-xl min-h-[580px]">
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-[#1b253b] pb-4">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider font-heading">
                      Deformation Graphic & KPI Summary
                    </h3>
                    <span className="text-[10px] font-mono text-slate-500">SCHEMA // OUTPUT_PREVIEW</span>
                  </div>

                  {roundResults ? (
                    <>
                      {/* Live SVG CAD Draw Schematic */}
                      <div className="bg-[#050816] border border-[#1b253b] rounded-2xl p-4 flex flex-col items-center justify-center relative overflow-hidden shadow-inner blueprint-grid">
                        <div className="absolute top-3 left-4 text-[9px] font-mono text-slate-500 tracking-wider flex items-center gap-1.5 uppercase">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                          2D Wire Die Profile Schematic
                        </div>

                        {/* Rendering dynamic SVG */}
                        {(() => {
                          const inletVal = parseFloat(roundInlet) || 8.00
                          const outletVal = roundResults.outlet
                          const maxVal = Math.max(inletVal, outletVal, 1)
                          const scale = 70 / maxVal

                          const inletHeight = inletVal * scale
                          const outletHeight = outletVal * scale
                          const inletY = 100 - (inletHeight / 2)
                          const outletY = 100 - (outletHeight / 2)

                          const drawingRatio = roundResults.elongationRatio
                          const animDur = Math.max(0.1, Math.min(3, 2.5 / drawingRatio))

                          return (
                            <svg className="w-full h-[180px]" viewBox="0 0 500 200" xmlns="http://www.w3.org/2000/svg">
                              <defs>
                                <pattern id="dieHatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                                  <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(59, 130, 246, 0.16)" strokeWidth="1.2" />
                                </pattern>
                                <linearGradient id="metalGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                                  <stop offset="0%" stopColor="#1e293b" />
                                  <stop offset="25%" stopColor="#3b4b61" />
                                  <stop offset="50%" stopColor="#64748b" />
                                  <stop offset="75%" stopColor="#3b4b61" />
                                  <stop offset="100%" stopColor="#1e293b" />
                                </linearGradient>
                              </defs>

                              {/* Horizontal Center line (neutral axis) */}
                              <line x1="15" y1="100" x2="485" y2="100" stroke="rgba(99, 102, 241, 0.15)" strokeWidth="1" strokeDasharray="5 3" />

                              {/* Wire Body */}
                              <path 
                                d={`M 20,${inletY} 
                                   L 220,${inletY} 
                                   L 280,${outletY} 
                                   L 480,${outletY} 
                                   L 480,${outletY + outletHeight} 
                                   L 280,${outletY + outletHeight} 
                                   L 220,${inletY + inletHeight} 
                                   L 20,${inletY + inletHeight} Z`}
                                fill="url(#metalGrad)"
                                stroke="rgba(99, 102, 241, 0.3)"
                                strokeWidth="1.5"
                              />

                              {/* Top Die Piece */}
                              <path 
                                d={`M 210,15 
                                   L 290,15 
                                   L 290,${outletY - 2} 
                                   L 280,${outletY - 2} 
                                   L 220,${inletY - 2} 
                                   L 210,${inletY - 2} Z`}
                                fill="#121A2F"
                                stroke="rgba(59, 130, 246, 0.7)"
                                strokeWidth="1.5"
                              />
                              <path 
                                d={`M 210,15 
                                   L 290,15 
                                   L 290,${outletY - 2} 
                                   L 280,${outletY - 2} 
                                   L 220,${inletY - 2} 
                                   L 210,${inletY - 2} Z`}
                                fill="url(#dieHatch)"
                              />

                              {/* Bottom Die Piece */}
                              <path 
                                d={`M 210,185 
                                   L 290,185 
                                   L 290,${outletY + outletHeight + 2} 
                                   L 280,${outletY + outletHeight + 2} 
                                   L 220,${inletY + inletHeight + 2} 
                                   L 210,${inletY + inletHeight + 2} Z`}
                                fill="#121A2F"
                                stroke="rgba(59, 130, 246, 0.7)"
                                strokeWidth="1.5"
                              />
                              <path 
                                d={`M 210,185 
                                   L 290,185 
                                   L 290,${outletY + outletHeight + 2} 
                                   L 280,${outletY + outletHeight + 2} 
                                   L 220,${inletY + inletHeight + 2} 
                                   L 210,${inletY + inletHeight + 2} Z`}
                                fill="url(#dieHatch)"
                              />

                              {/* Flow indicators (speeds differ based on Drawing Ratio) */}
                              <path 
                                d={`M 30,100 L 210,100`}
                                stroke="rgba(6, 182, 212, 0.55)"
                                strokeWidth="2.5"
                                strokeDasharray="5 18"
                                strokeLinecap="round"
                              >
                                <animate attributeName="stroke-dashoffset" values="46;0" dur="2.2s" repeatCount="indefinite" />
                              </path>

                              <path 
                                d={`M 290,100 L 470,100`}
                                stroke="rgba(168, 85, 247, 0.65)"
                                strokeWidth="2.5"
                                strokeDasharray="5 18"
                                strokeLinecap="round"
                              >
                                <animate attributeName="stroke-dashoffset" values="46;0" dur={`${animDur}s`} repeatCount="indefinite" />
                              </path>

                              {/* Dimension Lines (Inlet) */}
                              <line x1="32" y1={inletY} x2="32" y2={inletY + inletHeight} stroke="#3b82f6" strokeWidth="1.2" />
                              <polygon points={`32,${inletY} 29,${inletY + 6} 35,${inletY + 6}`} fill="#3b82f6" />
                              <polygon points={`32,${inletY + inletHeight} 29,${inletY + inletHeight - 6} 35,${inletY + inletHeight - 6}`} fill="#3b82f6" />
                              <line x1="18" y1={inletY} x2="38" y2={inletY} stroke="rgba(99, 102, 241, 0.25)" strokeWidth="1" />
                              <line x1="18" y1={inletY + inletHeight} x2="38" y2={inletY + inletHeight} stroke="rgba(99, 102, 241, 0.25)" strokeWidth="1" />

                              {/* Dimension Lines (Outlet) */}
                              <line x1="468" y1={outletY} x2="468" y2={outletY + outletHeight} stroke="#a855f7" strokeWidth="1.2" />
                              <polygon points={`468,${outletY} 465,${outletY + 6} 471,${outletY + 6}`} fill="#a855f7" />
                              <polygon points={`468,${outletY + outletHeight} 465,${outletY + outletHeight - 6} 471,${outletY + outletHeight - 6}`} fill="#a855f7" />
                              <line x1="462" y1={outletY} x2="482" y2={outletY} stroke="rgba(168, 85, 247, 0.25)" strokeWidth="1" />
                              <line x1="462" y1={outletY + outletHeight} x2="482" y2={outletY + outletHeight} stroke="rgba(168, 85, 247, 0.25)" strokeWidth="1" />

                              {/* Labels */}
                              <text x="42" y="104" fill="#3b82f6" fontSize="10" fontFamily="Fira Code, monospace" fontWeight="600">
                                d₁:{inletVal.toFixed(2)}mm
                              </text>
                              <text x="408" y="104" fill="#a855f7" fontSize="10" fontFamily="Fira Code, monospace" fontWeight="600" textAnchor="end">
                                d₂:{outletVal.toFixed(3)}mm
                              </text>

                              {/* Speed multiplier node */}
                              <g transform="translate(250, 100)">
                                <circle r="15" fill="#0D1325" stroke="rgba(99, 102, 241, 0.4)" strokeWidth="1" />
                                <path d="M-4,-4 L2,0 L-4,4" fill="none" stroke="#06b6d4" strokeWidth="1.5" strokeLinecap="round" />
                                <path d="M1,-4 L7,0 L1,4" fill="none" stroke="#06b6d4" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.6" />
                              </g>
                              <text x="250" y="125" fill="#06b6d4" fontSize="8" fontFamily="Fira Code, monospace" fontWeight="600" textAnchor="middle" letterSpacing="0.5">
                                v₂/v₁ = {drawingRatio.toFixed(3)}
                              </text>
                            </svg>
                          )
                        })()}
                      </div>

                      {/* Material Yield Verification Message */}
                      {(() => {
                        const limit = getMaterialLimit()
                        const isUnsafe = roundResults.reduction > limit
                        return (
                          <div className="animate-fadeIn">
                            {isUnsafe ? (
                              <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 flex items-start gap-3 text-rose-400 shadow-inner">
                                <Info className="h-5 w-5 shrink-0 mt-0.5" />
                                <div>
                                  <span className="text-xs font-bold block uppercase tracking-wider">Warning: Material Yield Limit Exceeded</span>
                                  <p className="text-[11px] text-rose-350 leading-normal mt-1">
                                    Calculated area reduction (<span className="font-mono font-bold">{roundResults.reduction.toFixed(2)}%</span>) exceeds the safe limit of <span className="font-mono font-bold">{limit}%</span> for the selected stock material. High risk of tensile wire breakage, line slippage, or heat damage.
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4 flex items-start gap-3 text-emerald-400 shadow-inner">
                                <Info className="h-5 w-5 shrink-0 mt-0.5 text-emerald-555" />
                                <div>
                                  <span className="text-xs font-bold block uppercase tracking-wider text-emerald-350">Draft Sizing Verified</span>
                                  <p className="text-[11px] text-emerald-300 leading-normal mt-1">
                                    Sizing is within safe limits for drawing (<span className="font-mono font-bold">{roundResults.reduction.toFixed(2)}%</span> vs <span className="font-mono font-bold">{limit}%</span> max limit). Physical flow velocity is optimized.
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })()}

                      {/* KPI Metric Readouts */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {/* KPI 1: outlet size */}
                        <div className="bg-[#121A2F] border border-[#1b253b] p-4.5 rounded-xl transition-premium hover:border-blue-500/30 shadow-inner group">
                          <span className="text-[10px] text-slate-400 font-heading font-semibold uppercase tracking-wider block mb-1">
                            Outlet Size (d₂)
                          </span>
                          <div className="text-2xl font-bold font-mono text-white tracking-tight flex items-baseline gap-1">
                            {roundResults.outlet.toFixed(3)}
                            <span className="text-[10px] font-sans font-normal text-slate-500 uppercase tracking-widest">mm</span>
                          </div>
                          <span className="text-[9px] text-slate-500 mt-1 block">Exit wire sizing diameter.</span>
                        </div>

                        {/* KPI 2: area reduction */}
                        <div className="bg-[#121A2F] border border-[#1b253b] p-4.5 rounded-xl transition-premium hover:border-cyan-500/30 shadow-inner group">
                          <span className="text-[10px] text-slate-400 font-heading font-semibold uppercase tracking-wider block mb-1">
                            Area Reduction (R)
                          </span>
                          <div className="text-2xl font-bold font-mono text-cyan-400 tracking-tight">
                            {roundResults.reduction.toFixed(2)}%
                          </div>
                          <span className="text-[9px] text-slate-500 mt-1 block">Draft cross-section reduction.</span>
                        </div>

                        {/* KPI 3: elongation */}
                        <div className="bg-[#121A2F] border border-[#1b253b] p-4.5 rounded-xl transition-premium hover:border-purple-500/30 shadow-inner group">
                          <span className="text-[10px] text-slate-400 font-heading font-semibold uppercase tracking-wider block mb-1">
                            Elongation (E)
                          </span>
                          <div className="text-2xl font-bold font-mono text-purple-400 tracking-tight">
                            {roundResults.elongation.toFixed(2)}%
                          </div>
                          <span className="text-[9px] text-slate-500 mt-1 block">Relative length expansion.</span>
                        </div>

                        {/* KPI 4: drawing ratio */}
                        <div className="bg-[#121A2F] border border-[#1b253b] p-4.5 rounded-xl transition-premium hover:border-emerald-500/30 shadow-inner group">
                          <span className="text-[10px] text-slate-400 font-heading font-semibold uppercase tracking-wider block mb-1">
                            Drawing Ratio (λ)
                          </span>
                          <div className="text-2xl font-bold font-mono text-emerald-400 tracking-tight flex items-baseline gap-0.5">
                            {roundResults.elongationRatio.toFixed(3)}
                            <span className="text-[10px] font-sans font-normal text-slate-500">x</span>
                          </div>
                          <span className="text-[9px] text-slate-500 mt-1 block">Length & speed coefficient.</span>
                        </div>

                        {/* KPI 5: initial area */}
                        <div className="bg-[#121A2F] border border-[#1b253b] p-4.5 rounded-xl transition-premium shadow-inner">
                          <span className="text-[10px] text-slate-400 font-heading font-semibold uppercase tracking-wider block mb-1">
                            Inlet Area (A₁)
                          </span>
                          <div className="text-sm font-bold font-mono text-slate-300">
                            {roundResults.inArea.toFixed(3)} <span className="text-[10px] text-slate-550">mm²</span>
                          </div>
                          <span className="text-[9px] text-slate-500 mt-1 block">Input stock cross-section.</span>
                        </div>

                        {/* KPI 6: final area */}
                        <div className="bg-[#121A2F] border border-[#1b253b] p-4.5 rounded-xl transition-premium shadow-inner">
                          <span className="text-[10px] text-slate-400 font-heading font-semibold uppercase tracking-wider block mb-1">
                            Outlet Area (A₂)
                          </span>
                          <div className="text-sm font-bold font-mono text-slate-300">
                            {roundResults.outArea.toFixed(3)} <span className="text-[10px] text-slate-550">mm²</span>
                          </div>
                          <span className="text-[9px] text-slate-500 mt-1 block">Outlet sized cross-section.</span>
                        </div>

                        {/* Secondary stats summary */}
                        <div className="bg-[#121A2F] border border-[#1b253b] p-4 rounded-xl col-span-2 md:col-span-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono text-slate-400">
                            <div>
                              Diameter Ratio: <span className="font-semibold text-white">d₁/d₂ = {roundResults.diameterRatio.toFixed(3)}</span>
                            </div>
                            <div className="hidden sm:block text-slate-650">|</div>
                            <div>
                              Linear Sizing Factor: <span className="font-semibold text-white">d₂/d₁ = {(1 / roundResults.diameterRatio).toFixed(3)}</span>
                            </div>
                            <div className="hidden sm:block text-slate-655">|</div>
                            <div>
                              Velocity Output: <span className="font-semibold text-emerald-450">v₂ = {roundResults.elongationRatio.toFixed(3)} × v₁</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Round Drawing Physics & Die Match Card */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                        <div className="bg-[#121A2F]/90 border border-[#1b253b] p-5 rounded-xl space-y-3 shadow-inner">
                          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-heading flex items-center gap-1.5">
                            <Zap className="h-4 w-4 text-amber-500" />
                            Mechanical Tension & Power
                          </h4>
                          {(() => {
                            const alphaRad = (parseFloat(dieAngle) * Math.PI) / 180
                            const mu = 0.07
                            const sigmaD = parseFloat(yieldStrength) * Math.log(roundResults.inArea / roundResults.outArea) * (1 + mu / Math.tan(alphaRad))
                            const forceN = roundResults.outArea * sigmaD
                            const powerKw = (forceN * parseFloat(drawSpeed)) / 1000
                            const isStressUnsafe = sigmaD >= 0.6 * parseFloat(uts)

                            return (
                              <div className="space-y-2.5 font-mono text-xs text-slate-300">
                                <div className="flex justify-between">
                                  <span className="text-slate-400 uppercase text-[9px] font-heading font-bold">Drawing Force:</span>
                                  <span className="font-bold text-white">{forceN.toFixed(0)} N</span>
                                </div>
                                <div className="flex justify-between border-t border-[#1b253b]/55 pt-2">
                                  <span className="text-slate-400 uppercase text-[9px] font-heading font-bold">Drawing Stress:</span>
                                  <span className={`font-bold ${isStressUnsafe ? 'text-rose-400' : 'text-indigo-400'}`}>
                                    {sigmaD.toFixed(1)} MPa {isStressUnsafe && '(High Tension)'}
                                  </span>
                                </div>
                                <div className="flex justify-between border-t border-[#1b253b]/55 pt-2">
                                  <span className="text-slate-400 uppercase text-[9px] font-heading font-bold">Power Required:</span>
                                  <span className="font-bold text-emerald-400">{powerKw.toFixed(2)} kW</span>
                                </div>
                              </div>
                            )
                          })()}
                        </div>

                        <div className="bg-[#121A2F]/90 border border-[#1b253b] p-5 rounded-xl space-y-3 shadow-inner">
                          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-heading flex items-center gap-1.5">
                            <Table className="h-4 w-4 text-blue-500" />
                            Matched Round Dies in Inventory
                          </h4>
                          
                          {matchingDies[888] ? (
                            <div className="flex flex-wrap gap-2 pt-1">
                              {matchingDies[888].length > 0 ? (
                                matchingDies[888].map(die => (
                                  <a
                                    key={die.die_id}
                                    href={`#/dies/${die.die_id}`}
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold border transition ${
                                      die.status === 'AVAILABLE'
                                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                                        : 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20'
                                    }`}
                                  >
                                    {die.die_id} ({parseFloat(die.current_size).toFixed(3)}mm)
                                  </a>
                                ))
                              ) : (
                                <span className="text-xs text-slate-500 font-mono">No matching round dies in inventory</span>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => findMatchingDies(888, roundResults.outlet)}
                              disabled={loadingDies[888]}
                              className="w-full py-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 text-xs font-bold rounded-xl border border-blue-600/30 transition flex items-center justify-center gap-1 disabled:opacity-50"
                            >
                              {loadingDies[888] ? 'Searching...' : 'Scan Inventory for Matching Dies'}
                            </button>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="bg-[#050816] border border-[#1b253b] rounded-2xl py-20 px-6 flex flex-col items-center justify-center text-center space-y-4 shadow-inner">
                      <div className="w-12 h-12 rounded-xl bg-slate-900 border border-[#1b253b] flex items-center justify-center text-slate-500">
                        <Info className="h-6 w-6" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-slate-300">Waiting for Sizing Parameters</h4>
                        <p className="text-xs text-slate-500 max-w-sm">
                          Please enter valid numeric input diameters and targets in the configurator panel to compute deformation stats.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {roundResults && (
                  <div className="mt-8 border-t border-[#1b253b] pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px] text-slate-500 font-mono">
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500/80" />
                      MASS BALANCE PRESERVED: A₁L₁ = A₂L₂
                    </span>
                    <span>ROUNDED TO 3 DECIMAL PLACES</span>
                  </div>
                )}
              </div>
            </>
          )}

          {/* TAB 2: MULTI-DRAFT SEQUENCE GENERATOR */}
          {activeTab === 'sequence' && (
            <>
              {/* Inputs Panel */}
              <div className="lg:col-span-4 bg-[#0D1325] border border-[#1b253b] rounded-2xl p-6 space-y-6 shadow-xl">
                <div className="flex items-center justify-between border-b border-[#1b253b] pb-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-heading">
                    Sequence Limits
                  </h3>
                  <span className="text-[10px] font-mono text-slate-500">TAB_2 // DIES_SEQUENCE</span>
                </div>

                <div className="space-y-4">
                  {/* Start Diameter */}
                  <div>
                    <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block mb-2">
                      Start Stock Diameter (d₀)
                    </label>
                    <div className="relative rounded-xl shadow-sm">
                      <input 
                        type="number" 
                        step="0.01" 
                        value={seqStart}
                        onChange={(e) => setSeqStart(e.target.value)}
                        className="w-full bg-[#050816] border border-[#1b253b] rounded-xl px-4 py-3.5 pr-16 text-white font-mono text-sm focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/20 focus:outline-none transition-premium"
                      />
                      <div className="absolute right-3 top-2.5 px-2.5 py-1 bg-[#121A2F] border border-[#2b3a61]/40 rounded-lg text-slate-400 text-xs font-mono font-bold uppercase tracking-wider shadow-inner">
                        mm
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1.5 block">Starting wire dimension (e.g. 8.00mm).</span>
                  </div>

                  {/* Target End Diameter */}
                  <div>
                    <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block mb-2">
                      Target End Size (d_n)
                    </label>
                    <div className="relative rounded-xl shadow-sm">
                      <input 
                        type="number" 
                        step="0.01" 
                        value={seqEnd}
                        onChange={(e) => setSeqEnd(e.target.value)}
                        className="w-full bg-[#050816] border border-[#1b253b] rounded-xl px-4 py-3.5 pr-16 text-white font-mono text-sm focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/20 focus:outline-none transition-premium"
                      />
                      <div className="absolute right-3 top-2.5 px-2.5 py-1 bg-[#121A2F] border border-[#2b3a61]/40 rounded-lg text-slate-400 text-xs font-mono font-bold uppercase tracking-wider shadow-inner">
                        mm
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1.5 block">Target finished wire sizing. Must be less than start.</span>
                  </div>

                  {/* Target Reduction/Pass */}
                  <div>
                    <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block mb-2">
                      Pass Area Reduction (R_avg)
                    </label>
                    <div className="relative rounded-xl shadow-sm">
                      <input 
                        type="number" 
                        step="0.5" 
                        value={seqReduction}
                        onChange={(e) => setSeqReduction(e.target.value)}
                        className="w-full bg-[#050816] border border-[#1b253b] rounded-xl px-4 py-3.5 pr-14 text-white font-mono text-sm focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/20 focus:outline-none transition-premium"
                      />
                      <div className="absolute right-3 top-2.5 px-2.5 py-1 bg-[#121A2F] border border-[#2b3a61]/40 rounded-lg text-slate-400 text-xs font-mono font-bold uppercase tracking-wider shadow-inner">
                        %
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1.5 block">
                      Target draft limit per die. High alloy/carbon steel drawings often use lower passes (10%-15%) to minimize fatigue.
                    </span>
                  </div>

                  {/* Sequence Optimization Mode */}
                  <div>
                    <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block mb-2">
                      Pass Optimization Mode
                    </label>
                    <div className="bg-[#050816] border border-[#1b253b] rounded-xl p-1 flex gap-1 shadow-inner">
                      <button
                        type="button"
                        onClick={() => setSeqOptMode('constant')}
                        className={`flex-1 py-2 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-premium ${
                          seqOptMode === 'constant'
                            ? 'bg-[#121A2F] text-purple-400 border border-[#2b3a61]/65 shadow-md'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Constant Draft
                      </button>
                      <button
                        type="button"
                        onClick={() => setSeqOptMode('graduated')}
                        className={`flex-1 py-2 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-premium ${
                          seqOptMode === 'graduated'
                            ? 'bg-[#121A2F] text-purple-400 border border-[#2b3a61]/65 shadow-md'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Graduated (Optimized)
                      </button>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1.5 block">
                      {seqOptMode === 'constant'
                        ? 'Reduction per pass remains constant. Ideal for uniform materials.'
                        : 'Gradually reduces draft as wire work-hardens, preventing high-stress wire breakage.'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sequence Output */}
              <div className="lg:col-span-8 bg-[#0D1325] border border-[#1b253b] rounded-2xl p-6 shadow-xl space-y-6">
                <div className="flex items-center justify-between border-b border-[#1b253b] pb-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-heading">
                    Sizing Sequence telemetry
                  </h3>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={exportSequenceCSV}
                      className="px-3 py-1 bg-purple-600/90 hover:bg-purple-500 text-white text-[10px] font-bold rounded-lg transition duration-200 flex items-center gap-1 shadow"
                    >
                      <Table className="h-3.5 w-3.5" />
                      Export CSV
                    </button>
                    <span className="text-[10px] font-mono text-slate-500">MATRIX // MULTI_PASS</span>
                  </div>
                </div>

                {sequenceResults && sequenceResults.steps.length > 0 ? (
                  <div className="space-y-6">
                    {/* Sequence Summary cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fadeIn">
                      <div className="bg-[#121A2F] border border-[#1b253b] p-4 rounded-xl shadow-inner">
                        <span className="text-[9px] text-slate-400 font-heading font-bold uppercase tracking-wider block mb-1">
                          Total Passes (Dies)
                        </span>
                        <div className="text-xl font-bold font-mono text-purple-400 flex items-baseline gap-1">
                          {sequenceResults.steps.length}
                          <span className="text-[9px] font-sans font-normal text-slate-500">STAGES</span>
                        </div>
                      </div>

                      <div className="bg-[#121A2F] border border-[#1b253b] p-4 rounded-xl shadow-inner">
                        <span className="text-[9px] text-slate-400 font-heading font-bold uppercase tracking-wider block mb-1">
                          Pass Drawing Ratio
                        </span>
                        <div className="text-xl font-bold font-mono text-indigo-400">
                          {(1 / (1 - parseFloat(seqReduction) / 100)).toFixed(3)}
                        </div>
                      </div>

                      <div className="bg-[#121A2F] border border-[#1b253b] p-4 rounded-xl shadow-inner">
                        <span className="text-[9px] text-slate-400 font-heading font-bold uppercase tracking-wider block mb-1">
                          Total Red. (R_cum)
                        </span>
                        <div className="text-xl font-bold font-mono text-blue-400">
                          {sequenceResults.totalReduction.toFixed(1)}%
                        </div>
                      </div>

                      <div className="bg-[#121A2F] border border-[#1b253b] p-4 rounded-xl shadow-inner">
                        <span className="text-[9px] text-slate-400 font-heading font-bold uppercase tracking-wider block mb-1">
                          Total Length strain
                        </span>
                        <div className="text-xl font-bold font-mono text-emerald-400">
                          {((sequenceResults.totalElongation / 100) + 1).toFixed(2)}x
                        </div>
                      </div>
                    </div>

                    {/* Sizing sequence list */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      <div className="lg:col-span-8 border border-[#1b253b] rounded-xl overflow-hidden shadow-inner">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-[#121A2F] border-b border-[#1b253b] text-slate-400 font-heading">
                                <th className="p-3 text-[10px] font-semibold uppercase tracking-widest">Pass</th>
                                <th className="p-3 text-[10px] font-semibold uppercase tracking-widest">Inlet Dia</th>
                                <th className="p-3 text-[10px] font-semibold uppercase tracking-widest text-center">Flow</th>
                                <th className="p-3 text-[10px] font-semibold uppercase tracking-widest">Outlet Dia</th>
                                <th className="p-3 text-[10px] font-semibold uppercase tracking-widest text-right">Draft Red.</th>
                                <th className="p-3 text-[10px] font-semibold uppercase tracking-widest text-right">Tension (N)</th>
                                <th className="p-3 text-[10px] font-semibold uppercase tracking-widest text-right">Stress (MPa)</th>
                                <th className="p-3 text-[10px] font-semibold uppercase tracking-widest text-right">Power (kW)</th>
                                <th className="p-3 text-[10px] font-semibold uppercase tracking-widest">Matched Die</th>
                                <th className="p-3 text-[10px] font-semibold uppercase tracking-widest text-right">Cum. Red.</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#1b253b]/50 font-mono text-xs text-slate-200">
                              {sequenceResults.steps.map((step) => {
                                // Calculate cumulative reduction at this pass
                                const currentArea = Math.PI * Math.pow(step.outlet / 2, 2)
                                const startArea = Math.PI * Math.pow(parseFloat(seqStart) / 2, 2)
                                const cumulativeRed = ((startArea - currentArea) / startArea) * 100

                                const limit = getMaterialLimit()
                                const isStepUnsafe = step.reduction > limit

                                // Calculate Physics values
                                const stepInArea = Math.PI * Math.pow(step.inlet / 2, 2)
                                const stepOutArea = Math.PI * Math.pow(step.outlet / 2, 2)
                                const alphaRad = (parseFloat(dieAngle) * Math.PI) / 180
                                const mu = 0.07
                                const sigmaD = parseFloat(yieldStrength) * Math.log(stepInArea / stepOutArea) * (1 + mu / Math.tan(alphaRad))
                                const forceN = stepOutArea * sigmaD
                                const powerKw = (forceN * parseFloat(drawSpeed)) / 1000
                                const isStressUnsafe = sigmaD >= 0.6 * parseFloat(uts)

                                return (
                                  <tr key={step.draft} className={`transition-colors duration-150 group ${(isStepUnsafe || isStressUnsafe) ? 'bg-rose-950/15 hover:bg-rose-950/25 border-l-2 border-l-rose-500' : 'hover:bg-[#121A2F]/40'}`}>
                                    <td className="p-3">
                                      <span className={`w-5.5 h-5.5 rounded text-[9px] font-bold flex items-center justify-center transition-colors shadow-inner ${(isStepUnsafe || isStressUnsafe) ? 'bg-rose-950 border border-rose-500/40 text-rose-400' : 'bg-[#121A2F] border border-[#2b3a61]/65 text-slate-355 group-hover:border-purple-500/40 group-hover:text-purple-400'}`}>
                                        #{step.draft}
                                      </span>
                                    </td>
                                    <td className="p-3 text-slate-300">
                                      {step.inlet.toFixed(3)}
                                      <span className="text-[9px] text-slate-500 ml-1">mm</span>
                                    </td>
                                    <td className="p-3 text-center">
                                      <div className="inline-flex items-center justify-center w-5.5 h-5.5 rounded bg-[#050816] border border-[#1b253b] shadow-inner">
                                        <ArrowRight className="h-3 w-3 text-slate-500 group-hover:text-purple-400 group-hover:translate-x-0.5 transition-premium" />
                                      </div>
                                    </td>
                                    <td className="p-3 font-bold text-white">
                                      {step.outlet.toFixed(3)}
                                      <span className="text-[9px] text-slate-400 ml-1 font-normal">mm</span>
                                    </td>
                                    <td className={`p-3 text-right ${isStepUnsafe ? 'text-rose-400 font-bold' : 'text-blue-400'}`}>
                                      <div className="flex items-center justify-end gap-1.5">
                                        {isStepUnsafe && <Info className="h-3.5 w-3.5 text-rose-500 shrink-0" />}
                                        <span>{step.reduction.toFixed(1)}%</span>
                                      </div>
                                    </td>
                                    <td className="p-3 text-right text-indigo-300">
                                      {forceN.toFixed(0)} <span className="text-[9px] text-slate-500">N</span>
                                    </td>
                                    <td className={`p-3 text-right ${isStressUnsafe ? 'text-rose-450 font-bold' : 'text-indigo-400'}`}>
                                      <div className="flex items-center justify-end gap-1">
                                        {isStressUnsafe && <Info className="h-3.5 w-3.5 text-rose-500 shrink-0" />}
                                        <span>{sigmaD.toFixed(1)} <span className="text-[9px] text-slate-500 font-normal">MPa</span></span>
                                      </div>
                                    </td>
                                    <td className="p-3 text-right text-emerald-400 font-semibold">
                                      {powerKw.toFixed(2)} <span className="text-[9px] text-slate-500 font-normal">kW</span>
                                    </td>
                                    <td className="p-3">
                                      {matchingDies[step.draft] ? (
                                        <div className="flex flex-col gap-1">
                                          {matchingDies[step.draft].length > 0 ? (
                                            matchingDies[step.draft].map(die => (
                                              <a
                                                key={die.die_id}
                                                href={`#/dies/${die.die_id}`}
                                                className={`inline-flex items-center justify-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border transition ${
                                                  die.status === 'AVAILABLE'
                                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                                                    : 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20'
                                                }`}
                                              >
                                                {die.die_id} ({parseFloat(die.current_size).toFixed(3)}mm)
                                              </a>
                                            ))
                                          ) : (
                                            <span className="text-[10px] text-slate-500 font-mono">No matching dies</span>
                                          )}
                                        </div>
                                      ) : (
                                        <button
                                          onClick={() => findMatchingDies(step.draft, step.outlet)}
                                          disabled={loadingDies[step.draft]}
                                          className="px-2 py-1 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 text-[10px] font-bold rounded border border-blue-600/30 transition flex items-center gap-1 disabled:opacity-50"
                                        >
                                          {loadingDies[step.draft] ? 'Searching...' : 'Find Die'}
                                        </button>
                                      )}
                                    </td>
                                    <td className="p-3 text-right">
                                      <div className="flex items-center justify-end gap-2.5">
                                        <div className="bg-[#050816] h-2 w-16 rounded-full overflow-hidden border border-[#1b253b] relative shadow-inner">
                                          <div
                                            className="bg-gradient-to-r from-blue-600 to-indigo-500 h-full rounded-full transition-all duration-300"
                                            style={{ width: `${cumulativeRed}%` }}
                                          />
                                        </div>
                                        <span className="font-semibold text-slate-300 text-[10px] tracking-tight">
                                          {cumulativeRed.toFixed(1)}%
                                        </span>
                                      </div>
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* SVG Visualizer on the right */}
                      <div className="lg:col-span-4 space-y-6">
                        <div className="bg-[#121A2F] border border-[#1b253b] p-5 rounded-xl space-y-4 shadow-inner animate-fadeIn">
                          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-heading flex items-center gap-2">
                            <Maximize2 className="h-4 w-4 text-blue-500" />
                            Draft Reduction Visualizer
                          </h4>
                          <div className="flex items-center justify-center bg-[#050816] rounded-lg p-6 border border-[#1b253b]/60 relative overflow-hidden">
                            <svg viewBox="0 0 200 200" className="w-48 h-48 drop-shadow-[0_0_12px_rgba(59,130,246,0.15)]">
                              <defs>
                                <pattern id="svg-grid" width="10" height="10" patternUnits="userSpaceOnUse">
                                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#1b253b" strokeWidth="0.5" strokeOpacity="0.5" />
                                </pattern>
                              </defs>
                              <rect width="100%" height="100%" fill="url(#svg-grid)" />
                              
                              {/* Draw outer circle (start diameter) */}
                              <circle cx="100" cy="100" r={80} fill="none" stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" />
                              
                              {/* Draw circles for each step */}
                              {sequenceResults.steps.map((step, idx) => {
                                const maxDia = parseFloat(seqStart)
                                const currentRadius = (step.outlet / maxDia) * 80
                                const isLast = idx === sequenceResults.steps.length - 1
                                
                                return (
                                  <circle
                                    key={step.draft}
                                    cx="100"
                                    cy="100"
                                    r={currentRadius}
                                    fill={isLast ? 'rgba(59,130,246,0.15)' : 'none'}
                                    stroke={isLast ? '#3b82f6' : `rgba(168, 85, 247, ${0.3 + (idx / sequenceResults.steps.length) * 0.7})`}
                                    strokeWidth={isLast ? 2 : 1}
                                    className="transition-all duration-500 ease-in-out"
                                  />
                                )
                              })}
                              
                              {/* Core center point */}
                              <circle cx="100" cy="100" r="2" fill="#3b82f6" />
                            </svg>
                            
                            <div className="absolute bottom-2 right-2 text-[9px] font-mono text-slate-500">
                              SCALE: 1px = {(parseFloat(seqStart) / 160).toFixed(4)} mm
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#050816] border border-[#1b253b] rounded-2xl py-20 px-6 flex flex-col items-center justify-center text-center space-y-4 shadow-inner">
                    <div className="w-12 h-12 rounded-xl bg-slate-900 border border-[#1b253b] flex items-center justify-center text-slate-500">
                      <Info className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-slate-300">Awaiting Sequence Range</h4>
                      <p className="text-xs text-slate-500 max-w-sm">
                        Please enter valid stock and target sizes in the configuration panel to plot the draw stage progression matrix.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* TAB 3: FLAT RECTANGULAR SIZING */}
          {activeTab === 'flat' && (
            <>
              {/* Inputs Panel */}
              <div className="lg:col-span-5 bg-[#0D1325] border border-[#1b253b] rounded-2xl p-6 space-y-6 shadow-xl">
                <div className="flex items-center justify-between border-b border-[#1b253b] pb-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-heading">
                    Flat Profiling Inputs
                  </h3>
                  <span className="text-[10px] font-mono text-slate-500">TAB_3 // FLAT_STRIP</span>
                </div>

                <div className="space-y-6">
                  {/* Inlet Geometry */}
                  <div className="space-y-3">
                    <span className="text-[10px] font-mono font-bold text-purple-400 uppercase tracking-widest block">
                      Inlet Stock Profile (Raw)
                    </span>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-mono font-bold text-slate-455 uppercase tracking-widest block mb-1">
                          Width (w₁)
                        </label>
                        <div className="relative rounded-xl shadow-sm">
                          <input 
                            type="number" 
                            step="0.01" 
                            value={flatInWidth}
                            onChange={(e) => setFlatInWidth(e.target.value)}
                            className="w-full bg-[#050816] border border-[#1b253b] rounded-xl px-3.5 py-2.5 pr-14 text-white font-mono text-xs focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none transition-premium"
                          />
                          <div className="absolute right-2.5 top-1.5 px-2 py-0.5 bg-[#121A2F] border border-[#2b3a61]/40 rounded text-slate-500 text-[10px] font-mono shadow-inner">
                            mm
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-mono font-bold text-slate-455 uppercase tracking-widest block mb-1">
                          Thickness (t₁)
                        </label>
                        <div className="relative rounded-xl shadow-sm">
                          <input 
                            type="number" 
                            step="0.01" 
                            value={flatInThick}
                            onChange={(e) => setFlatInThick(e.target.value)}
                            className="w-full bg-[#050816] border border-[#1b253b] rounded-xl px-3.5 py-2.5 pr-14 text-white font-mono text-xs focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none transition-premium"
                          />
                          <div className="absolute right-2.5 top-1.5 px-2 py-0.5 bg-[#121A2F] border border-[#2b3a61]/40 rounded text-slate-500 text-[10px] font-mono shadow-inner">
                            mm
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Outlet Geometry */}
                  <div className="space-y-3 pt-4 border-t border-[#1b253b]">
                    <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest block">
                      Outlet finished Profile
                    </span>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-mono font-bold text-slate-455 uppercase tracking-widest block mb-1">
                          Width (w₂)
                        </label>
                        <div className="relative rounded-xl shadow-sm">
                          <input 
                            type="number" 
                            step="0.01" 
                            value={flatOutWidth}
                            onChange={(e) => setFlatOutWidth(e.target.value)}
                            className="w-full bg-[#050816] border border-[#1b253b] rounded-xl px-3.5 py-2.5 pr-14 text-white font-mono text-xs focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none transition-premium"
                          />
                          <div className="absolute right-2.5 top-1.5 px-2 py-0.5 bg-[#121A2F] border border-[#2b3a61]/40 rounded text-slate-500 text-[10px] font-mono shadow-inner">
                            mm
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-mono font-bold text-slate-455 uppercase tracking-widest block mb-1">
                          Thickness (t₂)
                        </label>
                        <div className="relative rounded-xl shadow-sm">
                          <input 
                            type="number" 
                            step="0.01" 
                            value={flatOutThick}
                            onChange={(e) => setFlatOutThick(e.target.value)}
                            className="w-full bg-[#050816] border border-[#1b253b] rounded-xl px-3.5 py-2.5 pr-14 text-white font-mono text-xs focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none transition-premium"
                          />
                          <div className="absolute right-2.5 top-1.5 px-2 py-0.5 bg-[#121A2F] border border-[#2b3a61]/40 rounded text-slate-500 text-[10px] font-mono shadow-inner">
                            mm
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Outputs Column */}
              <div className="lg:col-span-7 bg-[#0D1325] border border-[#1b253b] rounded-2xl p-6 flex flex-col justify-between shadow-xl min-h-[580px]">
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-[#1b253b] pb-4">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider font-heading">
                      Profile Transformation Matrix
                    </h3>
                    <span className="text-[10px] font-mono text-slate-500">SCHEMATIC // ROLLING_TRANSITION</span>
                  </div>

                  {flatResults ? (
                    <>
                      {/* Interactive Profile comparison graphic */}
                      <div className="bg-[#050816] border border-[#1b253b] rounded-2xl p-4 flex flex-col items-center justify-center relative overflow-hidden shadow-inner blueprint-grid">
                        <div className="absolute top-3 left-4 text-[9px] font-mono text-slate-500 tracking-wider flex items-center gap-1.5 uppercase">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Aspect Deformation Overlay
                        </div>

                        {(() => {
                          const inValW = parseFloat(flatInWidth) || 20.0
                          const inValT = parseFloat(flatInThick) || 5.0
                          const outValW = parseFloat(flatOutWidth) || 18.0
                          const outValT = parseFloat(flatOutThick) || 4.5

                          const maxDimension = Math.max(inValW, inValT, outValW, outValT, 1)
                          const scale = 110 / maxDimension

                          const inW = inValW * scale
                          const inH = inValT * scale
                          const outW = outValW * scale
                          const outH = outValT * scale

                          return (
                            <svg className="w-full h-[180px]" viewBox="0 0 500 200" xmlns="http://www.w3.org/2000/svg">
                              <defs>
                                <pattern id="hatchEmerald" width="6" height="6" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                                  <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(16, 185, 129, 0.15)" strokeWidth="1" />
                                </pattern>
                                <pattern id="hatchBlue" width="6" height="6" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                                  <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(59, 130, 246, 0.18)" strokeWidth="1" />
                                </pattern>
                              </defs>

                              {/* Grid lines */}
                              <line x1="250" y1="20" x2="250" y2="180" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1" strokeDasharray="3 3" />

                              {/* Left profile: Inlet */}
                              <g transform="translate(130, 100)">
                                <rect 
                                  x={-inW/2} 
                                  y={-inH/2} 
                                  width={inW} 
                                  height={inH} 
                                  fill="rgba(16, 185, 129, 0.05)" 
                                  stroke="#10b981" 
                                  strokeWidth="2" 
                                />
                                <rect 
                                  x={-inW/2} 
                                  y={-inH/2} 
                                  width={inW} 
                                  height={inH} 
                                  fill="url(#hatchEmerald)" 
                                />
                                
                                {/* Width Dimension */}
                                <line x1={-inW/2} y1={inH/2 + 15} x2={inW/2} y2={inH/2 + 15} stroke="#10b981" strokeWidth="1" />
                                <polygon points={`${-inW/2},${inH/2 + 15} ${-inW/2 + 5},${inH/2 + 12} ${-inW/2 + 5},${inH/2 + 18}`} fill="#10b981" />
                                <polygon points={`${inW/2},${inH/2 + 15} ${inW/2 - 5},${inH/2 + 12} ${inW/2 - 5},${inH/2 + 18}`} fill="#10b981" />
                                <text x="0" y={inH/2 + 27} fill="#10b981" fontSize="9" fontFamily="Fira Code, monospace" textAnchor="middle">
                                  w₁:{inValW.toFixed(1)}
                                </text>

                                {/* Thickness Dimension */}
                                <line x1={-inW/2 - 15} y1={-inH/2} x2={-inW/2 - 15} y2={inH/2} stroke="#10b981" strokeWidth="1" />
                                <polygon points={`${-inW/2 - 15},${-inH/2} ${-inW/2 - 18},${-inH/2 + 5} ${-inW/2 - 12},${-inH/2 + 5}`} fill="#10b981" />
                                <polygon points={`${-inW/2 - 15},${inH/2} ${-inW/2 - 18},${inH/2 - 5} ${-inW/2 - 12},${inH/2 - 5}`} fill="#10b981" />
                                <text x={-inW/2 - 25} y="3" fill="#10b981" fontSize="9" fontFamily="Fira Code, monospace" textAnchor="end">
                                  t₁:{inValT.toFixed(1)}
                                </text>

                                <text x="0" y={-inH/2 - 12} fill="rgba(16, 185, 129, 0.8)" fontSize="10" fontFamily="Outfit, sans-serif" fontWeight="bold" textAnchor="middle">
                                  RAW STOCK
                                </text>
                              </g>

                              {/* Center Transition indicator */}
                              <g transform="translate(250, 100)">
                                <circle r="12" fill="#0D1325" stroke="rgba(99, 102, 241, 0.25)" strokeWidth="1" />
                                <ArrowRight className="h-4 w-4 text-slate-500 absolute -left-2 -top-2 animate-pulse" />
                              </g>

                              {/* Right profile: Outlet overlaid with Inlet dashed */}
                              <g transform="translate(370, 100)">
                                {/* Inlet contour for comparison */}
                                <rect 
                                  x={-inW/2} 
                                  y={-inH/2} 
                                  width={inW} 
                                  height={inH} 
                                  fill="none" 
                                  stroke="rgba(16, 185, 129, 0.2)" 
                                  strokeWidth="1.5" 
                                  strokeDasharray="3 3" 
                                />

                                {/* Finished outlet rectangle */}
                                <rect 
                                  x={-outW/2} 
                                  y={-outH/2} 
                                  width={outW} 
                                  height={outH} 
                                  fill="rgba(59, 130, 246, 0.06)" 
                                  stroke="#3b82f6" 
                                  strokeWidth="2" 
                                />
                                <rect 
                                  x={-outW/2} 
                                  y={-outH/2} 
                                  width={outW} 
                                  height={outH} 
                                  fill="url(#hatchBlue)" 
                                />

                                {/* Width Dimension */}
                                <line x1={-outW/2} y1={outH/2 + 15} x2={outW/2} y2={outH/2 + 15} stroke="#3b82f6" strokeWidth="1" />
                                <polygon points={`${-outW/2},${outH/2 + 15} ${-outW/2 + 5},${outH/2 + 12} ${-outW/2 + 5},${outH/2 + 18}`} fill="#3b82f6" />
                                <polygon points={`${outW/2},${outH/2 + 15} ${outW/2 - 5},${outH/2 + 12} ${outW/2 - 5},${outH/2 + 18}`} fill="#3b82f6" />
                                <text x="0" y={outH/2 + 27} fill="#3b82f6" fontSize="9" fontFamily="Fira Code, monospace" textAnchor="middle">
                                  w₂:{outValW.toFixed(1)}
                                </text>

                                {/* Thickness Dimension */}
                                <line x1={outW/2 + 15} y1={-outH/2} x2={outW/2 + 15} y2={outH/2} stroke="#3b82f6" strokeWidth="1" />
                                <polygon points={`${outW/2 + 15},${-outH/2} ${outW/2 + 12},${-outH/2 + 5} ${outW/2 + 18},${-outH/2 + 5}`} fill="#3b82f6" />
                                <polygon points={`${outW/2 + 15},${outH/2} ${outW/2 + 12},${outH/2 - 5} ${outW/2 + 18},${outH/2 - 5}`} fill="#3b82f6" />
                                <text x={outW/2 + 23} y="3" fill="#3b82f6" fontSize="9" fontFamily="Fira Code, monospace" textAnchor="start">
                                  t₂:{outValT.toFixed(1)}
                                </text>

                                <text x="0" y={-inH/2 - 12} fill="rgba(59, 130, 246, 0.9)" fontSize="10" fontFamily="Outfit, sans-serif" fontWeight="bold" textAnchor="middle">
                                  FINISHED STRIP
                                </text>
                              </g>
                            </svg>
                          )
                        })()}
                      </div>

                      {/* Material Yield Verification Message */}
                      {(() => {
                        const limit = getMaterialLimit()
                        const isUnsafe = flatResults.reduction > limit
                        return (
                          <div className="animate-fadeIn">
                            {isUnsafe ? (
                              <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 flex items-start gap-3 text-rose-400 shadow-inner">
                                <Info className="h-5 w-5 shrink-0 mt-0.5" />
                                <div>
                                  <span className="text-xs font-bold block uppercase tracking-wider">Warning: Material Yield Limit Exceeded</span>
                                  <p className="text-[11px] text-rose-350 leading-normal mt-1">
                                    Calculated area reduction (<span className="font-mono font-bold">{flatResults.reduction.toFixed(2)}%</span>) exceeds the safe limit of <span className="font-mono font-bold">{limit}%</span> for the selected stock material. High risk of strip fracturing or roll deformation.
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4 flex items-start gap-3 text-emerald-400 shadow-inner">
                                <Info className="h-5 w-5 shrink-0 mt-0.5 text-emerald-555" />
                                <div>
                                  <span className="text-xs font-bold block uppercase tracking-wider text-emerald-350">Draft Sizing Verified</span>
                                  <p className="text-[11px] text-emerald-300 leading-normal mt-1">
                                    Sizing is within safe limits for flat drawing (<span className="font-mono font-bold">{flatResults.reduction.toFixed(2)}%</span> vs <span className="font-mono font-bold">{limit}%</span> max limit). Aspect ratio profile is stable.
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })()}

                      {/* KPI Metric Readouts */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {/* KPI 1: Area Reduction */}
                        <div className="bg-[#121A2F] border border-[#1b253b] p-4.5 rounded-xl transition-premium hover:border-emerald-500/30 shadow-inner group">
                          <span className="text-[10px] text-slate-400 font-heading font-semibold uppercase tracking-wider block mb-1">
                            Area Red. (R)
                          </span>
                          <div className="text-xl font-bold font-mono text-emerald-400 tracking-tight">
                            {flatResults.reduction.toFixed(2)}%
                          </div>
                          <span className="text-[9px] text-slate-500 mt-1 block">Total draft deformation.</span>
                        </div>

                        {/* KPI 2: Elongation */}
                        <div className="bg-[#121A2F] border border-[#1b253b] p-4.5 rounded-xl transition-premium hover:border-blue-500/30 shadow-inner group">
                          <span className="text-[10px] text-slate-400 font-heading font-semibold uppercase tracking-wider block mb-1">
                            Elongation (E)
                          </span>
                          <div className="text-xl font-bold font-mono text-blue-400 tracking-tight">
                            {flatResults.elongation.toFixed(2)}%
                          </div>
                          <span className="text-[9px] text-slate-500 mt-1 block">Exit length increase.</span>
                        </div>

                        {/* KPI 3: Width Reduction */}
                        <div className="bg-[#121A2F] border border-[#1b253b] p-4.5 rounded-xl transition-premium shadow-inner group">
                          <span className="text-[10px] text-slate-400 font-heading font-semibold uppercase tracking-wider block mb-1">
                            Width Red.
                          </span>
                          <div className="text-xl font-bold font-mono text-slate-200 tracking-tight">
                            {flatResults.widthRed.toFixed(2)}%
                          </div>
                          <span className="text-[9px] text-slate-500 mt-1 block">Horizontal compression.</span>
                        </div>

                        {/* KPI 4: Thickness Reduction */}
                        <div className="bg-[#121A2F] border border-[#1b253b] p-4.5 rounded-xl transition-premium shadow-inner group">
                          <span className="text-[10px] text-slate-400 font-heading font-semibold uppercase tracking-wider block mb-1">
                            Thick. Red.
                          </span>
                          <div className="text-xl font-bold font-mono text-slate-200 tracking-tight">
                            {flatResults.thickRed.toFixed(2)}%
                          </div>
                          <span className="text-[9px] text-slate-500 mt-1 block">Vertical compression.</span>
                        </div>

                        {/* Area A1 */}
                        <div className="bg-[#121A2F] border border-[#1b253b] p-4 rounded-xl shadow-inner col-span-2">
                          <div className="flex justify-between items-center text-xs font-mono">
                            <span className="text-slate-400 uppercase tracking-wider text-[9px] font-heading font-bold">Inlet area (A₁)</span>
                            <span className="font-semibold text-white">
                              {flatResults.inArea.toFixed(2)} <span className="text-[10px] text-slate-500">mm²</span>
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-xs font-mono mt-2 border-t border-[#1b253b]/55 pt-2">
                            <span className="text-slate-400 uppercase tracking-wider text-[9px] font-heading font-bold">Inlet Aspect (w₁/t₁)</span>
                            <span className="font-semibold text-slate-350">
                              {flatResults.aspectIn.toFixed(2)}:1
                            </span>
                          </div>
                        </div>

                        {/* Area A2 */}
                        <div className="bg-[#121A2F] border border-[#1b253b] p-4 rounded-xl shadow-inner col-span-2">
                          <div className="flex justify-between items-center text-xs font-mono">
                            <span className="text-slate-400 uppercase tracking-wider text-[9px] font-heading font-bold">Outlet area (A₂)</span>
                            <span className="font-semibold text-white">
                              {flatResults.outArea.toFixed(2)} <span className="text-[10px] text-slate-500">mm²</span>
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-xs font-mono mt-2 border-t border-[#1b253b]/55 pt-2">
                            <span className="text-slate-400 uppercase tracking-wider text-[9px] font-heading font-bold">Outlet Aspect (w₂/t₂)</span>
                            <span className="font-semibold text-slate-355">
                              {flatResults.aspectOut.toFixed(2)}:1
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Flat Drawing Physics & Die Match Card */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                        <div className="bg-[#121A2F]/90 border border-[#1b253b] p-5 rounded-xl space-y-3 shadow-inner">
                          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-heading flex items-center gap-1.5">
                            <Zap className="h-4 w-4 text-amber-500" />
                            Mechanical Tension & Power
                          </h4>
                          {(() => {
                            const alphaRad = (parseFloat(dieAngle) * Math.PI) / 180
                            const mu = 0.07
                            const sigmaD = parseFloat(yieldStrength) * Math.log(flatResults.inArea / flatResults.outArea) * (1 + mu / Math.tan(alphaRad))
                            const forceN = flatResults.outArea * sigmaD
                            const powerKw = (forceN * parseFloat(drawSpeed)) / 1000
                            const isStressUnsafe = sigmaD >= 0.6 * parseFloat(uts)

                            return (
                              <div className="space-y-2.5 font-mono text-xs text-slate-300">
                                <div className="flex justify-between">
                                  <span className="text-slate-400 uppercase text-[9px] font-heading font-bold">Drawing Force:</span>
                                  <span className="font-bold text-white">{forceN.toFixed(0)} N</span>
                                </div>
                                <div className="flex justify-between border-t border-[#1b253b]/55 pt-2">
                                  <span className="text-slate-400 uppercase text-[9px] font-heading font-bold">Drawing Stress:</span>
                                  <span className={`font-bold ${isStressUnsafe ? 'text-rose-400' : 'text-indigo-400'}`}>
                                    {sigmaD.toFixed(1)} MPa {isStressUnsafe && '(High Tension)'}
                                  </span>
                                </div>
                                <div className="flex justify-between border-t border-[#1b253b]/55 pt-2">
                                  <span className="text-slate-400 uppercase text-[9px] font-heading font-bold">Power Required:</span>
                                  <span className="font-bold text-emerald-400">{powerKw.toFixed(2)} kW</span>
                                </div>
                              </div>
                            )
                          })()}
                        </div>

                        <div className="bg-[#121A2F]/90 border border-[#1b253b] p-5 rounded-xl space-y-3 shadow-inner">
                          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-heading flex items-center gap-1.5">
                            <Table className="h-4 w-4 text-blue-500" />
                            Matched Flat Dies in Inventory
                          </h4>
                          
                          {matchingDies[999] ? (
                            <div className="flex flex-wrap gap-2 pt-1 font-mono">
                              {matchingDies[999].length > 0 ? (
                                matchingDies[999].map(die => (
                                  <a
                                    key={die.die_id}
                                    href={`#/dies/${die.die_id}`}
                                    className={`inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold border transition ${
                                      die.status === 'AVAILABLE'
                                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                                        : 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20'
                                    }`}
                                  >
                                    {die.die_id} ({parseFloat(die.width || 0).toFixed(2)}x{parseFloat(die.thickness || 0).toFixed(2)}mm)
                                  </a>
                                ))
                              ) : (
                                <span className="text-xs text-slate-500 font-mono">No matching flat dies in inventory</span>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => findMatchingFlatDies(999, parseFloat(flatOutWidth), parseFloat(flatOutThick))}
                              disabled={loadingDies[999]}
                              className="w-full py-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 text-xs font-bold rounded-xl border border-blue-600/30 transition flex items-center justify-center gap-1 disabled:opacity-50"
                            >
                              {loadingDies[999] ? 'Searching...' : 'Scan Inventory for Matching Dies'}
                            </button>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="bg-[#050816] border border-[#1b253b] rounded-2xl py-20 px-6 flex flex-col items-center justify-center text-center space-y-4 shadow-inner">
                      <div className="w-12 h-12 rounded-xl bg-slate-900 border border-[#1b253b] flex items-center justify-center text-slate-500">
                        <Info className="h-6 w-6" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-slate-300">Awaiting Profile Parameters</h4>
                        <p className="text-xs text-slate-500 max-w-sm">
                          Please enter valid raw and finished dimensions in the configurator panel to generate deformation matrix graphs.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {flatResults && (
                  <div className="mt-8 border-t border-[#1b253b] pt-4 text-[10px] text-slate-500 font-mono flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/80" />
                    DEFORMATION FLOW MODELED ACCORDING TO STRIP-DRAWING PLANE STRESS THEORY
                  </div>
                )}
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
