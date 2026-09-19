package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestRateLimit(t *testing.T) {
	nextHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("OK"))
	})

	// Rate limiter with rate 1.0, capacity 1.0
	limiter := RateLimit(nextHandler, 1.0, 1.0)

	// First request should be allowed
	req1 := httptest.NewRequest("GET", "/", nil)
	w1 := httptest.NewRecorder()
	limiter.ServeHTTP(w1, req1)

	if w1.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w1.Code)
	}

	// Second request immediately after should be blocked (rate limit exceeded)
	req2 := httptest.NewRequest("GET", "/", nil)
	w2 := httptest.NewRecorder()
	limiter.ServeHTTP(w2, req2)

	if w2.Code != http.StatusTooManyRequests {
		t.Errorf("Expected status 429, got %d", w2.Code)
	}
}

func TestGetIP(t *testing.T) {
	tests := []struct {
		name       string
		xff        string
		remoteAddr string
		expected   string
	}{
		{
			name:       "Single valid XFF",
			xff:        "203.0.113.195",
			remoteAddr: "192.168.1.1:12345",
			expected:   "203.0.113.195",
		},
		{
			name:       "Comma separated XFF with whitespace",
			xff:        "  203.0.113.195 , 70.41.3.18 ",
			remoteAddr: "192.168.1.1:12345",
			expected:   "203.0.113.195",
		},
		{
			name:       "Invalid first XFF falls back to next valid IP",
			xff:        "not-an-ip, 198.51.100.22",
			remoteAddr: "192.168.1.1:12345",
			expected:   "198.51.100.22",
		},
		{
			name:       "No XFF falls back to RemoteAddr host",
			xff:        "",
			remoteAddr: "192.168.1.50:54321",
			expected:   "192.168.1.50",
		},
		{
			name:       "RemoteAddr without port",
			xff:        "",
			remoteAddr: "192.168.1.50",
			expected:   "192.168.1.50",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest("GET", "/", nil)
			if tt.xff != "" {
				req.Header.Set("X-Forwarded-For", tt.xff)
			}
			req.RemoteAddr = tt.remoteAddr

			actual := getIP(req)
			if actual != tt.expected {
				t.Errorf("Expected IP %q, got %q", tt.expected, actual)
			}
		})
	}
}
