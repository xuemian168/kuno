package security

import (
	"encoding/json"
	"fmt"
)

const encryptedAPIKeyField = "encrypted_api_key"

// EncryptServiceConfigJSON encrypts the apiKey/api_key field in a flat service
// configuration JSON object. It preserves an existing encrypted key when the
// client sends a masked or empty key for the same provider.
func (acs *AIConfigService) EncryptServiceConfigJSON(inputJSON string, existingJSON string) (string, error) {
	if inputJSON == "" {
		return "", nil
	}

	inputConfig, err := decodeConfigMap(inputJSON)
	if err != nil {
		return "", fmt.Errorf("failed to unmarshal service config: %v", err)
	}

	existingConfig := map[string]interface{}{}
	if existingJSON != "" {
		if existingConfig, err = decodeConfigMap(existingJSON); err != nil {
			existingConfig = map[string]interface{}{}
		}
	}

	inputKey := getConfigString(inputConfig, "apiKey")
	if inputKey == "" {
		inputKey = getConfigString(inputConfig, "api_key")
	}

	inputProvider := getConfigString(inputConfig, "provider")
	existingProvider := getConfigString(existingConfig, "provider")
	existingEncryptedKey := getConfigString(existingConfig, encryptedAPIKeyField)

	encryptedKey := ""
	if inputKey != "" && !acs.isPlaceholder(inputKey) {
		encryptedKey, err = acs.crypto.EncryptAPIKey(inputKey)
		if err != nil {
			return "", fmt.Errorf("failed to encrypt service API key: %v", err)
		}
	} else if existingEncryptedKey != "" && inputProvider != "" && inputProvider == existingProvider {
		encryptedKey = existingEncryptedKey
	}

	delete(inputConfig, "apiKey")
	delete(inputConfig, "api_key")
	delete(inputConfig, "isConfigured")
	delete(inputConfig, "is_configured")
	delete(inputConfig, "useServerProxy")
	delete(inputConfig, "serverProxyScope")

	if encryptedKey != "" {
		inputConfig[encryptedAPIKeyField] = encryptedKey
	} else {
		delete(inputConfig, encryptedAPIKeyField)
	}

	result, err := json.Marshal(inputConfig)
	if err != nil {
		return "", fmt.Errorf("failed to marshal secure service config: %v", err)
	}

	return string(result), nil
}

// DecryptServiceConfigJSON decrypts a flat service configuration for trusted
// server-side consumers. Never return this payload to browsers.
func (acs *AIConfigService) DecryptServiceConfigJSON(secureJSON string) (string, error) {
	if secureJSON == "" {
		return "", nil
	}

	config, err := decodeConfigMap(secureJSON)
	if err != nil {
		return "", fmt.Errorf("failed to unmarshal secure service config: %v", err)
	}

	encryptedKey := getConfigString(config, encryptedAPIKeyField)
	delete(config, encryptedAPIKeyField)

	if encryptedKey != "" {
		decryptedKey, err := acs.crypto.DecryptAPIKey(encryptedKey)
		if err != nil {
			return "", fmt.Errorf("failed to decrypt service API key: %v", err)
		}
		config["apiKey"] = decryptedKey
	} else {
		config["apiKey"] = ""
	}

	result, err := json.Marshal(config)
	if err != nil {
		return "", fmt.Errorf("failed to marshal decrypted service config: %v", err)
	}

	return string(result), nil
}

// ToClientServiceConfigJSON returns a browser-safe service configuration with
// a masked apiKey and an isConfigured flag.
func (acs *AIConfigService) ToClientServiceConfigJSON(secureJSON string) (string, error) {
	if secureJSON == "" {
		return "", nil
	}

	config, err := decodeConfigMap(secureJSON)
	if err != nil {
		return "", fmt.Errorf("failed to unmarshal secure service config: %v", err)
	}

	encryptedKey := getConfigString(config, encryptedAPIKeyField)
	delete(config, encryptedAPIKeyField)

	configured := false
	maskedKey := ""
	if encryptedKey != "" {
		decryptedKey, err := acs.crypto.DecryptAPIKey(encryptedKey)
		if err == nil && decryptedKey != "" {
			configured = true
			maskedKey = acs.crypto.GetMaskedDisplayKey(decryptedKey)
		}
	}

	config["apiKey"] = maskedKey
	config["isConfigured"] = configured

	result, err := json.Marshal(config)
	if err != nil {
		return "", fmt.Errorf("failed to marshal client service config: %v", err)
	}

	return string(result), nil
}

func decodeConfigMap(rawJSON string) (map[string]interface{}, error) {
	config := map[string]interface{}{}
	if err := json.Unmarshal([]byte(rawJSON), &config); err != nil {
		return nil, err
	}
	return config, nil
}

func getConfigString(config map[string]interface{}, key string) string {
	value, ok := config[key]
	if !ok || value == nil {
		return ""
	}

	switch typed := value.(type) {
	case string:
		return typed
	default:
		return fmt.Sprintf("%v", typed)
	}
}
