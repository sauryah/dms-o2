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
