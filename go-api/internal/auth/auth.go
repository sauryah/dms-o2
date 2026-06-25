package auth

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v4"
	"dms-go-api/internal/config"
	"dms-go-api/internal/database"
)

type ContextKey string

const UserContextKey ContextKey = "user_id"
const RoleContextKey ContextKey = "user_role"

func AuthMiddleware(cfg *config.Config, db *database.PostgresDB) func(http.Handler) http.Handler {
	secretKey := []byte(cfg.DjangoSecretKey)

	idleLimitMinStr := cfg.SessionIdleTimeoutMinutes
	idleLimitMin, err := strconv.Atoi(idleLimitMinStr)
	if err != nil {
		idleLimitMin = 30
	}

	absoluteLimitHoursStr := cfg.SessionAbsoluteTimeoutHours
	absoluteLimitHours, err := strconv.Atoi(absoluteLimitHoursStr)
	if err != nil {
		absoluteLimitHours = 12
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			tokenStr := ""
			authHeader := r.Header.Get("Authorization")
			if authHeader != "" {
				parts := strings.Split(authHeader, " ")
				if len(parts) == 2 && parts[0] == "Bearer" {
					tokenStr = parts[1]
				}
			} else {
				tokenStr = r.URL.Query().Get("token")
			}

			if tokenStr == "" {
				// No token provided; allow guest access (AllowAny equivalent)
				next.ServeHTTP(w, r)
				return
			}

			// Parse and validate signature
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

			claims, ok := token.Claims.(jwt.MapClaims)
			if !ok {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusUnauthorized)
				json.NewEncoder(w).Encode(map[string]string{"error": "Invalid token claims"})
				return
			}

			var userID int
			switch val := claims["user_id"].(type) {
			case float64:
				userID = int(val)
			case string:
				id, err := strconv.Atoi(val)
				if err != nil {
					w.Header().Set("Content-Type", "application/json")
					w.WriteHeader(http.StatusUnauthorized)
					json.NewEncoder(w).Encode(map[string]string{"error": "Invalid user ID format"})
					return
				}
				userID = id
			case int:
				userID = val
			case nil:
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusUnauthorized)
				json.NewEncoder(w).Encode(map[string]string{"error": "User ID claim is missing"})
				return
			default:
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusUnauthorized)
				json.NewEncoder(w).Encode(map[string]string{"error": "Invalid user ID claim type"})
				return
			}

			// Calculate SHA-256 hash of the token string
			hasher := sha256.New()
			hasher.Write([]byte(tokenStr))
			tokenHash := hex.EncodeToString(hasher.Sum(nil))

			queryCtx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
			defer cancel()

			// Check UserSession in database
			sess, err := db.GetSession(queryCtx, tokenHash, userID)
			if err != nil {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusUnauthorized)
				json.NewEncoder(w).Encode(map[string]string{"error": "Session not found or expired"})
				return
			}

			if !sess.IsActive {
				db.DeleteSession(queryCtx, tokenHash)
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusUnauthorized)
				json.NewEncoder(w).Encode(map[string]string{"error": "User account is deactivated"})
				return
			}

			now := time.Now()
			idleLimit := sess.LastSeen.Add(time.Duration(idleLimitMin) * time.Minute)
			absoluteLimit := sess.CreatedAt.Add(time.Duration(absoluteLimitHours) * time.Hour)

			if now.After(idleLimit) || now.After(absoluteLimit) {
				db.DeleteSession(queryCtx, tokenHash)
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusUnauthorized)
				json.NewEncoder(w).Encode(map[string]string{"error": "Session has expired due to inactivity or age"})
				return
			}

			// Throttle database writes: only update if last_seen was > 1 minute ago
			if now.Sub(sess.LastSeen) > 1*time.Minute {
				updateErr := db.UpdateSessionLastSeen(queryCtx, tokenHash)
				if updateErr != nil {
					log.Printf("Failed to update last_seen for token: %v", updateErr)
				}
			}

			ctx := context.WithValue(r.Context(), UserContextKey, userID)
			ctx = context.WithValue(ctx, RoleContextKey, sess.Role)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
