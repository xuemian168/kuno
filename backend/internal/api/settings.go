package api

import (
	"blog-backend/internal/database"
	"blog-backend/internal/models"
	"blog-backend/internal/security"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)


// Helper function to get the site's default language
func getDefaultLanguage() string {
	var settings models.SiteSettings
	if err := database.DB.First(&settings).Error; err != nil {
		// Fallback to 'zh' if unable to get settings
		return "zh"
	}
	if settings.DefaultLanguage == "" {
		return "zh"
	}
	return settings.DefaultLanguage
}

func GetSettings(c *gin.Context) {
	var settings models.SiteSettings
	if err := database.DB.Preload("Translations").First(&settings).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Apply language filtering if requested
	lang := c.Query("lang")
	defaultLang := settings.DefaultLanguage
	if defaultLang == "" {
		defaultLang = "zh"
	}
	if lang != "" && lang != defaultLang {
		applySettingsTranslation(&settings, lang)
	}

	// Handle AI configuration security
	if settings.AIConfig != "" {
		aiConfigService := security.GetGlobalAIConfigService()
		clientConfig, err := aiConfigService.ToClientConfigJSON(settings.AIConfig)
		if err != nil {
			log.Printf("Failed to convert AI config to client format: %v", err)
			// Clear AI config on error to prevent exposure
			settings.AIConfig = ""
		} else {
			settings.AIConfig = clientConfig
		}
	}

	c.JSON(http.StatusOK, settings)
}

func applySettingsTranslation(settings *models.SiteSettings, lang string) {
	for _, translation := range settings.Translations {
		if translation.Language == lang {
			if translation.SiteTitle != "" {
				settings.SiteTitle = translation.SiteTitle
			} else {
				// Clear the site title so frontend uses the fallback from translation files
				settings.SiteTitle = ""
			}
			if translation.SiteSubtitle != "" {
				settings.SiteSubtitle = translation.SiteSubtitle
			} else {
				// Clear the site subtitle so frontend uses the fallback from translation files
				settings.SiteSubtitle = ""
			}
			return
		}
	}
	// If no translation found for this language, clear the values
	// so frontend uses the fallback from translation files
	settings.SiteTitle = ""
	settings.SiteSubtitle = ""
}

