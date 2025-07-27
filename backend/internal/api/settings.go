package api

import (
	"blog-backend/internal/database"
	"blog-backend/internal/models"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

func GetSettings(c *gin.Context) {
	var settings models.SiteSettings
	if err := database.DB.Preload("Translations").First(&settings).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Apply language filtering if requested
	lang := c.Query("lang")
	if lang != "" && lang != "zh" {
		applySettingsTranslation(&settings, lang)
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
		EnableSoundEffects *bool                            `json:"enable_sound_effects"`
		LogoURL            string                           `json:"logo_url"`
		FaviconURL         string                           `json:"favicon_url"`
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
	if input.EnableSoundEffects != nil {
		settings.EnableSoundEffects = *input.EnableSoundEffects
	}
	settings.LogoURL = input.LogoURL
	settings.FaviconURL = input.FaviconURL

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
	} else { // favicon
		allowedTypes["icon"] = []string{".ico", ".png", ".svg"}
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

	// Validate file size (5MB max for logo, 1MB for favicon)
	maxSize := int64(5 << 20) // 5MB
	if fileType == "favicon" {
		maxSize = int64(1 << 20) // 1MB
	}
	if file.Size > maxSize {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File too large"})
		return
	}

	// Create uploads directory if it doesn't exist
	uploadDir := "./uploads/branding"
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
	fileURL := fmt.Sprintf("/api/uploads/branding/%s", filename)

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
			oldFile = strings.TrimPrefix(settings.LogoURL, "/api/uploads/branding/")
		}
		settings.LogoURL = fileURL
	} else if fileType == "favicon" {
		if settings.FaviconURL != "" {
			oldFile = strings.TrimPrefix(settings.FaviconURL, "/api/uploads/branding/")
		}
		settings.FaviconURL = fileURL
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
