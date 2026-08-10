export interface Requirement {
  die_size: string
  required_per_set: number
  available: number
  possible_sets: number
  used: number
  remaining: number
  is_bottleneck: boolean
  is_missing: boolean
}

export interface Bottleneck {
  die_size: string
  required_per_set: number
  available: number
  possible_sets: number
}

export interface InventoryLine {
  die_size: string
  quantity: number
}

export interface ProcurementItem {
  die_size: string
  required_per_set: number
  available: number
  target_need: number
  procure: number
}

export interface DieSetResult {
  maximum_sets: number
  total_dies_per_set: number
  requirements: Requirement[]
  bottlenecks: Bottleneck[]
  missing_dies: InventoryLine[]
  unused_inventory: InventoryLine[]
  procurement?: ProcurementItem[]
  target_sets?: number
  warnings: string[]
}

export interface DieSetCalculateRequest {
  inventory_text: string
  series_text: string
  target_sets?: number
}

export interface MachineDieStock {
  id: number
  machine: number
  machine_name: string
  die_size: string
  quantity: number
  updated_at: string
}

export interface DieInventoryRecountItem {
  id?: number
  die_size: string
  quantity: number
}

export type RecountStatus = 'DRAFT' | 'SUBMITTED'

export interface DieInventoryRecount {
  id: number
  name: string
  machine: number
  machine_name: string
  recount_date: string
  created_at: string
  created_by?: number
  created_by_username: string
  status: RecountStatus
  items: DieInventoryRecountItem[]
}