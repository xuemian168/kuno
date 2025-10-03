package api

import (
	"blog-backend/internal/database"
	"blog-backend/internal/models"
	"bytes"
	"encoding/xml"
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
)

const (
	MaxFileSize       = 100 * 1024 * 1024 // 100MB
	MaxGIFFrames      = 1000               // Prevent GIF bombs
	MaxPNGChunks      = 100                // Prevent PNG bombs
	MaxImageDimension = 10000              // 10000x10000 pixels max
	MaxVideoMetadata  = 10 * 1024 * 1024   // 10MB metadata limit
)

var UploadDir = getUploadDir()

var allowedImageTypes = map[string]bool{
	"image/jpeg":    true,
	"image/jpg":     true,
	"image/png":     true,
	"image/gif":     true,
	"image/webp":    true,
	"image/svg+xml": true, // SVG support with sanitization
}

var allowedVideoTypes = map[string]bool{
	"video/mp4":  true,
	"video/webm": true,
	"video/ogg":  true,
	"video/avi":  true,
	"video/mov":  true,
}

func getUploadDir() string {
	if dir := os.Getenv("UPLOAD_DIR"); dir != "" {
		return dir
	}
	return "/app/data/uploads" // Default path
}

func init() {
	// Create upload directory if it doesn't exist
	if _, err := os.Stat(UploadDir); os.IsNotExist(err) {
		os.MkdirAll(UploadDir+"/images", 0755)
		os.MkdirAll(UploadDir+"/videos", 0755)
		os.MkdirAll(UploadDir+"/branding", 0755)
	}
}

// Security: File magic numbers for validation
var fileMagicNumbers = map[string][]byte{
	"image/jpeg":    {0xFF, 0xD8, 0xFF},
	"image/png":     {0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A},
	"image/gif":     {0x47, 0x49, 0x46, 0x38},
	"image/webp":    {0x52, 0x49, 0x46, 0x46},
	"image/svg+xml": {0x3C, 0x3F, 0x78, 0x6D, 0x6C}, // <?xml or <svg
	"video/mp4":     {0x00, 0x00, 0x00},
	"video/webm":    {0x1A, 0x45, 0xDF, 0xA3},
	"video/ogg":     {0x4F, 0x67, 0x67, 0x53},
	"video/avi":     {0x52, 0x49, 0x46, 0x46},
}

// Security: Dangerous SVG elements that must be removed
var dangerousSVGElements = []string{
	"script", "foreignObject", "iframe", "object", "embed",
	"use", "animate", "animateTransform", "set", "animateMotion",
}

// Security: Dangerous SVG attributes that must be removed
var dangerousSVGAttributes = []string{
	"onload", "onerror", "onclick", "onmouseover", "onmouseout",
	"onmousedown", "onmouseup", "onmousemove", "onkeydown",
	"onkeyup", "onkeypress", "onfocus", "onblur", "onchange",
	"onsubmit", "onreset", "onselect", "onabort", "href", "xlink:href",
}

// Helper function to get minimum of two integers
func minInt(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// validateJPEG checks JPEG file integrity
func validateJPEG(content []byte) error {
	if len(content) < 4 {
		return fmt.Errorf("file too small to be a valid JPEG")
	}

	// Check SOI (Start of Image) marker: 0xFFD8
	if content[0] != 0xFF || content[1] != 0xD8 {
		return fmt.Errorf("invalid JPEG: missing SOI marker")
	}

	// Check EOI (End of Image) marker: 0xFFD9
	if content[len(content)-2] != 0xFF || content[len(content)-1] != 0xD9 {
		return fmt.Errorf("invalid JPEG: missing EOI marker")
	}

	return nil
}

// validatePNG checks PNG file integrity and prevents PNG bombs
func validatePNG(content []byte) error {
	if len(content) < 8 {
		return fmt.Errorf("file too small to be a valid PNG")
	}

	// Check PNG signature
	pngSignature := []byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A}
	if !bytes.Equal(content[:8], pngSignature) {
		return fmt.Errorf("invalid PNG signature")
	}

	// Check for IEND chunk (marks end of PNG)
	if !bytes.Contains(content, []byte("IEND")) {
		return fmt.Errorf("invalid PNG: missing IEND chunk")
	}

	// Prevent PNG bombs by counting chunks
	chunkCount := 0
	pos := 8 // Skip signature
	for pos+12 <= len(content) && chunkCount < MaxPNGChunks {
		chunkCount++
		length := int(content[pos])<<24 | int(content[pos+1])<<16 | int(content[pos+2])<<8 | int(content[pos+3])
		pos += 12 + length // length + type(4) + crc(4)
		if pos > len(content) {
			break
		}
	}

	if chunkCount >= MaxPNGChunks {
		return fmt.Errorf("suspicious PNG: too many chunks (potential PNG bomb)")
	}

	return nil
}

