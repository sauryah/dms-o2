package middleware

import (
	"net"
	"net/http"
	"sync"
	"time"
)

type bucket struct {
	tokens     float64
	lastRefill time.Time
}

type ipLimiter struct {
	mu       sync.Mutex
	ips      map[string]*bucket
	rate     float64
	capacity float64
}

func NewIPLimiter(rate float64, capacity float64) *ipLimiter {
	return &ipLimiter{
		ips:      make(map[string]*bucket),
		rate:     rate,
		capacity: capacity,
	}
}

func (l *ipLimiter) getBucket(ip string) *bucket {
	l.mu.Lock()
	defer l.mu.Unlock()

	b, exists := l.ips[ip]
	if !exists {
		b = &bucket{
			tokens:     l.capacity,
			lastRefill: time.Now(),
		}
		l.ips[ip] = b
	}
	return b
}

func (l *ipLimiter) Allow(ip string) bool {
	b := l.getBucket(ip)

	l.mu.Lock()
	defer l.mu.Unlock()

	now := time.Now()
	elapsed := now.Sub(b.lastRefill).Seconds()
	b.lastRefill = now

	b.tokens += elapsed * l.rate
	if b.tokens > l.capacity {
		b.tokens = l.capacity
	}

	if b.tokens >= 1.0 {
		b.tokens -= 1.0
		return true
	}
	return false
}

func getIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		return xff
	}
	ip, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return ip
}

// RateLimit restricts the incoming request rate per client IP.
func RateLimit(next http.Handler, rate float64, capacity float64) http.Handler {
	limiter := NewIPLimiter(rate, capacity)

	// Background cleanup of stale IP trackers every 5 minutes
	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		for range ticker.C {
			limiter.mu.Lock()
			now := time.Now()
			for ip, b := range limiter.ips {
				if now.Sub(b.lastRefill) > 10*time.Minute {
					delete(limiter.ips, ip)
				}
			}
			limiter.mu.Unlock()
		}
	}()

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := getIP(r)
		if !limiter.Allow(ip) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusTooManyRequests)
			_, _ = w.Write([]byte(`{"error": "Too Many Requests"}`))
			return
		}
		next.ServeHTTP(w, r)
	})
}
