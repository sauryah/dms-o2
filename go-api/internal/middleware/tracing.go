package middleware

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"net/http"
	"strings"
)

type TraceContextKey string

const (
	TraceIDKey TraceContextKey = "trace_id"
	SpanIDKey  TraceContextKey = "span_id"
)

// GenerateRandomHex generates n bytes of cryptographically secure random bytes as hex string.
func GenerateRandomHex(n int) string {
	bytes := make([]byte, n)
	if _, err := rand.Read(bytes); err != nil {
		return fmt.Sprintf("%0*x", n*2, 1)
	}
	return hex.EncodeToString(bytes)
}

// ParseTraceparent extracts traceID and spanID from a W3C traceparent header.
// Format: 00-{trace_id}-{span_id}-{flags}
func ParseTraceparent(header string) (traceID, spanID string, ok bool) {
	header = strings.TrimSpace(header)
	parts := strings.Split(header, "-")
	if len(parts) != 4 {
		return "", "", false
	}
	version, tID, sID, flags := parts[0], parts[1], parts[2], parts[3]
	if version != "00" {
		return "", "", false
	}
	if len(tID) != 32 || strings.Trim(tID, "0") == "" {
		return "", "", false
	}
	if len(sID) != 16 || strings.Trim(sID, "0") == "" {
		return "", "", false
	}
	if len(flags) != 2 {
		return "", "", false
	}
	return tID, sID, true
}

// Tracing extracts or generates W3C trace context, injecting trace_id into context and response headers.
func Tracing(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		traceID := ""
		parentSpanID := ""

		// 1. Try W3C traceparent header
		if tp := r.Header.Get("traceparent"); tp != "" {
			if tID, sID, ok := ParseTraceparent(tp); ok {
				traceID = tID
				parentSpanID = sID
			}
		}

		// 2. Fall back to X-Trace-ID or X-Request-ID
		if traceID == "" {
			if xt := r.Header.Get("X-Trace-ID"); xt != "" && len(xt) >= 16 {
				clean := strings.ReplaceAll(xt, "-", "")
				if len(clean) >= 32 {
					traceID = clean[:32]
				}
			} else if xr := r.Header.Get("X-Request-ID"); xr != "" {
				clean := strings.ReplaceAll(xr, "-", "")
				if len(clean) >= 32 {
					traceID = clean[:32]
				}
			}
		}

		// 3. Generate new trace ID if missing
		if traceID == "" || len(traceID) != 32 {
			traceID = GenerateRandomHex(16)
		}

		// Generate a new span ID for this Go service hop
		currentSpanID := GenerateRandomHex(8)

		// Create context with trace and span IDs
		ctx := context.WithValue(r.Context(), TraceIDKey, traceID)
		ctx = context.WithValue(ctx, SpanIDKey, currentSpanID)
		r = r.WithContext(ctx)

		// Set response headers for client correlation
		w.Header().Set("X-Trace-ID", traceID)
		w.Header().Set("traceparent", fmt.Sprintf("00-%s-%s-01", traceID, currentSpanID))

		_ = parentSpanID

		next.ServeHTTP(w, r)
	})
}

// GetTraceID retrieves the trace ID from request context.
func GetTraceID(ctx context.Context) string {
	if val, ok := ctx.Value(TraceIDKey).(string); ok {
		return val
	}
	return ""
}
