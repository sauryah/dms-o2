package middleware

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestSecurityHeaders(t *testing.T) {
	nextHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	handlerToTest := SecurityHeaders(nextHandler)

	req := httptest.NewRequest("GET", "/test", nil)
	rr := httptest.NewRecorder()

	handlerToTest.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", rr.Code)
	}

	headers := map[string]string{
		"X-Content-Type-Options":       "nosniff",
		"X-Frame-Options":              "DENY",
		"Referrer-Policy":              "strict-origin-when-cross-origin",
		"Cross-Origin-Opener-Policy":   "same-origin",
		"Cross-Origin-Resource-Policy": "same-origin",
		"Content-Security-Policy":      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
		"Permissions-Policy":           "camera=(), microphone=(), geolocation=(), payment=()",
	}

	for header, expectedVal := range headers {
		gotVal := rr.Header().Get(header)
		if gotVal != expectedVal {
			t.Errorf("expected header %s: %q, got %q", header, expectedVal, gotVal)
		}
	}
}

func TestMaxBytesReader(t *testing.T) {
	nextHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		buf := make([]byte, 1024)
		_, err := r.Body.Read(buf)
		if err != nil && err.Error() != "EOF" {
			http.Error(w, err.Error(), http.StatusRequestEntityTooLarge)
			return
		}
		w.WriteHeader(http.StatusOK)
	})

	maxBytes := int64(10)
	handlerToTest := MaxBytesReader(nextHandler, maxBytes)

	// Test case 1: Small body under limit
	smallBody := bytes.NewBufferString("12345")
	req1 := httptest.NewRequest("POST", "/test", smallBody)
	rr1 := httptest.NewRecorder()
	handlerToTest.ServeHTTP(rr1, req1)
	if rr1.Code != http.StatusOK {
		t.Errorf("expected status 200 for small body, got %d", rr1.Code)
	}

	// Test case 2: Oversized body over limit
	largeBody := bytes.NewBufferString("12345678901234567890")
	req2 := httptest.NewRequest("POST", "/test", largeBody)
	rr2 := httptest.NewRecorder()
	handlerToTest.ServeHTTP(rr2, req2)
	if rr2.Code != http.StatusRequestEntityTooLarge {
		t.Errorf("expected status 413 for oversized body, got %d", rr2.Code)
	}
}
