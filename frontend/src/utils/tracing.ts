/**
 * W3C Trace Context Implementation (traceparent)
 * Specification: https://www.w3.org/TR/trace-context/
 * Format: {version}-{trace_id}-{parent_id/span_id}-{trace_flags}
 * Example: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
 */

export interface TraceContext {
  traceId: string
  spanId: string
  sampled: boolean
}

export function generateRandomHex(byteCount: number): string {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(byteCount)
    crypto.getRandomValues(bytes)
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
  }
  let result = ''
  for (let i = 0; i < byteCount; i++) {
    result += Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
  }
  return result
}

export function generateTraceId(): string {
  let id = generateRandomHex(16)
  while (/^0+$/.test(id)) {
    id = generateRandomHex(16)
  }
  return id
}

export function generateSpanId(): string {
  let id = generateRandomHex(8)
  while (/^0+$/.test(id)) {
    id = generateRandomHex(8)
  }
  return id
}

export function createTraceparent(context?: Partial<TraceContext>): { traceparent: string; context: TraceContext } {
  const traceId = context?.traceId || generateTraceId()
  const spanId = generateSpanId()
  const sampled = context?.sampled ?? true
  const flags = sampled ? '01' : '00'
  const traceparent = `00-${traceId}-${spanId}-${flags}`
  return {
    traceparent,
    context: { traceId, spanId, sampled }
  }
}

export function parseTraceparent(traceparent: string): TraceContext | null {
  const parts = traceparent.toLowerCase().split('-')
  if (parts.length !== 4) return null
  const [version, traceId, spanId, flags] = parts
  if (version !== '00') return null
  if (!/^[0-9a-f]{32}$/.test(traceId) || /^0+$/.test(traceId)) return null
  if (!/^[0-9a-f]{16}$/.test(spanId) || /^0+$/.test(spanId)) return null
  if (!/^[0-9a-f]{2}$/.test(flags)) return null

  return {
    traceId,
    spanId,
    sampled: (parseInt(flags, 16) & 0x01) === 0x01
  }
}