func UpdateSettings(c *gin.Context) {
	var settings models.SiteSettings
	if err := database.DB.Preload("Translations").First(&settings).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Settings not found"})
		return
	}

	var input struct {
		SiteTitle          string                           `json:"site_title"`
		SiteSubtitle       string                           `json:"site_subtitle"`
		FooterText         string                           `json:"footer_text"`
		ICPFiling          string                           `json:"icp_filing"`
		PSBFiling          string                           `json:"psb_filing"`
		ShowViewCount      *bool                            `json:"show_view_count"`
		ShowSiteTitle      *bool                            `json:"show_site_title"`
		EnableSoundEffects *bool                            `json:"enable_sound_effects"`
		DefaultLanguage    string                           `json:"default_language"`
		LogoURL            string                           `json:"logo_url"`
		FaviconURL         string                           `json:"favicon_url"`
		CustomCSS          string                           `json:"custom_css"`
		ThemeConfig        string                           `json:"theme_config"`
		ActiveTheme        string                           `json:"active_theme"`
		// Background Settings
		BackgroundType     string   `json:"background_type"`
		BackgroundColor    string   `json:"background_color"`
		BackgroundImageURL string   `json:"background_image_url"`
		BackgroundOpacity  *float64 `json:"background_opacity"`
		AIConfig           string                           `json:"ai_config"`
		Translations       []models.SiteSettingsTranslation `json:"translations"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update main settings
	settings.SiteTitle = input.SiteTitle
	settings.SiteSubtitle = input.SiteSubtitle
	settings.FooterText = input.FooterText
	settings.ICPFiling = input.ICPFiling
	settings.PSBFiling = input.PSBFiling
	if input.ShowViewCount != nil {
		settings.ShowViewCount = *input.ShowViewCount
	}
	if input.ShowSiteTitle != nil {
		settings.ShowSiteTitle = *input.ShowSiteTitle
	}
	if input.EnableSoundEffects != nil {
		settings.EnableSoundEffects = *input.EnableSoundEffects
	}
	if input.DefaultLanguage != "" {
		settings.DefaultLanguage = input.DefaultLanguage
	}
	settings.LogoURL = input.LogoURL
	settings.FaviconURL = input.FaviconURL
	settings.CustomCSS = input.CustomCSS
	settings.ThemeConfig = input.ThemeConfig
	settings.ActiveTheme = input.ActiveTheme
	
	// Update background settings
	if input.BackgroundType != "" {
		settings.BackgroundType = input.BackgroundType
	}
	settings.BackgroundColor = input.BackgroundColor
	settings.BackgroundImageURL = input.BackgroundImageURL
	if input.BackgroundOpacity != nil {
		settings.BackgroundOpacity = *input.BackgroundOpacity
	}
	
	// Update AI configuration with encryption
	if input.AIConfig != "" {
		aiConfigService := security.GetGlobalAIConfigService()
		
		// Parse the input AI config
		var inputAIConfig security.InputAIConfig
		if err := json.Unmarshal([]byte(input.AIConfig), &inputAIConfig); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid AI configuration format: " + err.Error()})
			return
		}
		
		// Get existing secure config for merging
		var existingSecureConfig *security.SecureAIConfig
		if settings.AIConfig != "" {
			var existing security.SecureAIConfig
			if err := json.Unmarshal([]byte(settings.AIConfig), &existing); err == nil {
				existingSecureConfig = &existing
			}
		}
		
		// Merge with existing to preserve unchanged keys
		var secureConfig *security.SecureAIConfig
		var err error
		
		if existingSecureConfig != nil {
			secureConfig, err = aiConfigService.MergeWithExisting(&inputAIConfig, existingSecureConfig)
		} else {
			secureConfig, err = aiConfigService.EncryptAIConfig(&inputAIConfig)
		}
		
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process AI configuration: " + err.Error()})
			return
		}
		
		// Convert secure config to JSON for storage
		secureJSON, err := json.Marshal(secureConfig)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to serialize AI configuration: " + err.Error()})
			return
		}
		
		settings.AIConfig = string(secureJSON)
	} else {
		// Allow empty to clear configuration
		settings.AIConfig = ""
	}

	if err := database.DB.Save(&settings).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Delete existing translations
	database.DB.Where("settings_id = ?", settings.ID).Delete(&models.SiteSettingsTranslation{})

	// Create new translations
	for _, translation := range input.Translations {
		if translation.SiteTitle != "" || translation.SiteSubtitle != "" {
			translation.SettingsID = settings.ID
			database.DB.Create(&translation)
		}
	}

	// Reload with translations
	database.DB.Preload("Translations").First(&settings)
	
	// Always reload embedding service when settings are updated
	// This ensures AI configuration changes are applied immediately
	if err := GetGlobalEmbeddingService().ReloadConfig(); err != nil {
		log.Printf("Failed to reload embedding service configuration: %v", err)
	} else {
		log.Printf("Successfully reloaded embedding service configuration")
	}
	
	// Convert AI config to client-safe format before returning
	if settings.AIConfig != "" {
		aiConfigService := security.GetGlobalAIConfigService()
		clientConfig, err := aiConfigService.ToClientConfigJSON(settings.AIConfig)
		if err != nil {
			log.Printf("Failed to convert AI config to client format for response: %v", err)
			// Clear AI config on error to prevent exposure
			settings.AIConfig = ""
		} else {
			settings.AIConfig = clientConfig
		}
	}
	
	c.JSON(http.StatusOK, settings)
}

// UploadLogo handles logo file upload
func UploadLogo(c *gin.Context) {
	uploadBrandingFile(c, "logo")
}

// UploadFavicon handles favicon file upload
func UploadFavicon(c *gin.Context) {
	uploadBrandingFile(c, "favicon")
}

// UploadBackgroundImage handles background image file upload
func UploadBackgroundImage(c *gin.Context) {
	uploadBrandingFile(c, "background")
}

// RemoveBackgroundImage removes the current background image
func RemoveBackgroundImage(c *gin.Context) {
	var settings models.SiteSettings
	if err := database.DB.First(&settings).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to find settings"})
		return
	}

	// Remove the file if exists
	if settings.BackgroundImageURL != "" {
		var fileName string
		if strings.HasPrefix(settings.BackgroundImageURL, "/api/uploads/backgrounds/") {
			fileName = strings.TrimPrefix(settings.BackgroundImageURL, "/api/uploads/backgrounds/")
		} else {
			fileName = strings.TrimPrefix(settings.BackgroundImageURL, "/uploads/backgrounds/")
		}
		
		if fileName != "" {
			uploadDir := filepath.Join(UploadDir, "backgrounds")
			filePath := filepath.Join(uploadDir, fileName)
			os.Remove(filePath)
		}
	}

	// Clear the background image URL and set type to none
	settings.BackgroundImageURL = ""
	settings.BackgroundType = "none"

	if err := database.DB.Save(&settings).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update settings"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Background image removed successfully"})
}

func uploadBrandingFile(c *gin.Context, fileType string) {
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}

	// Validate file type
	allowedTypes := make(map[string][]string)
	if fileType == "logo" {
		allowedTypes["image"] = []string{".png", ".jpg", ".jpeg", ".svg", ".webp"}
	} else if fileType == "favicon" {
		allowedTypes["icon"] = []string{".ico", ".png", ".svg"}
	} else if fileType == "background" {
		allowedTypes["image"] = []string{".png", ".jpg", ".jpeg", ".webp"}
	}

	ext := strings.ToLower(filepath.Ext(file.Filename))
	isValidType := false
	for _, types := range allowedTypes {
		for _, allowedExt := range types {
			if ext == allowedExt {
				isValidType = true
				break
			}
		}
		if isValidType {
			break
		}
	}

	if !isValidType {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file type"})
		return
	}

	// Validate file size (5MB max for logo and background, 1MB for favicon)
	maxSize := int64(5 << 20) // 5MB
	if fileType == "favicon" {
		maxSize = int64(1 << 20) // 1MB
	}
	if file.Size > maxSize {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File too large"})
		return
	}

	// Create uploads directory if it doesn't exist
	var uploadSubDir string
	if fileType == "background" {
		uploadSubDir = "backgrounds"
	} else {
		uploadSubDir = "branding"
	}
	uploadDir := filepath.Join(UploadDir, uploadSubDir)
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create upload directory"})
		return
	}

	// Generate unique filename
	timestamp := time.Now().Unix()
	filename := fmt.Sprintf("%s_%d%s", fileType, timestamp, ext)
	filePath := filepath.Join(uploadDir, filename)

	// Save file
	if err := c.SaveUploadedFile(file, filePath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
		return
	}

	// Generate URL - use relative path for now, can be made configurable later
	fileURL := fmt.Sprintf("/uploads/%s/%s", uploadSubDir, filename)

	// Update settings
	var settings models.SiteSettings
	if err := database.DB.First(&settings).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to find settings"})
		return
	}

	// Remove old file if exists
	var oldFile string
	if fileType == "logo" {
		if settings.LogoURL != "" {
			// Handle both old and new URL patterns
			if strings.HasPrefix(settings.LogoURL, "/api/uploads/branding/") {
				oldFile = strings.TrimPrefix(settings.LogoURL, "/api/uploads/branding/")
			} else {
				oldFile = strings.TrimPrefix(settings.LogoURL, "/uploads/branding/")
			}
		}
		settings.LogoURL = fileURL
	} else if fileType == "favicon" {
		if settings.FaviconURL != "" {
			// Handle both old and new URL patterns
			if strings.HasPrefix(settings.FaviconURL, "/api/uploads/branding/") {
				oldFile = strings.TrimPrefix(settings.FaviconURL, "/api/uploads/branding/")
			} else {
				oldFile = strings.TrimPrefix(settings.FaviconURL, "/uploads/branding/")
			}
		}
		settings.FaviconURL = fileURL
	} else if fileType == "background" {
		if settings.BackgroundImageURL != "" {
			// Handle both old and new URL patterns
			if strings.HasPrefix(settings.BackgroundImageURL, "/api/uploads/backgrounds/") {
				oldFile = strings.TrimPrefix(settings.BackgroundImageURL, "/api/uploads/backgrounds/")
			} else {
				oldFile = strings.TrimPrefix(settings.BackgroundImageURL, "/uploads/backgrounds/")
			}
		}
		settings.BackgroundImageURL = fileURL
	}

	if err := database.DB.Save(&settings).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update settings"})
		return
	}

	// Remove old file
	if oldFile != "" {
		oldPath := filepath.Join(uploadDir, oldFile)
		os.Remove(oldPath)
	}

	c.JSON(http.StatusOK, gin.H{
		"url":     fileURL,
		"message": fmt.Sprintf("%s uploaded successfully", strings.Title(fileType)),
	})
}
