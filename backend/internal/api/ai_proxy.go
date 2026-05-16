package api

import (
	"blog-backend/internal/database"
	"blog-backend/internal/models"
	"blog-backend/internal/security"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

const (
	aiProxyScopeGlobal      = "global"
	aiProxyScopeTranslation = "translation"
	aiProxyScopeSummary     = "summary"
	aiProxyScopeSEO         = "seo"
)

type aiProxyProviderConfig struct {
	Provider         string
	APIKey           string
	Model            string
	BaseURL          string
	AuthType         string
	CustomAuthHeader string
}

var aiProxyHTTPClient = &http.Client{Timeout: 120 * time.Second}

func ProxyOpenAIChatCompletions(c *gin.Context) {
	proxyAIProviderRequest(c, "openai")
}

func ProxyVolcanoChatCompletions(c *gin.Context) {
	proxyAIProviderRequest(c, "volcano")
}

func ProxyClaudeMessages(c *gin.Context) {
	proxyAIProviderRequest(c, "claude")
}

func ProxyGeminiGenerateContent(c *gin.Context) {
	proxyAIProviderRequest(c, "gemini")
}

func proxyAIProviderRequest(c *gin.Context, provider string) {
	scope := c.DefaultQuery("scope", aiProxyScopeGlobal)

	providerConfig, err := loadAIProxyProviderConfig(provider, scope)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": err.Error()}})
		return
	}

	if providerConfig.APIKey == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": gin.H{"message": "AI provider API key is not configured"}})
		return
	}

	targetURL, err := buildAIProviderTargetURL(provider, providerConfig, c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": err.Error()}})
		return
	}

	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "Failed to read request body"}})
		return
	}

	headers, err := buildAIProviderHeaders(provider, providerConfig, c.GetHeader("Content-Type"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": err.Error()}})
		return
	}

	request, err := http.NewRequest(http.MethodPost, targetURL, bytes.NewReader(body))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "Failed to create AI provider request"}})
		return
	}

	for name, value := range headers {
		request.Header.Set(name, value)
	}

	response, err := aiProxyHTTPClient.Do(request)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": gin.H{"message": "AI provider proxy request failed"}})
		return
	}
	defer response.Body.Close()

	responseBody, err := io.ReadAll(response.Body)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": gin.H{"message": "Failed to read AI provider response"}})
		return
	}

	contentType := response.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/json"
	}

	c.Data(response.StatusCode, contentType, responseBody)
}

func loadAIProxyProviderConfig(provider string, scope string) (*aiProxyProviderConfig, error) {
	var settings models.SiteSettings
	if err := database.DB.First(&settings).Error; err != nil {
		return nil, fmt.Errorf("site settings not found")
	}

	switch scope {
	case aiProxyScopeTranslation:
		if config, ok, err := loadServiceAIProxyConfig(settings.TranslationConfig, provider); err != nil {
			return nil, err
		} else if ok {
			return config, nil
		}
	case aiProxyScopeSummary:
		if config, ok, err := loadServiceAIProxyConfig(settings.AISummaryConfig, provider); err != nil {
			return nil, err
		} else if ok {
			return config, nil
		}
	case aiProxyScopeSEO:
		if config, ok, err := loadServiceAIProxyConfig(settings.AISummaryConfig, provider); err != nil {
			return nil, err
		} else if ok {
			return config, nil
		}
	case aiProxyScopeGlobal:
	default:
		return nil, fmt.Errorf("invalid AI proxy scope")
	}

	return loadGlobalAIProxyConfig(settings.AIConfig, provider)
}

