import { useState, useCallback } from 'react'
import { useApi } from '../../../hooks/useApi'
import { useToast } from '../../../contexts'
import {
  PassAssignmentInput,
  PassStep,
  PassResult,
  OptimizerResult,
  MATERIAL_PROPS,
  LUBRICATION_MU,
} from '../types'
import type { Die } from '../../../types'

function generateSequence(start: number, end: number, avgRed: number, mode: 'constant' | 'graduated'): PassStep[] {
  const steps: PassStep[] = []
  let currentDia = start
  let currentRed = mode === 'graduated' ? Math.min(avgRed * 1.25, 30.0) : avgRed
  let safety = 0

  while (currentDia > end && safety < 50) {
    safety++
    const factor = 1 - currentRed / 100
    const nextArea = Math.PI * Math.pow(currentDia / 2, 2) * factor
    const nextDia = 2 * Math.sqrt(nextArea / Math.PI)

    if (nextDia <= end) {
      const inArea = Math.PI * Math.pow(currentDia / 2, 2)
      const outArea = Math.PI * Math.pow(end / 2, 2)
      steps.push({
        draft: steps.length + 1,
        inlet: currentDia,
        outlet: end,
        reduction: ((inArea - outArea) / inArea) * 100,
        elongation: ((inArea / outArea) - 1) * 100,
        drawingRatio: inArea / outArea,
      })
      break
    } else {
      steps.push({
        draft: steps.length + 1,
        inlet: currentDia,
        outlet: nextDia,
        reduction: currentRed,
        elongation: (1 / factor - 1) * 100,
        drawingRatio: 1 / factor,
      })
      currentDia = nextDia
      if (mode === 'graduated') {
        currentRed = Math.max(currentRed * 0.88, 8.0)
      }
    }
  }
  return steps
}

function getFlowStress(
  inArea: number,
  outArea: number,
  matProps: { K: number; n: number; yieldStrength: number },
  customYield?: number,
): number {
  const epsilon = Math.log(inArea / outArea)
  if (epsilon <= 0) return customYield ?? matProps.yieldStrength
  return matProps.yieldStrength + (matProps.K * Math.pow(epsilon, matProps.n)) / (matProps.n + 1)
}

function getDrawingStress(
  inArea: number,
  outArea: number,
  alphaRad: number,
  mu: number,
  flowStress: number,
): number {
  if (inArea <= outArea || alphaRad <= 0) return 0
  const epsilon = Math.log(inArea / outArea)
  const r = (inArea - outArea) / inArea
  const delta = (alphaRad / r) * (2 - r)
  const phi = 0.88 + 0.12 * delta
  return flowStress * (1 + mu / Math.tan(alphaRad)) * epsilon * phi
}

function getTempRise(stress: number, strain: number, density: number, specificHeat: number): number {
  return (stress * strain) / (density * specificHeat)
}

function getHollomonCriterion(diaRatio: number, alphaRad: number): 'safe' | 'caution' | 'danger' {
  const val = diaRatio * Math.sin(alphaRad)
  if (val > 1.4) return 'safe'
  if (val > 1.0) return 'caution'
  return 'danger'
}

const STATUS_PRIORITY: Record<string, number> = {
  AVAILABLE: 0,
  RUNNING: 1,
  CLEANING: 2,
  POLISHING: 3,
  MAINTENANCE: 4,
  DAMAGED: 5,
  SCRAPPED: 6,
  MISSING: 7,
}

function rankDies(dies: any[], usedDieIds: Set<string>): any | null {
  const available = dies.filter((d) => !usedDieIds.has(d.die_id))
  if (available.length === 0) return null

  available.sort((a, b) => {
    const pa = STATUS_PRIORITY[a.status] ?? 99
    const pb = STATUS_PRIORITY[b.status] ?? 99
    if (pa !== pb) return pa - pb
    const sa = parseFloat(String(a.current_size ?? 0))
    const sb = parseFloat(String(b.current_size ?? 0))
    return Math.abs(sa) - Math.abs(sb)
  })

  return available[0]
}

