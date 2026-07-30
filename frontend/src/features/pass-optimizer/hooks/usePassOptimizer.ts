import { useState, useCallback } from 'react'
import { useApi } from '../../../hooks/useApi'
import { useToast } from '../../../contexts'
import {
  PassAssignmentInput,
  OptimizerResult,
} from '../types'

export function usePassOptimizer() {
  const { request } = useApi()
  const { showToast } = useToast()
  const [results, setResults] = useState<OptimizerResult | null>(null)
  const [loading, setLoading] = useState(false)

  const optimize = useCallback(async (input: PassAssignmentInput) => {
    setLoading(true)
    try {
      const res = await request('/api/go/tools/optimize-passes', {
        method: 'POST',
        body: JSON.stringify(input),
        headers: { 'Content-Type': 'application/json' },
      })
      if (res) {
        setResults({
          passes: res.passes.map((p: any) => ({
            step: {
              draft: p.step.draft,
              inlet: p.step.inlet,
              outlet: p.step.outlet,
              reduction: p.step.reduction,
              elongation: p.step.elongation,
              drawingRatio: p.step.drawing_ratio
            },
            assignment: p.assignment ? {
              die: p.assignment.die,
              status: p.assignment.status,
              sizeDelta: p.assignment.sizeDelta,
              locationText: p.assignment.locationText
            } : null,
            drawStress: p.drawStress,
            flowStress: p.flowStress,
            tempRise: p.tempRise,
            centralBurstRisk: p.centralBurstRisk,
            powerKw: p.powerKw
          })),
          totalReduction: res.totalReduction,
          totalElongation: res.totalElongation,
          gapsCount: res.gapsCount,
          assignedCount: res.assignedCount,
          maxStress: res.maxStress,
          maxTempRise: res.maxTempRise,
          usedDieIds: new Set(res.usedDieIds),
        })
      }
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
    const rows = results.passes.map((p: any) =>
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
