package api

import (
	"blog-backend/internal/database"
	"blog-backend/internal/models"
	"github.com/gin-gonic/gin"
	"net/http"
	"strconv"
)

// Helper function to get the site's default language
func getCategoryDefaultLanguage() string {
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

func GetCategories(c *gin.Context) {
	var categories []models.Category

	query := database.DB.Preload("Translations")

	if err := query.Find(&categories).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Apply language filtering if requested
	lang := c.Query("lang")
	defaultLang := getCategoryDefaultLanguage()
	if lang != "" && lang != defaultLang {
		for i := range categories {
			applyCategoryTranslation(&categories[i], lang)
		}
	}

	c.JSON(http.StatusOK, categories)
}

func GetCategory(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid category ID"})
		return
	}

	var category models.Category
	if err := database.DB.Preload("Articles").First(&category, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Category not found"})
		return
	}

	c.JSON(http.StatusOK, category)
}

func CreateCategory(c *gin.Context) {
	var category models.Category
	if err := c.ShouldBindJSON(&category); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := database.DB.Create(&category).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, category)
}

func UpdateCategory(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid category ID"})
		return
	}

	var category models.Category
	if err := database.DB.First(&category, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Category not found"})
		return
	}

	if err := c.ShouldBindJSON(&category); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := database.DB.Save(&category).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, category)
}

func DeleteCategory(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid category ID"})
		return
	}

	if err := database.DB.Delete(&models.Category{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Category deleted successfully"})
}

// Helper function to apply translation to a category
func applyCategoryTranslation(category *models.Category, lang string) {
	for _, translation := range category.Translations {
		if translation.Language == lang {
			if translation.Name != "" {
				category.Name = translation.Name
			}
			if translation.Description != "" {
				category.Description = translation.Description
			}
			break
		}
	}
}
