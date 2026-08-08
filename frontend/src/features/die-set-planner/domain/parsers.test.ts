import { describe, it, expect } from 'vitest'
import {
  normalizeDieSize,
  formatDieSize,
  parseInventoryInput,
  parseSeriesInput,
} from './parsers'

describe('normalizeDieSize', () => {
  it('normalizes decimal variants to the same thousandths key', () => {
    expect(normalizeDieSize('0.620').thousands).toBe(620)
    expect(normalizeDieSize('.620').thousands).toBe(620)
    expect(normalizeDieSize('0.6200').thousands).toBe(620)
    expect(normalizeDieSize('620').thousands).toBe(620000)
  })

  it('rejects empty, zero, negative, and non-numeric values', () => {
    expect(normalizeDieSize('').thousands).toBeNull()
    expect(normalizeDieSize('   ').thousands).toBeNull()
    expect(normalizeDieSize('0').thousands).toBeNull()
    expect(normalizeDieSize('-0.5').thousands).toBeNull()
    expect(normalizeDieSize('abc').thousands).toBeNull()
    expect(normalizeDieSize('0.62x').thousands).toBeNull()
  })

  it('preserves display precision', () => {
    expect(formatDieSize(620)).toBe('0.620')
    expect(formatDieSize(625)).toBe('0.625')
    expect(formatDieSize(1500)).toBe('1.500')
  })
})

describe('parseInventoryInput', () => {
  it('parses spreadsheet-style pairs separated by tabs and spaces', () => {
    const res = parseInventoryInput('0.550\t4\n0.555  4\n0.560    4')
    expect(res.errors).toEqual([])
    expect(res.rows).toEqual([
      { dieSize: '0.550', quantity: 4 },
      { dieSize: '0.555', quantity: 4 },
      { dieSize: '0.560', quantity: 4 },
    ])
  })

  it('aggregates duplicate die sizes', () => {
    const res = parseInventoryInput('0.620 4\n0.620 2')
    expect(res.errors).toEqual([])
    expect(res.rows).toEqual([{ dieSize: '0.620', quantity: 6 }])
    expect(res.warnings.length).toBeGreaterThan(0)
  })

  it('skips a header row like size/qty', () => {
    const res = parseInventoryInput('Die Size\tQty\n0.620\t4\n0.625\t4')
    expect(res.errors).toEqual([])
    expect(res.rows.length).toBe(2)
    expect(res.rows[0]).toEqual({ dieSize: '0.620', quantity: 4 })
  })

  it('rejects malformed rows with useful errors', () => {
    const res = parseInventoryInput('0.625 abc\nbanana 4')
    expect(res.errors.length).toBe(2)
    expect(res.errors[0]).toContain('invalid quantity')
    expect(res.errors[1]).toContain('invalid die size')
  })

  it('detects blank input', () => {
    const res = parseInventoryInput('   \n \n')
    expect(res.rows.length).toBe(0)
    expect(res.errors.length).toBeGreaterThan(0)
  })

  it('handles spreadsheet copied cells on one line', () => {
    const res = parseInventoryInput('0.620\t4\t0.625\t6\t0.630\t2')
    expect(res.errors).toEqual([])
    expect(res.rows.length).toBe(3)
  })

  it('never mis-pairs a die with no quantity (the paste regression)', () => {
    const res = parseInventoryInput('0.620\t4\n0.625\n0.630\t2')
    expect(res.errors).toEqual([])
    expect(res.rows).toEqual([
      { dieSize: '0.620', quantity: 4 },
      { dieSize: '0.625', quantity: 0 },
      { dieSize: '0.630', quantity: 2 },
    ])
    expect(res.warnings.some((w) => w.includes('without a quantity'))).toBe(true)
  })

  it('treats a block of lone die sizes as zero-quantity stock rows', () => {
    const res = parseInventoryInput('0.955\n0.965\n1.355\n1.795')
    expect(res.errors).toEqual([])
    expect(res.rows).toEqual([
      { dieSize: '0.955', quantity: 0 },
      { dieSize: '0.965', quantity: 0 },
      { dieSize: '1.355', quantity: 0 },
      { dieSize: '1.795', quantity: 0 },
    ])
  })

  it('treats a pure-integer token after a die as that die quantity', () => {
    const res = parseInventoryInput('0.955\n0.965\t6\n0.975')
    expect(res.errors).toEqual([])
    expect(res.rows).toEqual([
      { dieSize: '0.955', quantity: 0 },
      { dieSize: '0.965', quantity: 6 },
      { dieSize: '0.975', quantity: 0 },
    ])
  })
})

describe('parseSeriesInput', () => {
  it('counts duplicate sizes as repeated required dies', () => {
    const res = parseSeriesInput('0.620\n0.625\n0.625\n0.630')
    expect(res.sizes).toEqual(['0.620', '0.625', '0.625', '0.630'])
  })

  it('supports horizontal and spreadsheet-style pasted input', () => {
    const res = parseSeriesInput('0.620  0.625\t0.625 0.630')
    expect(res.sizes.length).toBe(4)
  })

  it('rejects invalid values with line numbers', () => {
    const res = parseSeriesInput('0.620\nnot-a-die\n0.630')
    expect(res.errors.length).toBe(1)
    expect(res.errors[0]).toContain('Line 2')
  })

  it('detects empty input', () => {
    const res = parseSeriesInput('')
    expect(res.sizes.length).toBe(0)
    expect(res.errors.length).toBeGreaterThan(0)
  })

  it('normalizes decimal variants in series', () => {
    const res = parseSeriesInput('.620\n0.6200')
    expect(res.sizes).toEqual(['0.620', '0.620'])
  })
})