package security

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"os"
	"strings"
)

// CryptoService handles encryption and decryption operations
type CryptoService struct {
	masterKey []byte
}

// NewCryptoService creates a new crypto service instance
func NewCryptoService() *CryptoService {
	masterKey := getMasterKey()
	return &CryptoService{
		masterKey: masterKey,
	}
}

// getMasterKey retrieves or generates the master encryption key
func getMasterKey() []byte {
	// Try to get master key from environment variable
	if keyHex := os.Getenv("BLOG_MASTER_KEY"); keyHex != "" {
		if key, err := hex.DecodeString(keyHex); err == nil && len(key) == 32 {
			return key
		}
	}

	// Try to get from a more secure location or generate one
	// In production, this should be stored securely (e.g., vault, key management service)
	
	// For now, generate a deterministic key based on a secret phrase
	// This ensures the same key is generated across app restarts
	secret := os.Getenv("BLOG_SECRET_PHRASE")
	if secret == "" {
		// Fallback secret - should be changed in production
		secret = "blog-ai-key-encryption-secret-change-in-production"
	}
	
	// Generate a 32-byte key using SHA256
	hash := sha256.Sum256([]byte(secret))
	return hash[:]
}

// EncryptAPIKey encrypts an API key using AES-256-GCM
func (cs *CryptoService) EncryptAPIKey(plainKey string) (string, error) {
	if plainKey == "" {
		return "", nil
	}

	// Create AES cipher
	block, err := aes.NewCipher(cs.masterKey)
	if err != nil {
		return "", fmt.Errorf("failed to create cipher: %v", err)
	}

	// Create GCM mode
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("failed to create GCM: %v", err)
	}

	// Generate random nonce
	nonce := make([]byte, gcm.NonceSize())
	if _, err := rand.Read(nonce); err != nil {
		return "", fmt.Errorf("failed to generate nonce: %v", err)
	}

	// Encrypt the key
	ciphertext := gcm.Seal(nonce, nonce, []byte(plainKey), nil)

	// Return base64 encoded result
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

// DecryptAPIKey decrypts an encrypted API key
func (cs *CryptoService) DecryptAPIKey(encryptedKey string) (string, error) {
	if encryptedKey == "" {
		return "", nil
	}

	// Decode base64
	data, err := base64.StdEncoding.DecodeString(encryptedKey)
	if err != nil {
		return "", fmt.Errorf("failed to decode base64: %v", err)
	}

	// Create AES cipher
	block, err := aes.NewCipher(cs.masterKey)
	if err != nil {
		return "", fmt.Errorf("failed to create cipher: %v", err)
	}

	// Create GCM mode
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("failed to create GCM: %v", err)
	}

	// Extract nonce and ciphertext
	nonceSize := gcm.NonceSize()
	if len(data) < nonceSize {
		return "", fmt.Errorf("ciphertext too short")
	}

	nonce, ciphertext := data[:nonceSize], data[nonceSize:]

	// Decrypt
	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", fmt.Errorf("failed to decrypt: %v", err)
	}

	return string(plaintext), nil
}

// MaskAPIKey creates a masked version of an API key for display
func (cs *CryptoService) MaskAPIKey(apiKey string) string {
	if apiKey == "" {
		return ""
	}

	// Remove common prefixes
	key := strings.TrimPrefix(apiKey, "sk-")
	key = strings.TrimPrefix(key, "gsk_")
	key = strings.TrimPrefix(key, "AIza")

	keyLen := len(key)
	
	if keyLen <= 8 {
		// Very short keys - mask all but first 2 chars
		if keyLen <= 2 {
			return strings.Repeat("*", keyLen)
		}
		return key[:2] + strings.Repeat("*", keyLen-2)
	} else if keyLen <= 20 {
		// Medium keys - show first 4 and last 4
		return key[:4] + strings.Repeat("*", keyLen-8) + key[keyLen-4:]
	} else {
		// Long keys - show first 6 and last 4
		return key[:6] + strings.Repeat("*", keyLen-10) + key[keyLen-4:]
	}
}

// GetMaskedDisplayKey returns a masked version with proper prefix
func (cs *CryptoService) GetMaskedDisplayKey(apiKey string) string {
	if apiKey == "" {
		return ""
	}

	masked := cs.MaskAPIKey(apiKey)
	
	// Add back appropriate prefix based on original key format
	if strings.HasPrefix(apiKey, "sk-") {
		return "sk-" + masked
	} else if strings.HasPrefix(apiKey, "gsk_") {
		return "gsk_" + masked
	} else if strings.HasPrefix(apiKey, "AIza") {
		return "AIza" + masked
	}
	
	return masked
}

// IsKeyConfigured checks if a key is configured (not empty and not a placeholder)
func (cs *CryptoService) IsKeyConfigured(apiKey string) bool {
	if apiKey == "" {
		return false
	}
	
	// Check if it's a masked key (contains asterisks)
	if strings.Contains(apiKey, "*") {
		return true // Masked key means it's configured
	}
	
	// Check minimum key length
	return len(apiKey) >= 10
}

// Global crypto service instance
var globalCryptoService *CryptoService

// GetGlobalCryptoService returns the global crypto service instance
func GetGlobalCryptoService() *CryptoService {
	if globalCryptoService == nil {
		globalCryptoService = NewCryptoService()
	}
	return globalCryptoService
}