func loadServiceAIProxyConfig(rawConfig string, provider string) (*aiProxyProviderConfig, bool, error) {
	if rawConfig == "" {
		return nil, false, nil
	}

	aiConfigService := security.GetGlobalAIConfigService()
	decryptedConfigJSON, err := aiConfigService.DecryptServiceConfigJSON(rawConfig)
	if err != nil {
		return nil, false, fmt.Errorf("failed to decrypt service AI configuration")
	}

	var config map[string]interface{}
	if err := json.Unmarshal([]byte(decryptedConfigJSON), &config); err != nil {
		return nil, false, fmt.Errorf("invalid service AI configuration")
	}

	if getAIProxyConfigString(config, "provider") != provider {
		return nil, false, nil
	}

	return &aiProxyProviderConfig{
		Provider:         provider,
		APIKey:           getAIProxyConfigString(config, "apiKey"),
		Model:            getAIProxyConfigString(config, "model"),
		BaseURL:          getAIProxyConfigString(config, "baseUrl"),
		AuthType:         getAIProxyConfigString(config, "authType"),
		CustomAuthHeader: getAIProxyConfigString(config, "customAuthHeader"),
	}, true, nil
}

func loadGlobalAIProxyConfig(rawConfig string, provider string) (*aiProxyProviderConfig, error) {
	if rawConfig == "" {
		return nil, fmt.Errorf("global AI configuration is not configured")
	}

	var secureConfig security.SecureAIConfig
	if err := json.Unmarshal([]byte(rawConfig), &secureConfig); err != nil {
		return nil, fmt.Errorf("invalid global AI configuration")
	}

	aiConfigService := security.GetGlobalAIConfigService()
	inputConfig, err := aiConfigService.DecryptAIConfig(&secureConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to decrypt global AI configuration")
	}

	providerConfig, ok := inputConfig.Providers[provider]
	if !ok || !providerConfig.Enabled {
		return nil, fmt.Errorf("AI provider is not enabled")
	}

	return &aiProxyProviderConfig{
		Provider:         provider,
		APIKey:           providerConfig.APIKey,
		Model:            providerConfig.Model,
		BaseURL:          providerConfig.Settings["base_url"],
		AuthType:         providerConfig.Settings["auth_type"],
		CustomAuthHeader: providerConfig.Settings["custom_auth_header"],
	}, nil
}

func buildAIProviderTargetURL(provider string, config *aiProxyProviderConfig, c *gin.Context) (string, error) {
	baseURL := config.BaseURL
	defaultBaseURL := getAIProviderDefaultBaseURL(provider)
	if baseURL == "" {
		baseURL = defaultBaseURL
	}

	normalizedBaseURL, err := normalizeAIProviderBaseURL(baseURL)
	if err != nil {
		return "", err
	}

	if err := validateAIProviderBaseURL(normalizedBaseURL); err != nil {
		return "", err
	}

	path := ""
	switch provider {
	case "openai", "volcano":
		path = "/chat/completions"
	case "claude":
		path = "/messages"
	case "gemini":
		model := c.Query("model")
		if model == "" {
			model = config.Model
		}
		if model == "" {
			return "", fmt.Errorf("Gemini model is required")
		}
		model = strings.TrimPrefix(model, "models/")
		path = "/models/" + url.PathEscape(model) + ":generateContent"
	default:
		return "", fmt.Errorf("unsupported AI provider")
	}

	targetURL := strings.TrimRight(normalizedBaseURL, "/") + path

	if provider == "gemini" && normalizedBaseURL == defaultBaseURL {
		parsedURL, err := url.Parse(targetURL)
		if err != nil {
			return "", fmt.Errorf("invalid Gemini target URL")
		}
		query := parsedURL.Query()
		query.Set("key", config.APIKey)
		parsedURL.RawQuery = query.Encode()
		targetURL = parsedURL.String()
	}

	return targetURL, nil
}

func buildAIProviderHeaders(provider string, config *aiProxyProviderConfig, contentType string) (map[string]string, error) {
	if contentType == "" {
		contentType = "application/json"
	}

	headers := map[string]string{
		"Content-Type": contentType,
	}

	if provider == "gemini" {
		normalizedBaseURL, _ := normalizeAIProviderBaseURL(firstNonEmpty(config.BaseURL, getAIProviderDefaultBaseURL(provider)))
		if normalizedBaseURL == getAIProviderDefaultBaseURL(provider) {
			return headers, nil
		}
	}

	authType := config.AuthType
	if authType == "" {
		authType = getDefaultAIProviderAuthType(provider)
	}

	switch authType {
	case "bearer":
		headers["Authorization"] = "Bearer " + config.APIKey
	case "x-api-key":
		headers["x-api-key"] = config.APIKey
	case "x-goog-api-key":
		headers["x-goog-api-key"] = config.APIKey
	case "api-key":
		headers["api-key"] = config.APIKey
	case "custom":
		if config.CustomAuthHeader == "" {
			return nil, fmt.Errorf("custom auth header is required")
		}
		if !isSafeAIProxyHeaderName(config.CustomAuthHeader) {
			return nil, fmt.Errorf("custom auth header is not allowed")
		}
		headers[config.CustomAuthHeader] = config.APIKey
	default:
		return nil, fmt.Errorf("unsupported AI provider auth type")
	}

	if provider == "claude" {
		headers["anthropic-version"] = "2023-06-01"
	}

	return headers, nil
}

