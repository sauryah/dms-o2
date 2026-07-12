package auth

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v4"
	"dms-go-api/internal/cache"
	"dms-go-api/internal/config"
)

type ContextKey string

const UserContextKey ContextKey = "user_id"
const RoleContextKey ContextKey = "user_role"

func AuthMiddleware(cfg *config.Config, cache *cache.Cache) func(http.Handler) http.Handler {
	secretKey := []byte(cfg.DjangoSecretKey)

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			tokenStr := ""
			authHeader := r.Header.Get("Authorization")
			if authHeader != "" {
				parts := strings.Split(authHeader, " ")
				if len(parts) == 2 && parts[0] == "Bearer" {
					tokenStr = parts[1]
				}
			}
			if tokenStr == "" {
				if cookie, err := r.Cookie("dms_access_token"); err == nil {
					tokenStr = cookie.Value
				}
			}


			if tokenStr == "" {
				// No token provided; allow guest access (AllowAny equivalent)
				next.ServeHTTP(w, r)
				return
			}

			// Parse and validate signature locally
			token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
				if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
				}
				return secretKey, nil
			})

			if err != nil || !token.Valid {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusUnauthorized)
				json.NewEncoder(w).Encode(map[string]string{"error": "Invalid or expired token"})
				return
			}

			// Calculate SHA-256 hash of the token string
			hasher := sha256.New()
			hasher.Write([]byte(tokenStr))
			tokenHash := hex.EncodeToString(hasher.Sum(nil))
			cacheKey := fmt.Sprintf("verify_token:%s", tokenHash)

			queryCtx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
			defer cancel()

			var cachedResponse struct {
				UserID int    `json:"user_id"`
				Role   string `json:"role"`
			}

			// Check Redis Cache
			if cache.Enabled() {
				cachedBytes, err := cache.Get(queryCtx, cacheKey)
				if err == nil {
					if err := json.Unmarshal(cachedBytes, &cachedResponse); err == nil {
						ctx := context.WithValue(r.Context(), UserContextKey, cachedResponse.UserID)
						ctx = context.WithValue(ctx, RoleContextKey, cachedResponse.Role)
						next.ServeHTTP(w, r.WithContext(ctx))
						return
					}
				}
			}

			// Cache miss: Call Django `/internal/verify-token/`
			verifyURL := fmt.Sprintf("%s/internal/verify-token/", cfg.DjangoAPIURL)
			req, err := http.NewRequestWithContext(queryCtx, "POST", verifyURL, nil)
			if err != nil {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusInternalServerError)
				json.NewEncoder(w).Encode(map[string]string{"error": "Failed to create verification request"})
				return
			}
			req.Header.Set("Authorization", "Bearer "+tokenStr)
			req.Header.Set("X-Internal-Key", cfg.InternalAPISecret)

			client := &http.Client{
				Timeout: 5 * time.Second,
			}
			resp, err := client.Do(req)
			if err != nil {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusUnauthorized)
				json.NewEncoder(w).Encode(map[string]string{"error": "Authentication backend unavailable"})
				return
			}
			defer resp.Body.Close()

			if resp.StatusCode != http.StatusOK {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusUnauthorized)
				json.NewEncoder(w).Encode(map[string]string{"error": "Session is invalid or expired"})
				return
			}

			var verifyResp struct {
				Valid  bool   `json:"valid"`
				UserID int    `json:"user_id"`
				Role   string `json:"role"`
			}
			if err := json.NewDecoder(resp.Body).Decode(&verifyResp); err != nil || !verifyResp.Valid {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusUnauthorized)
				json.NewEncoder(w).Encode(map[string]string{"error": "Invalid verification response"})
				return
			}

			// Cache valid token verification in Redis with a 55-second TTL
			if cache.Enabled() {
				cacheData, err := json.Marshal(verifyResp)
				if err == nil {
					_ = cache.Set(queryCtx, cacheKey, cacheData, 55*time.Second)
				}
			}

			ctx := context.WithValue(r.Context(), UserContextKey, verifyResp.UserID)
			ctx = context.WithValue(ctx, RoleContextKey, verifyResp.Role)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
