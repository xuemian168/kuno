package api

import (
	"net/http"
	"blog-backend/internal/database"
	"blog-backend/internal/models"
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
		SiteTitle    string                          `json:"site_title"`
		SiteSubtitle string                          `json:"site_subtitle"`
		FooterText   string                          `json:"footer_text"`
		Translations []models.SiteSettingsTranslation `json:"translations"`
	}
	
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	// Update main settings
	settings.SiteTitle = input.SiteTitle
	settings.SiteSubtitle = input.SiteSubtitle
	settings.FooterText = input.FooterText
	
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