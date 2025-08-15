package security

import (
	"encoding/json"
	"fmt"
	"log"
)

// SecureAIConfig represents AI configuration with secure key handling
type SecureAIConfig struct {
	DefaultProvider   string                       `json:"default_provider"`
	Providers         map[string]SecureProviderConfig `json:"providers"`
	EmbeddingConfig   SecureEmbeddingConfig        `json:"embedding_config"`
}

// SecureProviderConfig represents a provider configuration with encrypted API key
type SecureProviderConfig struct {
	Provider        string `json:"provider"`
	EncryptedAPIKey string `json:"encrypted_api_key"`
	Model           string `json:"model"`
	Enabled         bool   `json:"enabled"`
}

// SecureEmbeddingConfig represents embedding configuration
type SecureEmbeddingConfig struct {
	DefaultProvider string `json:"default_provider"`
	Enabled         bool   `json:"enabled"`
}

// ClientAIConfig represents AI configuration sent to client (with masked keys)
type ClientAIConfig struct {
	DefaultProvider   string                         `json:"default_provider"`
	Providers         map[string]ClientProviderConfig `json:"providers"`
	EmbeddingConfig   ClientEmbeddingConfig          `json:"embedding_config"`
}

// ClientProviderConfig represents provider config for client (masked key)
type ClientProviderConfig struct {
	Provider     string `json:"provider"`
	APIKey       string `json:"api_key"`       // Masked version
	Model        string `json:"model"`
	Enabled      bool   `json:"enabled"`
	IsConfigured bool   `json:"is_configured"` // Whether a real key is configured
}

// ClientEmbeddingConfig represents embedding config for client
type ClientEmbeddingConfig struct {
	DefaultProvider string `json:"default_provider"`
	Enabled         bool   `json:"enabled"`
}

// InputAIConfig represents AI configuration from client input
type InputAIConfig struct {
	DefaultProvider   string                        `json:"default_provider"`
	Providers         map[string]InputProviderConfig `json:"providers"`
	EmbeddingConfig   InputEmbeddingConfig          `json:"embedding_config"`
}

// InputProviderConfig represents provider config from client input
type InputProviderConfig struct {
	Provider string `json:"provider"`
	APIKey   string `json:"api_key"`   // Could be new key or placeholder
	Model    string `json:"model"`
	Enabled  bool   `json:"enabled"`
}

// InputEmbeddingConfig represents embedding config from client input
type InputEmbeddingConfig struct {
	DefaultProvider string `json:"default_provider"`
	Enabled         bool   `json:"enabled"`
}

// AIConfigService handles secure AI configuration operations
type AIConfigService struct {
	crypto *CryptoService
}

// NewAIConfigService creates a new AI config service
func NewAIConfigService() *AIConfigService {
	return &AIConfigService{
		crypto: GetGlobalCryptoService(),
	}
}

// EncryptAIConfig encrypts API keys in AI configuration
func (acs *AIConfigService) EncryptAIConfig(input *InputAIConfig) (*SecureAIConfig, error) {
	secure := &SecureAIConfig{
		DefaultProvider: input.DefaultProvider,
		Providers:       make(map[string]SecureProviderConfig),
		EmbeddingConfig: SecureEmbeddingConfig{
			DefaultProvider: input.EmbeddingConfig.DefaultProvider,
			Enabled:         input.EmbeddingConfig.Enabled,
		},
	}

	for name, provider := range input.Providers {
		encryptedKey := ""
		var err error

		// Only encrypt if it's a real API key (not a placeholder)
		if provider.APIKey != "" && !acs.isPlaceholder(provider.APIKey) {
			encryptedKey, err = acs.crypto.EncryptAPIKey(provider.APIKey)
			if err != nil {
				return nil, fmt.Errorf("failed to encrypt API key for provider %s: %v", name, err)
			}
		}

		secure.Providers[name] = SecureProviderConfig{
			Provider:        provider.Provider,
			EncryptedAPIKey: encryptedKey,
			Model:           provider.Model,
			Enabled:         provider.Enabled,
		}
	}

	return secure, nil
}

// DecryptAIConfig decrypts API keys in AI configuration
func (acs *AIConfigService) DecryptAIConfig(secure *SecureAIConfig) (*InputAIConfig, error) {
	input := &InputAIConfig{
		DefaultProvider: secure.DefaultProvider,
		Providers:       make(map[string]InputProviderConfig),
		EmbeddingConfig: InputEmbeddingConfig{
			DefaultProvider: secure.EmbeddingConfig.DefaultProvider,
			Enabled:         secure.EmbeddingConfig.Enabled,
		},
	}

	for name, provider := range secure.Providers {
		decryptedKey := ""
		var err error

		if provider.EncryptedAPIKey != "" {
			decryptedKey, err = acs.crypto.DecryptAPIKey(provider.EncryptedAPIKey)
			if err != nil {
				log.Printf("Failed to decrypt API key for provider %s: %v", name, err)
				// Continue with empty key rather than failing completely
				decryptedKey = ""
			}
		}

		input.Providers[name] = InputProviderConfig{
			Provider: provider.Provider,
			APIKey:   decryptedKey,
			Model:    provider.Model,
			Enabled:  provider.Enabled,
		}
	}

	return input, nil
}

