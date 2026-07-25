import { useState, useEffect, useCallback } from 'react'
import { useApi } from '../../hooks/useApi'
import { useToast } from '../../contexts'

export function useCalculatorState() {
  const { request } = useApi()
  const { showToast } = useToast()

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

  const getRoundValidationError = () => {
    const inVal = parseFloat(roundInlet)
    const outVal = parseFloat(roundOutlet)
    const targetRed = parseFloat(roundTargetRed)
    const targetElong = parseFloat(roundTargetElong)

    if (isNaN(inVal) || inVal <= 0) return 'Inlet diameter (d₁) must be a positive number greater than 0 mm.'

    if (roundCalcMode === 'forward') {
      if (isNaN(outVal) || outVal <= 0) return 'Outlet diameter (d₂) must be a positive number greater than 0 mm.'
      if (outVal >= inVal) return `Outlet diameter (${outVal} mm) must be strictly smaller than inlet diameter (${inVal} mm).`
    } else if (roundCalcMode === 'backward_red') {
      if (isNaN(targetRed) || targetRed <= 0 || targetRed >= 100) return 'Target area reduction % must be between 0% and 100%.'
    } else if (roundCalcMode === 'backward_elong') {
      if (isNaN(targetElong) || targetElong <= 0) return 'Target elongation % must be a positive number greater than 0%.'
    }
    return null
  }

  const getSequenceValidationError = () => {
    const start = parseFloat(seqStart)
    const end = parseFloat(seqEnd)
    const avgRed = parseFloat(seqReduction)

    if (isNaN(start) || start <= 0) return 'Start diameter must be a positive number greater than 0 mm.'
    if (isNaN(end) || end <= 0) return 'End diameter must be a positive number greater than 0 mm.'
    if (start <= end) return `Start diameter (${start} mm) must be strictly greater than target end diameter (${end} mm).`
    if (isNaN(avgRed) || avgRed <= 0 || avgRed >= 100) return 'Average reduction % per pass must be between 0% and 100%.'
    return null
  }

  const getFlatValidationError = () => {
    const inW = parseFloat(flatInWidth)
    const inT = parseFloat(flatInThick)
    const outW = parseFloat(flatOutWidth)
    const outT = parseFloat(flatOutThick)

    if (isNaN(inW) || inW <= 0 || isNaN(inT) || inT <= 0) return 'Inlet width and thickness must be positive numbers greater than 0 mm.'
    if (isNaN(outW) || outW <= 0 || isNaN(outT) || outT <= 0) return 'Outlet width and thickness must be positive numbers greater than 0 mm.'
    const inArea = inW * inT
    const outArea = outW * outT
    if (outArea >= inArea) return `Finished outlet cross-section area (${outArea.toFixed(2)} mm²) must be smaller than inlet area (${inArea.toFixed(2)} mm²).`
    return null
  }

  const roundValidationError = getRoundValidationError()
  const sequenceValidationError = getSequenceValidationError()
  const flatValidationError = getFlatValidationError()
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
  const [lubrication, setLubrication] = useState<'hydrodynamic' | 'dry_soap' | 'wet_oil' | 'boundary'>('dry_soap')

  const getFrictionCoefficient = () => {
    switch (lubrication) {
      case 'hydrodynamic': return 0.02
      case 'dry_soap': return 0.04
      case 'wet_oil': return 0.06
      case 'boundary': return 0.10
      default: return 0.04
    }
  }
  const mu = getFrictionCoefficient()

  const getFlowStress = (inArea: number, outArea: number) => {
    const epsilon = Math.log(inArea / outArea)
    if (epsilon <= 0) return parseFloat(yieldStrength) || 70
    
    let K = 0
    let n = 0
    const y0 = parseFloat(yieldStrength) || 70
    
    switch (materialType) {
      case 'copper_soft':
        K = 315
        n = 0.54
        break
      case 'copper_hard':
        K = 450
        n = 0.10
        break
      case 'aluminum':
        K = 180
        n = 0.20
        break
      case 'steel_low':
        K = 530
        n = 0.26
        break
      case 'custom':
      default:
        return y0 + 150 * epsilon
    }
    return y0 + (K * Math.pow(epsilon, n)) / (n + 1)
  }

  const getDrawingStress = (inArea: number, outArea: number, alphaRad: number) => {
    if (inArea <= outArea || alphaRad <= 0) return 0
    const epsilon = Math.log(inArea / outArea)
    const r = (inArea - outArea) / inArea
    const delta = (alphaRad / r) * (2 - r)
    const phi = 0.88 + 0.12 * delta
    const flowStress = getFlowStress(inArea, outArea)
    return flowStress * (1 + mu / Math.tan(alphaRad)) * epsilon * phi
  }

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
      const res = await request(`/api/go/search?die_type=ROUND&size_min=${sizeMin}&size_max=${sizeMax}&limit=3`, {
        cancelKey: `matching_dies_round_${passNo}`
      })
      const results = (res && typeof res === 'object' && 'results' in res) ? res.results : (Array.isArray(res) ? res : [])
      setMatchingDies(prev => ({ ...prev, [passNo]: results }))
    } catch (err: any) {
      if (err?.type === 'aborted') return
      console.error('Failed to fetch matching dies', err)
      showToast('Failed to search matching dies inventory', 'error')
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
      const res = await request(`/api/go/search?die_type=FLAT&width_min=${widthMin}&width_max=${widthMax}&thick_min=${thickMin}&thick_max=${thickMax}&limit=3`, {
        cancelKey: `matching_dies_flat_${passNo}`
      })
      const results = (res && typeof res === 'object' && 'results' in res) ? res.results : (Array.isArray(res) ? res : [])
      setMatchingDies(prev => ({ ...prev, [passNo]: results }))
    } catch (err: any) {
      if (err?.type === 'aborted') return
      console.error('Failed to fetch matching flat dies', err)
      showToast('Failed to search matching flat dies inventory', 'error')
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
      const sigmaD = getDrawingStress(stepInArea, stepOutArea, alphaRad)
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

  return {
    // Tab state
    activeTab,
    setActiveTab,

    // Round Die state
    roundCalcMode,
    setRoundCalcMode,
    roundInlet,
    setRoundInlet,
    roundOutlet,
    setRoundOutlet,
    roundTargetRed,
    setRoundTargetRed,
    roundTargetElong,
    setRoundTargetElong,

    // Material state
    materialType,
    setMaterialType,
    customLimit,
    setCustomLimit,

    // Sequence state
    seqStart,
    setSeqStart,
    seqEnd,
    setSeqEnd,
    seqReduction,
    setSeqReduction,
    seqOptMode,
    setSeqOptMode,

    // Flat Die state
    flatInWidth,
    setFlatInWidth,
    flatInThick,
    setFlatInThick,
    flatOutWidth,
    setFlatOutWidth,
    flatOutThick,
    setFlatOutThick,

    // UI state
    showFormulaInfo,
    setShowFormulaInfo,

    // Physics state
    drawSpeed,
    setDrawSpeed,
    dieAngle,
    setDieAngle,
    yieldStrength,
    setYieldStrength,
    uts,
    setUts,
    lubrication,
    setLubrication,

    // Die matching state
    matchingDies,
    loadingDies,

    // Functions
    getMaterialLimit,
    getRoundValidationError,
    getSequenceValidationError,
    getFlatValidationError,
    getRoundResults,
    getSequenceResults,
    getFlatResults,
    getFrictionCoefficient,
    getFlowStress,
    getDrawingStress,
    findMatchingDies,
    findMatchingFlatDies,
    exportSequenceCSV,

    // Derived values
    mu,
    roundResults,
    sequenceResults,
    flatResults,
    roundValidationError,
    sequenceValidationError,
    flatValidationError,
  }
}
