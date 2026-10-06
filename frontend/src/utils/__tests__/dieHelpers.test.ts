import { describe, test, expect } from 'vitest'
import { isDieActive, parseDieDimension, getDieSize, compareDiesBySize } from '../dieHelpers'
import type { Die } from '../../types'

describe('dieHelpers', () => {
  describe('isDieActive', () => {
    test('returns true for AVAILABLE and RUNNING statuses', () => {
      expect(isDieActive({ status: 'AVAILABLE' })).toBe(true)
      expect(isDieActive({ status: 'RUNNING' })).toBe(true)
    })

    test('returns false for SCRAPPED or MAINTENANCE or empty status', () => {
      expect(isDieActive({ status: 'SCRAPPED' })).toBe(false)
      expect(isDieActive({ status: 'MAINTENANCE' })).toBe(false)
      expect(isDieActive({})).toBe(false)
    })
  })

  describe('parseDieDimension', () => {
    test('handles numeric and string values', () => {
      expect(parseDieDimension(2.5)).toBe(2.5)
      expect(parseDieDimension('2.500')).toBe(2.5)
    })

    test('handles European comma notation', () => {
      expect(parseDieDimension('0,620')).toBe(0.62)
    })

    test('handles null, undefined, or empty values', () => {
      expect(parseDieDimension(null)).toBe(0)
      expect(parseDieDimension(undefined)).toBe(0)
      expect(parseDieDimension('')).toBe(0)
      expect(parseDieDimension('invalid')).toBe(0)
    })
  })

  describe('getDieSize', () => {
    test('returns current_size or punched_size for ROUND dies', () => {
      expect(getDieSize({ die_type: 'ROUND', current_size: '3.150', punched_size: '3.000' })).toBe(3.15)
      expect(getDieSize({ die_type: 'ROUND', current_size: undefined, punched_size: '3.000' })).toBe(3.0)
    })

    test('returns current_width or punched_width for FLAT dies', () => {
      expect(getDieSize({ die_type: 'FLAT', current_width: '5.200', punched_width: '5.000' })).toBe(5.2)
      expect(getDieSize({ die_type: 'FLAT', current_width: undefined, punched_width: '4.800' })).toBe(4.8)
    })
  })

  describe('compareDiesBySize', () => {
    test('sorts descending (big size to small) for round dies', () => {
      const dieA: Partial<Die> = { die_id: 'DIE-01', die_type: 'ROUND', current_size: '2.500' }
      const dieB: Partial<Die> = { die_id: 'DIE-02', die_type: 'ROUND', current_size: '4.000' }
      const dieC: Partial<Die> = { die_id: 'DIE-03', die_type: 'ROUND', current_size: '1.200' }

      const dies = [dieA, dieB, dieC]
      const sorted = [...dies].sort((a, b) => compareDiesBySize(a, b, 'desc'))

      expect(sorted.map(d => d.die_id)).toEqual(['DIE-02', 'DIE-01', 'DIE-03'])
    })

    test('sorts ascending (small size to big) when direction is asc', () => {
      const dieA: Partial<Die> = { die_id: 'DIE-01', die_type: 'ROUND', current_size: '2.500' }
      const dieB: Partial<Die> = { die_id: 'DIE-02', die_type: 'ROUND', current_size: '4.000' }
      const dieC: Partial<Die> = { die_id: 'DIE-03', die_type: 'ROUND', current_size: '1.200' }

      const dies = [dieA, dieB, dieC]
      const sorted = [...dies].sort((a, b) => compareDiesBySize(a, b, 'asc'))

      expect(sorted.map(d => d.die_id)).toEqual(['DIE-03', 'DIE-01', 'DIE-02'])
    })

    test('breaks tie by thickness for flat dies with same width', () => {
      const dieA: Partial<Die> = { die_id: 'FLAT-01', die_type: 'FLAT', current_width: '4.000', current_thickness: '1.200' }
      const dieB: Partial<Die> = { die_id: 'FLAT-02', die_type: 'FLAT', current_width: '4.000', current_thickness: '1.800' }

      const sorted = [dieA, dieB].sort((a, b) => compareDiesBySize(a, b, 'desc'))
      expect(sorted.map(d => d.die_id)).toEqual(['FLAT-02', 'FLAT-01'])
    })

    test('breaks tie deterministically by die_id when sizes are identical', () => {
      const dieA: Partial<Die> = { die_id: 'DIE-B', die_type: 'ROUND', current_size: '2.000' }
      const dieB: Partial<Die> = { die_id: 'DIE-A', die_type: 'ROUND', current_size: '2.000' }

      const sorted = [dieA, dieB].sort((a, b) => compareDiesBySize(a, b, 'desc'))
      expect(sorted.map(d => d.die_id)).toEqual(['DIE-A', 'DIE-B'])
    })
  })
})