// validateGIF checks GIF file integrity and prevents GIF bombs
func validateGIF(content []byte) error {
	if len(content) < 6 {
		return fmt.Errorf("file too small to be a valid GIF")
	}

	// Check GIF signature (GIF87a or GIF89a)
	if !bytes.HasPrefix(content, []byte("GIF87a")) && !bytes.HasPrefix(content, []byte("GIF89a")) {
		return fmt.Errorf("invalid GIF signature")
	}

	// Check for GIF terminator (0x3B)
	if content[len(content)-1] != 0x3B {
		return fmt.Errorf("invalid GIF: missing terminator")
	}

	// Prevent GIF bombs by counting frames
	frameCount := bytes.Count(content, []byte{0x21, 0xF9, 0x04}) // Graphics Control Extension
	if frameCount > MaxGIFFrames {
		return fmt.Errorf("suspicious GIF: too many frames (potential GIF bomb): %d", frameCount)
	}

	return nil
}

// validateWebP checks WebP file integrity
func validateWebP(content []byte) error {
	if len(content) < 12 {
		return fmt.Errorf("file too small to be a valid WebP")
	}

	// Check RIFF header
	if !bytes.HasPrefix(content, []byte("RIFF")) {
		return fmt.Errorf("invalid WebP: missing RIFF header")
	}

	// Check WEBP signature at offset 8
	if !bytes.Equal(content[8:12], []byte("WEBP")) {
		return fmt.Errorf("invalid WebP: missing WEBP signature")
	}

	return nil
}

// validateMP4 checks MP4 file integrity
func validateMP4(content []byte) error {
	if len(content) < 12 {
		return fmt.Errorf("file too small to be a valid MP4")
	}

	// Check for ftyp atom (file type box) in first 64 bytes or entire file if smaller
	searchLen := minInt(len(content), 64)
	if !bytes.Contains(content[:searchLen], []byte("ftyp")) {
		return fmt.Errorf("invalid MP4: missing ftyp atom")
	}

	// Common MP4 brands
	validBrands := [][]byte{
		[]byte("isom"), []byte("iso2"), []byte("mp41"), []byte("mp42"),
		[]byte("avc1"), []byte("M4V "), []byte("M4A "),
	}

	found := false
	for _, brand := range validBrands {
		if bytes.Contains(content[:searchLen], brand) {
			found = true
			break
		}
	}

	if !found {
		return fmt.Errorf("invalid MP4: unrecognized brand")
	}

	return nil
}

// validateWebM checks WebM file integrity
func validateWebM(content []byte) error {
	if len(content) < 4 {
		return fmt.Errorf("file too small to be a valid WebM")
	}

	// Check EBML header (0x1A45DFA3)
	if content[0] != 0x1A || content[1] != 0x45 || content[2] != 0xDF || content[3] != 0xA3 {
		return fmt.Errorf("invalid WebM: missing EBML header")
	}

	return nil
}

// validateOGG checks OGG file integrity
func validateOGG(content []byte) error {
	if len(content) < 4 {
		return fmt.Errorf("file too small to be a valid OGG")
	}

	// Check OggS signature
	if !bytes.HasPrefix(content, []byte("OggS")) {
		return fmt.Errorf("invalid OGG: missing OggS signature")
	}

	return nil
}

// validateAVI checks AVI file integrity
func validateAVI(content []byte) error {
	if len(content) < 12 {
		return fmt.Errorf("file too small to be a valid AVI")
	}

	// Check RIFF header
	if !bytes.HasPrefix(content, []byte("RIFF")) {
		return fmt.Errorf("invalid AVI: missing RIFF header")
	}

	// Check AVI signature at offset 8
	if !bytes.Equal(content[8:12], []byte("AVI ")) {
		return fmt.Errorf("invalid AVI: missing AVI signature")
	}

	return nil
}

