package api

import (
	"blog-backend/internal/database"
	"blog-backend/internal/models"
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
)

const (
	MaxFileSize = 100 * 1024 * 1024 // 100MB
	UploadDir   = "./uploads"
)

var allowedImageTypes = map[string]bool{
	"image/jpeg": true,
	"image/jpg":  true,
	"image/png":  true,
	"image/gif":  true,
	"image/webp": true,
}

var allowedVideoTypes = map[string]bool{
	"video/mp4":  true,
	"video/webm": true,
	"video/ogg":  true,
	"video/avi":  true,
	"video/mov":  true,
}

func init() {
	// Create upload directory if it doesn't exist
	if _, err := os.Stat(UploadDir); os.IsNotExist(err) {
		os.MkdirAll(UploadDir+"/images", 0755)
		os.MkdirAll(UploadDir+"/videos", 0755)
	}
}

func UploadMedia(c *gin.Context) {
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file provided"})
		return
	}
	defer file.Close()

	// Check file size
	if header.Size > MaxFileSize {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File size exceeds 100MB limit"})
		return
	}

	// Check content type
	contentType := header.Header.Get("Content-Type")
	var mediaType models.MediaType
	var subDir string

	if allowedImageTypes[contentType] {
		mediaType = models.MediaTypeImage
		subDir = "images"
	} else if allowedVideoTypes[contentType] {
		mediaType = models.MediaTypeVideo
		subDir = "videos"
	} else {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Unsupported file type"})
		return
	}

	// Generate unique filename
	ext := filepath.Ext(header.Filename)
	fileName := fmt.Sprintf("%s%s", uuid.New().String(), ext)
	filePath := filepath.Join(UploadDir, subDir, fileName)

	// Create the file
	dst, err := os.Create(filePath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create file"})
		return
	}
	defer dst.Close()

	// Copy file content
	if _, err := io.Copy(dst, file); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
		return
	}

	// Create database record
	alt := c.PostForm("alt")
	media := models.MediaLibrary{
		FileName:     fileName,
		OriginalName: header.Filename,
		FilePath:     filePath,
		FileSize:     header.Size,
		MimeType:     contentType,
		MediaType:    mediaType,
		URL:          fmt.Sprintf("/uploads/%s/%s", subDir, fileName),
		Alt:          alt,
	}

	if err := database.DB.Create(&media).Error; err != nil {
		// Delete the file if database save fails
		os.Remove(filePath)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save media record"})
		return
	}

	c.JSON(http.StatusOK, media)
}

func GetMediaList(c *gin.Context) {
	var media []models.MediaLibrary

	// Parse query parameters
	mediaType := c.Query("type")
	page := c.DefaultQuery("page", "1")
	limit := c.DefaultQuery("limit", "20")

	pageInt, _ := strconv.Atoi(page)
	limitInt, _ := strconv.Atoi(limit)
	offset := (pageInt - 1) * limitInt

	query := database.DB.Model(&models.MediaLibrary{})

	// Filter by media type if specified
	if mediaType != "" && (mediaType == "image" || mediaType == "video") {
		query = query.Where("media_type = ?", mediaType)
	}

	// Get total count
	var total int64
	query.Count(&total)

	// Get paginated results
	if err := query.Order("created_at DESC").Offset(offset).Limit(limitInt).Find(&media).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch media"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"media": media,
		"total": total,
		"page":  pageInt,
		"limit": limitInt,
	})
}

func GetMedia(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid media ID"})
		return
	}

	var media models.MediaLibrary
	if err := database.DB.First(&media, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Media not found"})
		return
	}

	c.JSON(http.StatusOK, media)
}

func UpdateMedia(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid media ID"})
		return
	}

	var media models.MediaLibrary
	if err := database.DB.First(&media, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Media not found"})
		return
	}

	var req struct {
		Alt string `json:"alt"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	media.Alt = req.Alt
	if err := database.DB.Save(&media).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update media"})
		return
	}

	c.JSON(http.StatusOK, media)
}

func DeleteMedia(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid media ID"})
		return
	}

	var media models.MediaLibrary
	if err := database.DB.First(&media, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Media not found"})
		return
	}

	// Delete the file
	if err := os.Remove(media.FilePath); err != nil {
		// Log the error but continue with database deletion
		fmt.Printf("Warning: Failed to delete file %s: %v\n", media.FilePath, err)
	}

	// Delete from database
	if err := database.DB.Delete(&media).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete media"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Media deleted successfully"})
}

func ServeMedia(c *gin.Context) {
	subDir := c.Param("subdir")
	fileName := c.Param("filename")

	// Validate subdirectory
	if subDir != "images" && subDir != "videos" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid media type"})
		return
	}

	filePath := filepath.Join(UploadDir, subDir, fileName)

	// Check if file exists
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
		return
	}

	c.File(filePath)
}
