package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestParseTraceparent(t *testing.T) {
	tests := []struct {
		name       string
		header     string
		wantTrace  string
		wantSpan   string
		wantOk     bool
	}{
		{
			name:      "valid traceparent",
			header:    "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
			wantTrace: "4bf92f3577b34da6a3ce929d0e0e4736",
			wantSpan:  "00f067aa0ba902b7",
			wantOk:    true,
		},
		{
			name:   "invalid version",
			header: "01-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
			wantOk: false,
		},
		{
			name:   "all zero trace id",
			header: "00-00000000000000000000000000000000-00f067aa0ba902b7-01",
			wantOk: false,
		},
		{
			name:   "all zero span id",
			header: "00-4bf92f3577b34da6a3ce929d0e0e4736-0000000000000000-01",
			wantOk: false,
		},
		{
			name:   "malformed header",
			header: "not-a-traceparent",
			wantOk: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gotTrace, gotSpan, gotOk := ParseTraceparent(tt.header)
			if gotOk != tt.wantOk {
				t.Fatalf("ParseTraceparent() ok = %v, want %v", gotOk, tt.wantOk)
			}
			if tt.wantOk {
				if gotTrace != tt.wantTrace {
					t.Errorf("got trace %s, want %s", gotTrace, tt.wantTrace)
				}
				if gotSpan != tt.wantSpan {
					t.Errorf("got span %s, want %s", gotSpan, tt.wantSpan)
				}
			}
		})
	}
}

func TestTracingMiddleware(t *testing.T) {
	t.Run("propagates existing traceparent", func(t *testing.T) {
		incomingTrace := "4bf92f3577b34da6a3ce929d0e0e4736"
		incomingHeader := "00-" + incomingTrace + "-00f067aa0ba902b7-01"

		var extractedTrace string
		handler := Tracing(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			extractedTrace = GetTraceID(r.Context())
			w.WriteHeader(http.StatusOK)
		}))

		req := httptest.NewRequest("GET", "/test", nil)
		req.Header.Set("traceparent", incomingHeader)
		rec := httptest.NewRecorder()

		handler.ServeHTTP(rec, req)

		if extractedTrace != incomingTrace {
			t.Errorf("context trace = %s, want %s", extractedTrace, incomingTrace)
		}
		if rec.Header().Get("X-Trace-ID") != incomingTrace {
			t.Errorf("X-Trace-ID header = %s, want %s", rec.Header().Get("X-Trace-ID"), incomingTrace)
		}
		if tp := rec.Header().Get("traceparent"); tp == "" {
			t.Errorf("expected outgoing traceparent header")
		}
	})

	t.Run("generates new trace ID when none provided", func(t *testing.T) {
		var extractedTrace string
		handler := Tracing(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			extractedTrace = GetTraceID(r.Context())
			w.WriteHeader(http.StatusOK)
		}))

		req := httptest.NewRequest("GET", "/test", nil)
		rec := httptest.NewRecorder()

		handler.ServeHTTP(rec, req)

		if len(extractedTrace) != 32 {
			t.Errorf("expected 32-char generated trace ID, got len %d", len(extractedTrace))
		}
		if rec.Header().Get("X-Trace-ID") != extractedTrace {
			t.Errorf("X-Trace-ID response header mismatch")
		}
	})
}