// detectPolyglot detects files that are valid in multiple formats (polyglot attacks)
func detectPolyglot(content []byte) bool {
	if len(content) < 100 {
		return false
	}

	suspiciousPatterns := []string{
		"<?php", "#!/bin/", "<script", "javascript:",
		"eval(", "base64_decode", "exec(", "system(",
	}

	contentStr := string(content)
	for _, pattern := range suspiciousPatterns {
		if strings.Contains(contentStr, pattern) {
			fmt.Printf("Warning: Suspicious pattern detected in file: %s\n", pattern)
			return true
		}
	}

	magicCount := 0
	for _, magic := range fileMagicNumbers {
		if bytes.HasPrefix(content, magic) {
			magicCount++
		}
	}

	return magicCount > 1
}

// validateFileIntegrity performs comprehensive integrity checks based on file type
func validateFileIntegrity(content []byte, mimeType string) error {
	switch mimeType {
	case "image/jpeg", "image/jpg":
		return validateJPEG(content)
	case "image/png":
		return validatePNG(content)
	case "image/gif":
		return validateGIF(content)
	case "image/webp":
		return validateWebP(content)
	case "video/mp4":
		return validateMP4(content)
	case "video/webm":
		return validateWebM(content)
	case "video/ogg":
		return validateOGG(content)
	case "video/avi", "video/mov":
		return validateAVI(content)
	case "image/svg+xml":
		// SVG validation happens in sanitizeSVG
		return nil
	default:
		return fmt.Errorf("unsupported file type for integrity check: %s", mimeType)
	}
}

// validateFileContent checks if file content matches declared MIME type using magic numbers
func validateFileContent(content []byte, declaredType string) bool {
	if len(content) == 0 {
		return false
	}

	magic, exists := fileMagicNumbers[declaredType]
	if !exists {
		return false
	}

	// Special handling for SVG (can start with <?xml or <svg)
	if declaredType == "image/svg+xml" {
		return bytes.HasPrefix(content, []byte("<?xml")) ||
			bytes.HasPrefix(content, []byte("<svg")) ||
			bytes.HasPrefix(content, magic)
	}

	// For other formats, check if content starts with expected magic number
	if len(content) < len(magic) {
		return false
	}

	return bytes.HasPrefix(content, magic)
}

