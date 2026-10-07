export interface PassData {
  pass: number;
  fromDie: number;
  toDie: number;
  areaBefore: number;
  areaAfter: number;
  areaReduction: number;
  elongation: number;
  reductionRatio: number;
}

export interface DieSchedule {
  id: string;
  name: string;
  dies: number[];
  timestamp: number;
}

export interface Statistics {
  totalPasses: number;
  startingDie: number;
  finalDie: number;
  avgElongation: number;
  maxElongation: number;
  minElongation: number;
  avgAreaReduction: number;
  overallAreaReduction: number;
  overallReductionRatio: number;
}

export interface ConsistencyData {
  avgElongation: number;
  variation: number;
  qualityRating: string;
  stars: number;
}

export type DarkMode = boolean;

export interface PrintRecordNextRefResponse {
  doc_ref: string;
  default_work_order: string;
}

export interface PrintRecord {
  id: number;
  doc_type: string;
  doc_ref: string;
  work_order: string;
  machine_name: string;
  material_profile: string;
  quality_status: string;
  notes: string;
  inlet_size: string | number | null;
  finish_size: string | number | null;
  total_passes: number;
  overall_reduction: string | number | null;
  avg_elongation: string | number | null;
  dies: number[];
  passes_data: PassData[];
  printed_by: number | null;
  username: string;
  user_role: string;
  ip_address: string | null;
  created_at: string;
}
