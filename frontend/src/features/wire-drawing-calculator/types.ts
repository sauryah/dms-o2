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