// sanitizeSVG removes dangerous elements and attributes from SVG content
func sanitizeSVG(content []byte) ([]byte, error) {
	contentStr := string(content)

	// Remove dangerous elements
	for _, element := range dangerousSVGElements {
		// Remove opening and closing tags (non-greedy)
		openTag := regexp.MustCompile(`(?is)<` + element + `[^>]*>.*?</` + element + `>`)
		contentStr = openTag.ReplaceAllString(contentStr, "")

		// Remove self-closing tags
		selfClosing := regexp.MustCompile(`(?i)<` + element + `[^>]*/?>`)
		contentStr = selfClosing.ReplaceAllString(contentStr, "")
	}

	// Remove dangerous attributes - improved regex patterns
	for _, attr := range dangerousSVGAttributes {
		// Handle href specially (remove javascript:, data:, vbscript: protocols)
		if attr == "href" || attr == "xlink:href" {
			// Match and remove dangerous protocols in href/xlink:href
			dangerousProtocols := regexp.MustCompile(`(?i)\s*` + regexp.QuoteMeta(attr) + `\s*=\s*["']?(javascript|data|vbscript):[^"'\s>]*["'\s>]?`)
			contentStr = dangerousProtocols.ReplaceAllString(contentStr, "")
			continue
		}

		// Remove event handler attributes - match attribute with any value
		attrPattern := regexp.MustCompile(`(?i)\s+` + regexp.QuoteMeta(attr) + `\s*=\s*"[^"]*"`)
		contentStr = attrPattern.ReplaceAllString(contentStr, "")

		// Also match single-quoted attributes
		attrPattern2 := regexp.MustCompile(`(?i)\s+` + regexp.QuoteMeta(attr) + `\s*=\s*'[^']*'`)
		contentStr = attrPattern2.ReplaceAllString(contentStr, "")

		// Also match unquoted attributes
		attrPattern3 := regexp.MustCompile(`(?i)\s+` + regexp.QuoteMeta(attr) + `\s*=\s*[^\s>]+`)
		contentStr = attrPattern3.ReplaceAllString(contentStr, "")
	}

	// Validate result is still valid XML
	var svgRoot struct{}
	if err := xml.Unmarshal([]byte(contentStr), &svgRoot); err != nil {
		return nil, fmt.Errorf("sanitized SVG is not valid XML: %v", err)
	}

	return []byte(contentStr), nil
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

	// Read file content for security validation
	fileContent, err := io.ReadAll(file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read file content"})
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

	// Security Layer 1: Validate file content matches declared MIME type (prevent Content-Type spoofing)
	if !validateFileContent(fileContent, contentType) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File content does not match declared type. Possible Content-Type spoofing detected."})
		return
	}

	// Security Layer 2: Perform comprehensive file integrity check
	if err := validateFileIntegrity(fileContent, contentType); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("File integrity check failed: %v", err)})
		return
	}

	// Security Layer 3: Detect polyglot files (files valid in multiple formats)
	if detectPolyglot(fileContent) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Suspicious file detected: file contains multiple format signatures or executable content"})
		return
	}

	// Validate file extension with whitelist
	ext := strings.ToLower(filepath.Ext(header.Filename))
	allowedExtensions := map[string]bool{
		".jpg": true, ".jpeg": true, ".png": true, ".gif": true, ".webp": true, ".svg": true,
		".mp4": true, ".webm": true, ".ogg": true, ".avi": true, ".mov": true,
	}
	if !allowedExtensions[ext] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File extension not allowed"})
		return
	}

	// Security Layer 4: Sanitize SVG content if it's an SVG file
	isSVG := contentType == "image/svg+xml"
	if isSVG {
		sanitized, err := sanitizeSVG(fileContent)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Failed to sanitize SVG: %v", err)})
			return
		}
		fileContent = sanitized
		fmt.Printf("SVG file sanitized: %s\n", header.Filename)
	}

	// Generate unique filename with validated extension
	fileName := fmt.Sprintf("%s%s", uuid.New().String(), ext)
	filePath := filepath.Join(UploadDir, subDir, fileName)

	// Ensure directory exists
	dir := filepath.Dir(filePath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		fmt.Printf("Failed to create directory %s: %v\n", dir, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create upload directory"})
		return
	}

	// Write sanitized content to file
	if err := os.WriteFile(filePath, fileContent, 0644); err != nil {
		fmt.Printf("Failed to write file %s: %v\n", filePath, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
		return
	}

	// Create database record
	alt := c.PostForm("alt")
	media := models.MediaLibrary{
		FileName:     fileName,
		OriginalName: header.Filename,
		FilePath:     filePath,
		FileSize:     int64(len(fileContent)), // Use actual file size after sanitization
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

// BulkDeleteMedia handles bulk deletion of media files
func BulkDeleteMedia(c *gin.Context) {
	var req struct {
		IDs []int `json:"ids" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	if len(req.IDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No media IDs provided"})
		return
	}

	// Limit the number of items that can be deleted at once
	if len(req.IDs) > 100 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot delete more than 100 items at once"})
		return
	}

	var failedDeletions []map[string]interface{}
	var successCount int

	// Get all media files to be deleted
	var mediaFiles []models.MediaLibrary
	if err := database.DB.Where("id IN ?", req.IDs).Find(&mediaFiles).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch media files"})
		return
	}

	// Delete each file
	for _, media := range mediaFiles {
		// Delete the file from filesystem
		if err := os.Remove(media.FilePath); err != nil {
			// Log the error but continue with database deletion
			fmt.Printf("Warning: Failed to delete file %s: %v\n", media.FilePath, err)
		}

		// Delete from database
		if err := database.DB.Delete(&media).Error; err != nil {
			failedDeletions = append(failedDeletions, map[string]interface{}{
				"id":       media.ID,
				"filename": media.OriginalName,
				"error":    err.Error(),
			})
		} else {
			successCount++
		}
	}

	response := map[string]interface{}{
		"success_count": successCount,
		"total_count":   len(req.IDs),
		"failed":        failedDeletions,
	}

	if len(failedDeletions) > 0 {
		response["message"] = fmt.Sprintf("Successfully deleted %d of %d files", successCount, len(req.IDs))
	} else {
		response["message"] = fmt.Sprintf("Successfully deleted %d files", successCount)
	}

	c.JSON(http.StatusOK, response)
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

	// Security Layer 5: Set security response headers
	// Prevent MIME type sniffing
	c.Header("X-Content-Type-Options", "nosniff")
	// Prevent clickjacking
	c.Header("X-Frame-Options", "DENY")

	// Special handling for SVG files
	ext := strings.ToLower(filepath.Ext(fileName))
	if ext == ".svg" {
		// Strict CSP for SVG files to prevent script execution
		c.Header("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:")
		c.Header("Content-Type", "image/svg+xml")
		// Force browser to treat as attachment (optional: could use 'inline' if you want to display)
		c.Header("Content-Disposition", fmt.Sprintf("inline; filename=\"%s\"", fileName))
	}

	c.File(filePath)
}
