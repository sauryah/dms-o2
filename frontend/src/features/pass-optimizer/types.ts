import { DieStatus } from '../../contracts/dieContracts'

export interface PassAssignmentInput {
  startDia: number
  targetDia: number
  materialType: 'copper_soft' | 'copper_hard' | 'aluminum' | 'steel_low' | 'custom'
  customYield?: number
  customK?: number
  customN?: number
  avgReduction: number
  optMode: 'constant' | 'graduated'
  drawSpeed: number
  dieAngle: number
  lubrication: 'hydrodynamic' | 'dry_soap' | 'wet_oil' | 'boundary'
  searchTolerance: number
}

export interface PassStep {
  draft: number
  inlet: number
  outlet: number
  reduction: number
  elongation: number
  drawingRatio: number
}

export interface DieAssignment {
  die: { die_id: string }
  status: DieStatus
  sizeDelta: number
  locationText: string
}

export interface PassResult {
  step: PassStep
  assignment: DieAssignment | null
  drawStress: number
  flowStress: number
  tempRise: number
  centralBurstRisk: 'safe' | 'caution' | 'danger'
  powerKw: number
}

export interface OptimizerResult {
  passes: PassResult[]
  totalReduction: number
  totalElongation: number
  gapsCount: number
  assignedCount: number
  maxStress: number
  maxTempRise: number
  usedDieIds: Set<string>
}

export interface MaterialProps {
  K: number
  n: number
  yieldStrength: number
  density: number
  specificHeat: number
}

export const MATERIAL_PROPS: Record<string, MaterialProps> = {
  copper_soft: { K: 315, n: 0.54, yieldStrength: 70, density: 8960, specificHeat: 385 },
  copper_hard: { K: 450, n: 0.10, yieldStrength: 250, density: 8960, specificHeat: 385 },
  aluminum: { K: 180, n: 0.20, yieldStrength: 80, density: 2700, specificHeat: 900 },
  steel_low: { K: 530, n: 0.26, yieldStrength: 250, density: 7850, specificHeat: 500 },
}

export const LUBRICATION_MU: Record<string, number> = {
  hydrodynamic: 0.02,
  dry_soap: 0.04,
  wet_oil: 0.06,
  boundary: 0.10,
}