// ToClientConfig converts secure config to client-safe config (with masked keys)
func (acs *AIConfigService) ToClientConfig(secure *SecureAIConfig) *ClientAIConfig {
	client := &ClientAIConfig{
		DefaultProvider: secure.DefaultProvider,
		Providers:       make(map[string]ClientProviderConfig),
		EmbeddingConfig: ClientEmbeddingConfig{
			DefaultProvider: secure.EmbeddingConfig.DefaultProvider,
			Enabled:         secure.EmbeddingConfig.Enabled,
		},
	}

	for name, provider := range secure.Providers {
		maskedKey := ""
		isConfigured := false

		if provider.EncryptedAPIKey != "" {
			// Decrypt temporarily to create mask
			if decryptedKey, err := acs.crypto.DecryptAPIKey(provider.EncryptedAPIKey); err == nil && decryptedKey != "" {
				maskedKey = acs.crypto.GetMaskedDisplayKey(decryptedKey)
				isConfigured = true
			}
		}

		client.Providers[name] = ClientProviderConfig{
			Provider:     provider.Provider,
			APIKey:       maskedKey,
			Model:        provider.Model,
			Enabled:      provider.Enabled,
			IsConfigured: isConfigured,
		}
	}

	return client
}

// MergeWithExisting merges input config with existing secure config
// This handles the case where client sends placeholders for unchanged keys
func (acs *AIConfigService) MergeWithExisting(input *InputAIConfig, existing *SecureAIConfig) (*SecureAIConfig, error) {
	merged := &SecureAIConfig{
		DefaultProvider: input.DefaultProvider,
		Providers:       make(map[string]SecureProviderConfig),
		EmbeddingConfig: SecureEmbeddingConfig{
			DefaultProvider: input.EmbeddingConfig.DefaultProvider,
			Enabled:         input.EmbeddingConfig.Enabled,
		},
	}

	for name, inputProvider := range input.Providers {
		var encryptedKey string
		var err error

		// Check if this is a new/updated key or should preserve existing
		if inputProvider.APIKey != "" && !acs.isPlaceholder(inputProvider.APIKey) {
			// New key provided - encrypt it
			encryptedKey, err = acs.crypto.EncryptAPIKey(inputProvider.APIKey)
			if err != nil {
				return nil, fmt.Errorf("failed to encrypt API key for provider %s: %v", name, err)
			}
		} else if existingProvider, exists := existing.Providers[name]; exists {
			// Preserve existing encrypted key
			encryptedKey = existingProvider.EncryptedAPIKey
		}
		// If no existing key and input is placeholder/empty, encryptedKey remains empty

		merged.Providers[name] = SecureProviderConfig{
			Provider:        inputProvider.Provider,
			EncryptedAPIKey: encryptedKey,
			Model:           inputProvider.Model,
			Enabled:         inputProvider.Enabled,
		}
	}

	return merged, nil
}

// isPlaceholder checks if a key value is a placeholder (masked) rather than a real key
func (acs *AIConfigService) isPlaceholder(key string) bool {
	if key == "" {
		return true
	}
	
	// Check if it contains asterisks (masked key)
	if len(key) > 0 && (key[0] == '*' || key[len(key)-1] == '*') {
		return true
	}
	
	// Common placeholder patterns
	placeholders := []string{
		"****",
		"---",
		"unchanged",
		"PLACEHOLDER",
		"已配置",
		"configured",
	}
	
	for _, placeholder := range placeholders {
		if key == placeholder {
			return true
		}
	}
	
	return false
}

// EncryptAIConfigJSON encrypts AI config from JSON string
func (acs *AIConfigService) EncryptAIConfigJSON(jsonData string) (string, error) {
	if jsonData == "" {
		return "", nil
	}

	var input InputAIConfig
	if err := json.Unmarshal([]byte(jsonData), &input); err != nil {
		return "", fmt.Errorf("failed to unmarshal AI config: %v", err)
	}

	secure, err := acs.EncryptAIConfig(&input)
	if err != nil {
		return "", err
	}

	result, err := json.Marshal(secure)
	if err != nil {
		return "", fmt.Errorf("failed to marshal secure AI config: %v", err)
	}

	return string(result), nil
}

// DecryptAIConfigJSON decrypts AI config to JSON string
func (acs *AIConfigService) DecryptAIConfigJSON(encryptedData string) (string, error) {
	if encryptedData == "" {
		return "", nil
	}

	var secure SecureAIConfig
	if err := json.Unmarshal([]byte(encryptedData), &secure); err != nil {
		return "", fmt.Errorf("failed to unmarshal secure AI config: %v", err)
	}

	input, err := acs.DecryptAIConfig(&secure)
	if err != nil {
		return "", err
	}

	result, err := json.Marshal(input)
	if err != nil {
		return "", fmt.Errorf("failed to marshal input AI config: %v", err)
	}

	return string(result), nil
}

// ToClientConfigJSON converts secure config JSON to client-safe JSON
func (acs *AIConfigService) ToClientConfigJSON(encryptedData string) (string, error) {
	if encryptedData == "" {
		return "", nil
	}

	var secure SecureAIConfig
	if err := json.Unmarshal([]byte(encryptedData), &secure); err != nil {
		return "", fmt.Errorf("failed to unmarshal secure AI config: %v", err)
	}

	client := acs.ToClientConfig(&secure)

	result, err := json.Marshal(client)
	if err != nil {
		return "", fmt.Errorf("failed to marshal client AI config: %v", err)
	}

	return string(result), nil
}

// Global AI config service instance
var globalAIConfigService *AIConfigService

// GetGlobalAIConfigService returns the global AI config service instance
func GetGlobalAIConfigService() *AIConfigService {
	if globalAIConfigService == nil {
		globalAIConfigService = NewAIConfigService()
	}
	return globalAIConfigService
}