func getAIProviderDefaultBaseURL(provider string) string {
	switch provider {
	case "openai":
		return "https://api.openai.com/v1"
	case "gemini":
		return "https://generativelanguage.googleapis.com/v1beta"
	case "volcano":
		return "https://ark.cn-beijing.volces.com/api/v3"
	case "claude":
		return "https://api.anthropic.com/v1"
	default:
		return ""
	}
}

func getDefaultAIProviderAuthType(provider string) string {
	switch provider {
	case "claude":
		return "x-api-key"
	default:
		return "bearer"
	}
}

func normalizeAIProviderBaseURL(rawBaseURL string) (string, error) {
	trimmed := strings.TrimSpace(rawBaseURL)
	if trimmed == "" {
		return "", fmt.Errorf("AI provider base URL is required")
	}

	if !strings.HasPrefix(strings.ToLower(trimmed), "http://") &&
		!strings.HasPrefix(strings.ToLower(trimmed), "https://") {
		trimmed = "https://" + trimmed
	}

	parsedURL, err := url.Parse(trimmed)
	if err != nil || parsedURL.Scheme == "" || parsedURL.Host == "" {
		return "", fmt.Errorf("invalid AI provider base URL")
	}

	parsedURL.RawQuery = ""
	parsedURL.Fragment = ""
	return strings.TrimRight(parsedURL.String(), "/"), nil
}

func validateAIProviderBaseURL(baseURL string) error {
	parsedURL, err := url.Parse(baseURL)
	if err != nil {
		return fmt.Errorf("invalid AI provider base URL")
	}

	allowPrivateTargets := strings.EqualFold(os.Getenv("ALLOW_PRIVATE_AI_BASE_URLS"), "true")
	if parsedURL.Scheme != "https" && !allowPrivateTargets {
		return fmt.Errorf("custom AI provider base URL must use HTTPS")
	}

	hostname := strings.ToLower(parsedURL.Hostname())
	if isPrivateAIProxyHostname(hostname) && !allowPrivateTargets {
		return fmt.Errorf("custom AI provider base URL cannot target localhost or private network addresses")
	}

	return nil
}

func isPrivateAIProxyHostname(hostname string) bool {
	if hostname == "localhost" || hostname == "0.0.0.0" || hostname == "::1" || strings.HasSuffix(hostname, ".local") {
		return true
	}

	ip := net.ParseIP(hostname)
	if ip == nil {
		return false
	}

	return ip.IsLoopback() || ip.IsPrivate() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() || ip.IsUnspecified()
}

func isSafeAIProxyHeaderName(headerName string) bool {
	normalized := strings.ToLower(headerName)
	disallowed := []string{
		"cookie",
		"host",
		"origin",
		"referer",
		"accept",
		"content-type",
		"content-length",
		"user-agent",
	}

	for _, name := range disallowed {
		if normalized == name {
			return false
		}
	}

	if strings.HasPrefix(normalized, "sec-") ||
		strings.HasPrefix(normalized, "x-forwarded-") ||
		strings.HasPrefix(normalized, "x-real-ip") {
		return false
	}

	return regexp.MustCompile(`^[A-Za-z0-9!#$%&'*+.^_` + "`" + `|~-]+$`).MatchString(headerName)
}

func getAIProxyConfigString(config map[string]interface{}, key string) string {
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

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if value != "" {
			return value
		}
	}
	return ""
}
