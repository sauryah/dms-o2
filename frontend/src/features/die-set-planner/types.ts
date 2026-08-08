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

export interface DieSetResult {
  maximum_sets: number
  total_dies_per_set: number
  requirements: Requirement[]
  bottlenecks: Bottleneck[]
  missing_dies: InventoryLine[]
  unused_inventory: InventoryLine[]
  warnings: string[]
}

export interface DieSetCalculateRequest {
  inventory: { die_size: string; quantity: number }[]
  series: string[]
}