export function usePassOptimizer() {
  const { request } = useApi()
  const { showToast } = useToast()
  const [results, setResults] = useState<OptimizerResult | null>(null)
  const [loading, setLoading] = useState(false)

  const optimize = useCallback(async (input: PassAssignmentInput) => {
    setLoading(true)
    try {
      const matProps = MATERIAL_PROPS[input.materialType] ?? MATERIAL_PROPS.copper_soft
      const mu = LUBRICATION_MU[input.lubrication] ?? 0.04
      const alphaRad = (input.dieAngle * Math.PI) / 180
      const customYield = input.customYield

      const steps = generateSequence(input.startDia, input.targetDia, input.avgReduction, input.optMode)
      if (steps.length === 0) {
        showToast('No passes generated — check input parameters', 'error')
        setLoading(false)
        return
      }

      const usedDieIds = new Set<string>()
      const passResults: PassResult[] = []

      for (const step of steps) {
        const inArea = Math.PI * Math.pow(step.inlet / 2, 2)
        const outArea = Math.PI * Math.pow(step.outlet / 2, 2)
        const flowStress = getFlowStress(inArea, outArea, matProps, customYield)
        const drawStress = getDrawingStress(inArea, outArea, alphaRad, mu, flowStress)
        const powerKw = (outArea * drawStress * input.drawSpeed) / 1000
        const tempRise = getTempRise(drawStress, step.elongation / 100, matProps.density, matProps.specificHeat)
        const centralBurstRisk = getHollomonCriterion(step.drawingRatio, alphaRad)

        let assignment = null
        try {
          const sizeMin = (step.outlet - input.searchTolerance).toFixed(3)
          const sizeMax = (step.outlet + input.searchTolerance).toFixed(3)
          const res = await request(`/api/go/search?die_type=ROUND&size_min=${sizeMin}&size_max=${sizeMax}&limit=5`, {
            cancelKey: `pass_opt_${step.draft}`,
          })
          const dies = (res && typeof res === 'object' && 'results' in res)
            ? (res.results as any[])
            : (Array.isArray(res) ? res : [])

          const bestDie = rankDies(dies, usedDieIds)
          if (bestDie) {
            usedDieIds.add(bestDie.die_id)
            const dieSize = parseFloat(String(bestDie.current_size ?? 0))
            assignment = {
              die: bestDie,
              status: bestDie.status,
              sizeDelta: Math.abs(dieSize - step.outlet),
              locationText: bestDie.rack_name && bestDie.shelf
                ? `${bestDie.rack_name} - S${bestDie.shelf}`
                : bestDie.location || 'Unassigned',
            }
          }
        } catch {
          // Search failed for this pass — continue without assignment
        }

        passResults.push({
          step,
          assignment,
          drawStress,
          flowStress,
          tempRise,
          centralBurstRisk,
          powerKw,
        })
      }

      const startArea = Math.PI * Math.pow(input.startDia / 2, 2)
      const endArea = Math.PI * Math.pow(input.targetDia / 2, 2)

      setResults({
        passes: passResults,
        totalReduction: ((startArea - endArea) / startArea) * 100,
        totalElongation: ((startArea / endArea) - 1) * 100,
        gapsCount: passResults.filter((p) => !p.assignment).length,
        assignedCount: passResults.filter((p) => p.assignment).length,
        maxStress: Math.max(...passResults.map((p) => p.drawStress)),
        maxTempRise: Math.max(...passResults.map((p) => p.tempRise)),
        usedDieIds,
      })
    } catch (err) {
      console.error('Optimizer failed:', err)
      showToast('Optimization failed — check console for details', 'error')
    } finally {
      setLoading(false)
    }
  }, [request, showToast])

  const exportCSV = useCallback(() => {
    if (!results) return
    const header = 'Pass,Inlet (mm),Outlet (mm),Reduction %,Drawing Stress MPa,Temp Rise C,Power kW,Burst Risk,Die ID,Die Status,Die Location,Die Delta mm'
    const rows = results.passes.map((p) =>
      [
        p.step.draft,
        p.step.inlet.toFixed(3),
        p.step.outlet.toFixed(3),
        p.step.reduction.toFixed(1),
        p.drawStress.toFixed(1),
        (p.tempRise * 1000).toFixed(1),
        p.powerKw.toFixed(2),
        p.centralBurstRisk,
        p.assignment?.die?.die_id ?? 'GAP',
        p.assignment?.status ?? 'N/A',
        p.assignment?.locationText ?? 'N/A',
        p.assignment?.sizeDelta.toFixed(3) ?? 'N/A',
      ].join(','),
    )
    const csv = `data:text/csv;charset=utf-8,${header}\n${rows.join('\n')}`
    const link = document.createElement('a')
    link.setAttribute('href', encodeURI(csv))
    link.setAttribute('download', `pass_assignment.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [results])

  return { results, loading, optimize, exportCSV }
}
