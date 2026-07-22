import { DIE_STATUSES, DIE_TYPES, type DieStatus, type DieType } from './contracts/dieContracts'

export interface Die {
  die_id: string;
  die_type: DieType;
  casing: string;
  status: DieStatus;
  rack_id?: number | null;
  rack_name?: string;
  shelf?: number | null;
  shelf_number?: number | null;
  remarks: string | null;
  current_set: number | null;
  current_set_name?: string;
  set_name?: string;
  machine_name?: string;
  updated_at: string;
  
  // Round specific properties
  punched_size?: string | number;
  current_size?: string | number;
  
  // Flat specific properties
  punched_width?: string | number;
  current_width?: string | number;
  punched_thickness?: string | number;
  current_thickness?: string | number;
  radius?: string | number;

  predicted_remaining_days?: number | null;
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

export function getStatusColorClass(status: DieStatus): string {
  const statusColors: Record<DieStatus, string> = {
    AVAILABLE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25 shadow-[0_0_8px_rgba(16,185,129,0.08)]',
    RUNNING: 'bg-blue-500/10 text-blue-400 border-blue-500/25 shadow-[0_0_8px_rgba(59,130,246,0.08)]',
    CLEANING: 'bg-amber-500/10 text-amber-400 border-amber-500/25 shadow-[0_0_8px_rgba(245,158,11,0.08)]',
    POLISHING: 'bg-purple-500/10 text-purple-400 border-purple-500/25 shadow-[0_0_8px_rgba(139,92,246,0.08)]',
    DAMAGED: 'bg-rose-500/10 text-rose-400 border-rose-500/25 shadow-[0_0_8px_rgba(244,63,94,0.08)]',
    SCRAPPED: 'bg-slate-500/10 text-slate-400 border-slate-500/25',
    MISSING: 'bg-red-500/10 text-red-400 border-red-500/25 shadow-[0_0_8px_rgba(239,68,68,0.08)]',
    MAINTENANCE: 'bg-orange-500/10 text-orange-400 border-orange-500/25 shadow-[0_0_8px_rgba(249,115,22,0.08)]',
  }
  return statusColors[status] || 'bg-slate-500/10 text-slate-400 border-slate-500/25'
}

export { DIE_TYPES, DIE_STATUSES }
