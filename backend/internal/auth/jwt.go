package auth

import (
	"crypto/rand"
	"encoding/base64"
	"errors"
	"log"
	"os"
	"sync"
	"time"
	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	UserID   uint   `json:"user_id"`
	Username string `json:"username"`
	IsAdmin  bool   `json:"is_admin"`
	jwt.RegisteredClaims
}

var (
	jwtSecret     []byte
	jwtSecretOnce sync.Once
)

// generateSecureRandomKey generates a cryptographically secure random key
func generateSecureRandomKey(length int) ([]byte, error) {
	key := make([]byte, length)
	_, err := rand.Read(key)
	if err != nil {
		return nil, err
	}
	return key, nil
}

func getJWTSecret() []byte {
	jwtSecretOnce.Do(func() {
		secret := os.Getenv("JWT_SECRET")
		if secret == "" {
			// Generate a secure random key if not provided
			randomKey, err := generateSecureRandomKey(32) // 256-bit key
			if err != nil {
				log.Fatal("Failed to generate JWT secret:", err)
			}
			jwtSecret = randomKey
			log.Printf("Generated random JWT secret (base64): %s", base64.StdEncoding.EncodeToString(randomKey))
			log.Println("WARNING: Using auto-generated JWT secret. Set JWT_SECRET environment variable for production use.")
		} else {
			jwtSecret = []byte(secret)
			log.Println("Using JWT secret from environment variable")
		}
	})
	return jwtSecret
}

func GenerateToken(userID uint, username string, isAdmin bool) (string, error) {
	claims := &Claims{
		UserID:   userID,
		Username: username,
		IsAdmin:  isAdmin,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(getJWTSecret())
	if err != nil {
		return "", err
	}

	return tokenString, nil
}

func ValidateToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return getJWTSecret(), nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, errors.New("invalid token")
}