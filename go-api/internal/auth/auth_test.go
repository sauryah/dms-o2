package auth

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v4"
	"dms-go-api/internal/cache"
	"dms-go-api/internal/config"
)

func TestAuthMiddleware(t *testing.T) {
	secretKey := "test_django_secret_key"

	// Create mock Django verify endpoint
	mockDjango := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/internal/verify-token/" {
			w.WriteHeader(http.StatusNotFound)
			return
		}

		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}

		tokenStr := authHeader[7:] // strip "Bearer "
		token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
			return []byte(secretKey), nil
		})
		if err != nil || !token.Valid {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}

		claims := token.Claims.(jwt.MapClaims)
		if reject, ok := claims["reject"].(bool); ok && reject {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"valid": false,
				"error": "session expired",
			})
			return
		}

		if invalidJSON, ok := claims["invalid_json"].(bool); ok && invalidJSON {
			w.WriteHeader(http.StatusOK)
			w.Write([]byte("not-json"))
			return
		}

		if invalidValid, ok := claims["invalid_valid"].(bool); ok && invalidValid {
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"valid": false,
			})
			return
		}

		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"valid":   true,
			"user_id": 123,
			"role":    "ADMIN",
		})
	}))
	defer mockDjango.Close()

	cfg := &config.Config{
		DjangoSecretKey: secretKey,
		DjangoAPIURL:    mockDjango.URL,
	}

	dummyCache := &cache.Cache{}
	middleware := AuthMiddleware(cfg, dummyCache)

	nextHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID := r.Context().Value(UserContextKey)
		userRole := r.Context().Value(RoleContextKey)
		if userID != nil && userRole != nil {
			w.WriteHeader(http.StatusOK)
			w.Write([]byte(fmt.Sprintf("OK:%v:%s", userID, userRole)))
		} else {
			w.WriteHeader(http.StatusOK)
			w.Write([]byte("GUEST"))
		}
	})

	handlerToTest := middleware(nextHandler)

	// Test 1: No token (returns 401)
	req1 := httptest.NewRequest("GET", "/test", nil)
	rr1 := httptest.NewRecorder()
	handlerToTest.ServeHTTP(rr1, req1)
	if rr1.Code != http.StatusUnauthorized {
		t.Errorf("Expected StatusUnauthorized for no token, got status %d body %q", rr1.Code, rr1.Body.String())
	}

	// Test 2: Invalid local signature
	badToken := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": 123,
		"exp":     time.Now().Add(time.Hour).Unix(),
	})
	badTokenStr, _ := badToken.SignedString([]byte("wrong_secret"))
	req2 := httptest.NewRequest("GET", "/test", nil)
	req2.Header.Set("Authorization", "Bearer "+badTokenStr)
	rr2 := httptest.NewRecorder()
	handlerToTest.ServeHTTP(rr2, req2)
	if rr2.Code != http.StatusUnauthorized {
		t.Errorf("Expected StatusUnauthorized, got %d", rr2.Code)
	}

	// Test 3: Valid local signature but rejected by Django verify endpoint
	rejectToken := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": 123,
		"reject":  true,
		"exp":     time.Now().Add(time.Hour).Unix(),
	})
	rejectTokenStr, _ := rejectToken.SignedString([]byte(secretKey))
	req3 := httptest.NewRequest("GET", "/test", nil)
	req3.Header.Set("Authorization", "Bearer "+rejectTokenStr)
	rr3 := httptest.NewRecorder()
	handlerToTest.ServeHTTP(rr3, req3)
	if rr3.Code != http.StatusUnauthorized {
		t.Errorf("Expected StatusUnauthorized from Django reject, got %d", rr3.Code)
	}

	// Test 4: Valid signature and successfully verified by Django
	validToken := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": 123,
		"exp":     time.Now().Add(time.Hour).Unix(),
	})
	validTokenStr, _ := validToken.SignedString([]byte(secretKey))
	req4 := httptest.NewRequest("GET", "/test", nil)
	req4.Header.Set("Authorization", "Bearer "+validTokenStr)
	rr4 := httptest.NewRecorder()
	handlerToTest.ServeHTTP(rr4, req4)
	if rr4.Code != http.StatusOK || rr4.Body.String() != "OK:123:ADMIN" {
		t.Errorf("Expected OK:123:ADMIN, got status %d body %q", rr4.Code, rr4.Body.String())
	}

	// Test 5: Expired token
	expiredToken := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": 123,
		"exp":     time.Now().Add(-time.Hour).Unix(),
	})
	expiredTokenStr, _ := expiredToken.SignedString([]byte(secretKey))
	req5 := httptest.NewRequest("GET", "/test", nil)
	req5.Header.Set("Authorization", "Bearer "+expiredTokenStr)
	rr5 := httptest.NewRecorder()
	handlerToTest.ServeHTTP(rr5, req5)
	if rr5.Code != http.StatusUnauthorized {
		t.Errorf("Expected StatusUnauthorized for expired token, got %d", rr5.Code)
	}

	// Test 6: Backend API is down/offline
	cfgDown := &config.Config{
		DjangoSecretKey: secretKey,
		DjangoAPIURL:    "http://127.0.0.1:9999", // dead port
	}
	middlewareDown := AuthMiddleware(cfgDown, dummyCache)
	handlerToTestDown := middlewareDown(nextHandler)

	req6 := httptest.NewRequest("GET", "/test", nil)
	req6.Header.Set("Authorization", "Bearer "+validTokenStr)
	rr6 := httptest.NewRecorder()
	handlerToTestDown.ServeHTTP(rr6, req6)
	if rr6.Code != http.StatusUnauthorized {
		t.Errorf("Expected StatusUnauthorized when backend offline, got %d", rr6.Code)
	}

	// Test 7: Backend returns malformed JSON
	invalidJsonToken := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id":      123,
		"invalid_json": true,
		"exp":          time.Now().Add(time.Hour).Unix(),
	})
	invalidJsonTokenStr, _ := invalidJsonToken.SignedString([]byte(secretKey))
	req7 := httptest.NewRequest("GET", "/test", nil)
	req7.Header.Set("Authorization", "Bearer "+invalidJsonTokenStr)
	rr7 := httptest.NewRecorder()
	handlerToTest.ServeHTTP(rr7, req7)
	if rr7.Code != http.StatusUnauthorized {
		t.Errorf("Expected StatusUnauthorized when backend returns invalid JSON, got %d", rr7.Code)
	}

	// Test 8: Backend returns valid: false response
	invalidValidToken := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id":       123,
		"invalid_valid": true,
		"exp":           time.Now().Add(time.Hour).Unix(),
	})
	invalidValidTokenStr, _ := invalidValidToken.SignedString([]byte(secretKey))
	req8 := httptest.NewRequest("GET", "/test", nil)
	req8.Header.Set("Authorization", "Bearer "+invalidValidTokenStr)
	rr8 := httptest.NewRecorder()
	handlerToTest.ServeHTTP(rr8, req8)
	if rr8.Code != http.StatusUnauthorized {
		t.Errorf("Expected StatusUnauthorized when backend returns valid: false, got %d", rr8.Code)
	}
}
