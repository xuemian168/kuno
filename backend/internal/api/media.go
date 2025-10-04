package api

import (
	"blog-backend/internal/database"
	"blog-backend/internal/models"
	"bytes"
	"encoding/xml"
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"image"
	"image/gif"
	"image/jpeg"
	"image/png"
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
	"image/jpeg": true,
	"image/jpg":  true,
	"image/png":  true,
	"image/gif":  true,
	// "image/webp": WebP 已禁止用户上传
	// "image/svg+xml": SVG 已禁止用户上传 (安全原因: XSS/SSRF/XXE/DoS 风险)
	// 注意: 系统内置 SVG 图标 (/public/**/*.svg) 不受此限制影响
}

var allowedVideoTypes = map[string]bool{
	"video/mp4": true,
	"video/avi": true,
	"video/mov": true,
	// "video/webm": WebM 已禁止
	// "video/ogg": OGG 已禁止
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
	// Script execution
	"script", "handler",

	// External content loading
	"foreignObject", "iframe", "object", "embed", "image",

	// Link elements (can be weaponized with animate)
	"a",

	// Animation elements (can dynamically inject attributes)
	"animate", "animateTransform", "set", "animateMotion", "animateColor", "discard",

	// Filter elements (can load external resources via feImage)
	"filter", "feBlend", "feColorMatrix", "feComponentTransfer", "feComposite",
	"feConvolveMatrix", "feDiffuseLighting", "feDisplacementMap", "feDistantLight",
	"feDropShadow", "feFlood", "feFuncA", "feFuncB", "feFuncG", "feFuncR",
	"feGaussianBlur", "feImage", "feMerge", "feMergeNode", "feMorphology",
	"feOffset", "fePointLight", "feSpecularLighting", "feSpotLight", "feTile", "feTurbulence",

	// Pattern/Mask elements (can reference external resources)
	"pattern", "mask", "clipPath",

	// Style injection vector
	"style",

	// Metadata (can contain arbitrary XML)
	"metadata",

	// Other potentially dangerous elements
	"use", // Can reference external SVG fragments
}

