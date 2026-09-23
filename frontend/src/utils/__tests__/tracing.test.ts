import { describe, test, expect } from 'vitest'
import {
  generateRandomHex,
  generateTraceId,
  generateSpanId,
  createTraceparent,
  parseTraceparent,
} from '../tracing'

describe('tracing utility', () => {
  test('generateRandomHex returns correct length of hex characters', () => {
    const hex = generateRandomHex(16)
    expect(hex).toHaveLength(32)
    expect(/^[0-9a-f]{32}$/.test(hex)).toBe(true)
  })

  test('generateTraceId returns 32-character non-zero hex string', () => {
    const traceId = generateTraceId()
    expect(traceId).toHaveLength(32)
    expect(/^[0-9a-f]{32}$/.test(traceId)).toBe(true)
    expect(traceId).not.toBe('0'.repeat(32))
  })

  test('generateSpanId returns 16-character non-zero hex string', () => {
    const spanId = generateSpanId()
    expect(spanId).toHaveLength(16)
    expect(/^[0-9a-f]{16}$/.test(spanId)).toBe(true)
    expect(spanId).not.toBe('0'.repeat(16))
  })

  test('createTraceparent generates valid W3C traceparent header format', () => {
    const { traceparent, context } = createTraceparent()
    expect(traceparent).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/)
    expect(context.traceId).toHaveLength(32)
    expect(context.spanId).toHaveLength(16)
    expect(context.sampled).toBe(true)
  })

  test('createTraceparent respects existing traceId if provided', () => {
    const existingTraceId = '4bf92f3577b34da6a3ce929d0e0e4736'
    const { traceparent, context } = createTraceparent({ traceId: existingTraceId })
    expect(traceparent.startsWith(`00-${existingTraceId}-`)).toBe(true)
    expect(context.traceId).toBe(existingTraceId)
  })

  test('parseTraceparent accurately parses valid traceparent', () => {
    const raw = '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01'
    const parsed = parseTraceparent(raw)
    expect(parsed).not.toBeNull()
    expect(parsed?.traceId).toBe('4bf92f3577b34da6a3ce929d0e0e4736')
    expect(parsed?.spanId).toBe('00f067aa0ba902b7')
    expect(parsed?.sampled).toBe(true)
  })

  test('parseTraceparent rejects invalid traceparent headers', () => {
    expect(parseTraceparent('invalid')).toBeNull()
    expect(parseTraceparent('01-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01')).toBeNull() // invalid version
    expect(parseTraceparent('00-00000000000000000000000000000000-00f067aa0ba902b7-01')).toBeNull() // zero trace_id
    expect(parseTraceparent('00-4bf92f3577b34da6a3ce929d0e0e4736-0000000000000000-01')).toBeNull() // zero span_id
  })
})
