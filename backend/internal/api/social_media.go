package api

import (
	"blog-backend/internal/database"
	"blog-backend/internal/models"
	"github.com/gin-gonic/gin"
	"net/http"
	"strconv"
)

// GetSocialMediaList returns all social media links
func GetSocialMediaList(c *gin.Context) {
	var socialMedia []models.SocialMedia

	// Get only active links for public access
	query := database.DB.Where("is_active = ?", true).Order("display_order ASC, id ASC")

	if err := query.Find(&socialMedia).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch social media links"})
		return
	}

	c.JSON(http.StatusOK, socialMedia)
}

// GetAllSocialMedia returns all social media links (including inactive) for admin
func GetAllSocialMedia(c *gin.Context) {
	var socialMedia []models.SocialMedia

	if err := database.DB.Order("display_order ASC, id ASC").Find(&socialMedia).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch social media links"})
		return
	}

	c.JSON(http.StatusOK, socialMedia)
}

// GetSocialMedia returns a single social media link
func GetSocialMedia(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	var socialMedia models.SocialMedia
	if err := database.DB.First(&socialMedia, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Social media link not found"})
		return
	}

	c.JSON(http.StatusOK, socialMedia)
}

// CreateSocialMedia creates a new social media link
func CreateSocialMedia(c *gin.Context) {
	var socialMedia models.SocialMedia
	if err := c.ShouldBindJSON(&socialMedia); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get the max display order and set new item to last
	var maxOrder int
	database.DB.Model(&models.SocialMedia{}).Select("COALESCE(MAX(display_order), 0)").Scan(&maxOrder)
	socialMedia.DisplayOrder = maxOrder + 1

	if err := database.DB.Create(&socialMedia).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create social media link"})
		return
	}

	c.JSON(http.StatusCreated, socialMedia)
}

// UpdateSocialMedia updates an existing social media link
func UpdateSocialMedia(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	var socialMedia models.SocialMedia
	if err := database.DB.First(&socialMedia, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Social media link not found"})
		return
	}

	var updateData models.SocialMedia
	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update fields
	socialMedia.Platform = updateData.Platform
	socialMedia.URL = updateData.URL
	socialMedia.IconName = updateData.IconName
	socialMedia.DisplayOrder = updateData.DisplayOrder
	socialMedia.IsActive = updateData.IsActive

	if err := database.DB.Save(&socialMedia).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update social media link"})
		return
	}

	c.JSON(http.StatusOK, socialMedia)
}

// DeleteSocialMedia deletes a social media link
func DeleteSocialMedia(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	result := database.DB.Delete(&models.SocialMedia{}, id)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete social media link"})
		return
	}

	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Social media link not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Social media link deleted successfully"})
}

// UpdateSocialMediaOrder updates the display order of social media links
func UpdateSocialMediaOrder(c *gin.Context) {
	var orderData []struct {
		ID    uint `json:"id"`
		Order int  `json:"order"`
	}

	if err := c.ShouldBindJSON(&orderData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update each item's order
	for _, item := range orderData {
		database.DB.Model(&models.SocialMedia{}).Where("id = ?", item.ID).Update("display_order", item.Order)
	}

	c.JSON(http.StatusOK, gin.H{"message": "Order updated successfully"})
}
