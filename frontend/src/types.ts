export type DieType = 'ROUND' | 'FLAT';

export type DieStatus = 
  | 'AVAILABLE' 
  | 'RUNNING' 
  | 'CLEANING' 
  | 'POLISHING' 
  | 'DAMAGED' 
  | 'SCRAPPED' 
  | 'MISSING';

export interface Die {
  die_id: string;
  die_type: DieType;
  casing: string;
  status: DieStatus;
  location: string | null;
  remarks: string | null;
  current_set: number | null;
  current_set_name?: string;
  set_name?: string;
  machine_name?: string;
  updated_at: string;
  
  // Round specific properties
  original_size?: string | number;
  current_size?: string | number;
  
  // Flat specific properties
  original_width?: string | number;
  current_width?: string | number;
  original_thickness?: string | number;
  current_thickness?: string | number;
  radius?: string | number;
}

export interface Set {
  id: number;
  name: string;
  machine: number | null;
  machine_name?: string;
  dies: Die[];
}

export interface Machine {
  id: number;
  name: string;
  category_name?: string;
  sets: Set[];
  totalDies: number;
}