// Security: Dangerous SVG attributes that must be removed
var dangerousSVGAttributes = []string{
	// Event handlers
	"onload", "onerror", "onclick", "onmouseover", "onmouseout",
	"onmousedown", "onmouseup", "onmousemove", "onkeydown",
	"onkeyup", "onkeypress", "onfocus", "onblur", "onchange",
	"onsubmit", "onreset", "onselect", "onabort",
	"onbegin", "onend", "onrepeat", // SVG-specific animation events

	// External resource references
	"href", "xlink:href",

	// Animation-related attributes (defense in depth)
	"attributeName", "values", "from", "to", "by",
	"dur", "repeatCount", "repeatDur", "keytimes", "keyTimes",
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

// stripImageMetadata removes all metadata from images by re-encoding them
// This prevents XSS attacks via EXIF (JPEG), tEXt chunks (PNG), or comment blocks (GIF)
func stripImageMetadata(content []byte, mimeType string) ([]byte, error) {
	var img image.Image
	var err error

	// Decode image based on type
	reader := bytes.NewReader(content)
	switch mimeType {
	case "image/jpeg", "image/jpg":
		img, err = jpeg.Decode(reader)
		if err != nil {
			return nil, fmt.Errorf("failed to decode JPEG: %v", err)
		}

		// Re-encode as JPEG without metadata
		buf := new(bytes.Buffer)
		opts := &jpeg.Options{Quality: 95}
		if err := jpeg.Encode(buf, img, opts); err != nil {
			return nil, fmt.Errorf("failed to encode JPEG: %v", err)
		}
		return buf.Bytes(), nil

	case "image/png":
		img, err = png.Decode(reader)
		if err != nil {
			return nil, fmt.Errorf("failed to decode PNG: %v", err)
		}

		// Re-encode as PNG without metadata (tEXt/zTXt/iTXt chunks removed)
		buf := new(bytes.Buffer)
		encoder := &png.Encoder{CompressionLevel: png.DefaultCompression}
		if err := encoder.Encode(buf, img); err != nil {
			return nil, fmt.Errorf("failed to encode PNG: %v", err)
		}
		return buf.Bytes(), nil

	case "image/gif":
		img, err = gif.Decode(reader)
		if err != nil {
			return nil, fmt.Errorf("failed to decode GIF: %v", err)
		}

		// Re-encode as GIF without metadata (comment blocks removed)
		buf := new(bytes.Buffer)
		opts := &gif.Options{}
		if err := gif.Encode(buf, img, opts); err != nil {
			return nil, fmt.Errorf("failed to encode GIF: %v", err)
		}
		return buf.Bytes(), nil

	default:
		return nil, fmt.Errorf("unsupported image type for metadata stripping: %s", mimeType)
	}
}

// sanitizeSVG removes dangerous elements and attributes from SVG content
func sanitizeSVG(content []byte) ([]byte, error) {
	contentStr := string(content)

	// Security Layer 1: Remove DOCTYPE declarations to prevent XXE attacks
	// Removes:
	// <!DOCTYPE svg [...]>
	// <!DOCTYPE svg SYSTEM "...">
	// <!DOCTYPE svg PUBLIC "..." "...">
	doctypePattern := regexp.MustCompile(`(?is)<!DOCTYPE[^>]*(\[.*?\])?\s*>`)
	contentStr = doctypePattern.ReplaceAllString(contentStr, "")

	// Also remove any remaining ENTITY declarations that might have escaped
	entityPattern := regexp.MustCompile(`(?is)<!ENTITY[^>]*>`)
	contentStr = entityPattern.ReplaceAllString(contentStr, "")

	// Remove custom entity references that could exploit XXE (e.g., &xxe;, &file;)
	// We'll remove all entity references and then restore the standard XML ones
	allEntitiesPattern := regexp.MustCompile(`&[a-zA-Z_][a-zA-Z0-9_.-]*;`)
	contentStr = allEntitiesPattern.ReplaceAllStringFunc(contentStr, func(entity string) string {
		// Allow only standard XML/HTML entities
		allowedEntities := map[string]bool{
			"&lt;":   true,
			"&gt;":   true,
			"&amp;":  true,
			"&quot;": true,
			"&apos;": true,
		}
		if allowedEntities[entity] {
			return entity
		}
		return "" // Remove custom entities
	})

	// Also remove numeric character references are generally safe but let's preserve them
	// Pattern: &#1234; or &#xABCD;

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
		// Handle href specially - COMPLETELY REMOVE all href and xlink:href attributes
		// to prevent external resource loading (SSRF, privacy leaks)
		if attr == "href" || attr == "xlink:href" {
			// Remove href/xlink:href attributes with double quotes
			attrPattern := regexp.MustCompile(`(?i)\s+` + regexp.QuoteMeta(attr) + `\s*=\s*"[^"]*"`)
			contentStr = attrPattern.ReplaceAllString(contentStr, "")

			// Remove href/xlink:href attributes with single quotes
			attrPattern2 := regexp.MustCompile(`(?i)\s+` + regexp.QuoteMeta(attr) + `\s*=\s*'[^']*'`)
			contentStr = attrPattern2.ReplaceAllString(contentStr, "")

			// Remove href/xlink:href attributes without quotes
			attrPattern3 := regexp.MustCompile(`(?i)\s+` + regexp.QuoteMeta(attr) + `\s*=\s*[^\s>]+`)
			contentStr = attrPattern3.ReplaceAllString(contentStr, "")
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

	// Security Layer 0: Explicitly reject SVG files with friendly error message
	contentType := header.Header.Get("Content-Type")
	fileExt := strings.ToLower(filepath.Ext(header.Filename))

	if contentType == "image/svg+xml" || fileExt == ".svg" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "SVG 文件由于安全原因不允许上传。请使用 PNG、JPEG、WebP 或 GIF 格式代替。",
		})
		return
	}

	// Check content type
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
		".jpg": true, ".jpeg": true, ".png": true, ".gif": true,
		// ".webp": 已禁止
		// ".svg": 已禁止 (安全原因)
		".mp4": true, ".avi": true, ".mov": true,
		// ".webm": 已禁止
		// ".ogg": 已禁止
	}
	if !allowedExtensions[ext] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File extension not allowed"})
		return
	}

	// Security Layer 4: Strip metadata from images to prevent XSS via EXIF/tEXt/Comment blocks
	if mediaType == models.MediaTypeImage && contentType != "image/svg+xml" {
		cleanContent, err := stripImageMetadata(fileContent, contentType)
		if err != nil {
			fmt.Printf("Warning: Failed to strip metadata from %s: %v (uploading original)\n", header.Filename, err)
			// Continue with original content if stripping fails (graceful degradation)
		} else {
			fileContent = cleanContent
			fmt.Printf("Metadata stripped from image: %s (JPEG EXIF/PNG tEXt/GIF Comment removed)\n", header.Filename)
		}
	}

	// Security Layer 5: Sanitize SVG content if it's an SVG file
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

	// Security Layer 6: Set strict security response headers for all media files
	ext := strings.ToLower(filepath.Ext(fileName))

	// Prevent MIME type sniffing (critical for preventing MIME confusion attacks)
	c.Header("X-Content-Type-Options", "nosniff")

	// Prevent clickjacking
	c.Header("X-Frame-Options", "DENY")

	// Apply strict CSP to ALL media files to prevent any potential script execution
	// This protects against metadata-based XSS attacks in JPEG EXIF, PNG tEXt, MP4 metadata, etc.
	if subDir == "images" {
		if ext == ".svg" {
			// Extra strict CSP for SVG files
			c.Header("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; script-src 'none'")
			c.Header("Content-Type", "image/svg+xml")
			c.Header("Content-Disposition", fmt.Sprintf("inline; filename=\"%s\"", fileName))
		} else {
			// Strict CSP for all other images (JPEG, PNG, GIF)
			// Even though metadata is stripped, defense in depth
			c.Header("Content-Security-Policy", "default-src 'none'; img-src 'self'; script-src 'none'; style-src 'none'")
		}
	} else if subDir == "videos" {
		// Strict CSP for video files to prevent script execution from metadata
		c.Header("Content-Security-Policy", "default-src 'none'; media-src 'self'; script-src 'none'; style-src 'none'")
	}

	c.File(filePath)
}
