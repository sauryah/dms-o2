import { DIE_ACTIVE_STATUSES } from '../contracts/dieContracts'
import type { Die } from '../types'

export const isDieActive = (die: { status?: string }) => {
  return (DIE_ACTIVE_STATUSES as readonly string[]).includes(die.status || '')
}

export const parseDieDimension = (val?: string | number | null): number => {
  if (val === undefined || val === null || val === '') return 0
  const parsed = parseFloat(String(val).replace(',', '.'))
  return isNaN(parsed) ? 0 : parsed
}

export const getDieSize = (die: Partial<Die>): number => {
  if (die.die_type === 'ROUND') {
    return parseDieDimension(die.current_size) || parseDieDimension(die.punched_size) || 0
  } else {
    return parseDieDimension(die.current_width) || parseDieDimension(die.punched_width) || 0
  }
}

export const compareDiesBySize = (
  a: Partial<Die>,
  b: Partial<Die>,
  direction: 'desc' | 'asc' = 'desc'
): number => {
  const sizeA = getDieSize(a)
  const sizeB = getDieSize(b)
  if (sizeA !== sizeB) {
    return direction === 'desc' ? sizeB - sizeA : sizeA - sizeB
  }
  if (a.die_type === 'FLAT' && b.die_type === 'FLAT') {
    const thickA = parseDieDimension(a.current_thickness) || parseDieDimension(a.punched_thickness) || 0
    const thickB = parseDieDimension(b.current_thickness) || parseDieDimension(b.punched_thickness) || 0
    if (thickA !== thickB) {
      return direction === 'desc' ? thickB - thickA : thickA - thickB
    }
  }
  return String(a.die_id || '').localeCompare(String(b.die_id || ''))
}
