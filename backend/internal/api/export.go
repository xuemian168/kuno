package api

import (
	"archive/zip"
	"blog-backend/internal/database"
	"blog-backend/internal/models"
	"fmt"
	"github.com/gin-gonic/gin"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

// ExportArticle exports a single article as markdown file
func ExportArticle(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid article ID"})
		return
	}

	lang := c.Query("lang")
	if lang == "" {
		lang = "zh"
	}

	var article models.Article
	if err := database.DB.Preload("Category").Preload("Translations").First(&article, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Article not found"})
		return
	}

	// Apply translation if needed
	if lang != "zh" && lang != "" {
		applyTranslation(&article, lang)
	}

	// Generate markdown content
	markdown := generateMarkdown(article)

	// Generate filename
	safeTitle := sanitizeFilename(article.Title)
	filename := fmt.Sprintf("%s.md", safeTitle)

	// Set headers for file download
	c.Header("Content-Type", "text/markdown")
	c.Header("Content-Disposition", formatContentDisposition(filename))
	c.Header("Content-Length", strconv.Itoa(len(markdown)))

	c.String(http.StatusOK, markdown)
}

// ExportArticles exports multiple articles as a zip file
func ExportArticles(c *gin.Context) {
	lang := c.Query("lang")
	if lang == "" {
		lang = "zh"
	}

	categoryID := c.Query("category_id")
	articleIDs := c.Query("article_ids") // Comma-separated list of article IDs

	var articles []models.Article
	query := database.DB.Preload("Category").Preload("Translations")

	if articleIDs != "" {
		// Export specific articles
		ids := strings.Split(articleIDs, ",")
		query = query.Where("id IN ?", ids)
	} else if categoryID != "" {
		// Export articles by category
		query = query.Where("category_id = ?", categoryID)
	} else {
		// Export all articles
		// No additional filter needed
	}

	if err := query.Find(&articles).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch articles"})
		return
	}

	if len(articles) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "No articles found"})
		return
	}

	// Create zip file in memory
	c.Header("Content-Type", "application/zip")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"articles-export-%s.zip\"", time.Now().Format("2006-01-02")))

	zipWriter := zip.NewWriter(c.Writer)
	defer zipWriter.Close()

	for _, article := range articles {
		// Apply translation if needed
		if lang != "zh" && lang != "" {
			applyTranslation(&article, lang)
		}

		// Generate markdown content
		markdown := generateMarkdown(article)

		// Generate filename
		safeTitle := sanitizeFilename(article.Title)
		filename := fmt.Sprintf("%s.md", safeTitle)

		// Create file in zip
		fileWriter, err := zipWriter.Create(filename)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create zip file"})
			return
		}

		// Write markdown content to zip file
		_, err = fileWriter.Write([]byte(markdown))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to write to zip file"})
			return
		}
	}
}

// ExportAllArticles exports all articles as a zip file organized by category
func ExportAllArticles(c *gin.Context) {
	lang := c.Query("lang")
	if lang == "" {
		lang = "zh"
	}

	var articles []models.Article
	if err := database.DB.Preload("Category").Preload("Translations").Find(&articles).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch articles"})
		return
	}

	if len(articles) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "No articles found"})
		return
	}

	// Create zip file in memory
	c.Header("Content-Type", "application/zip")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"blog-export-%s.zip\"", time.Now().Format("2006-01-02")))

	zipWriter := zip.NewWriter(c.Writer)
	defer zipWriter.Close()

	for _, article := range articles {
		// Apply translation if needed
		if lang != "zh" && lang != "" {
			applyTranslation(&article, lang)
		}

		// Generate markdown content
		markdown := generateMarkdown(article)

		// Generate filename with category folder
		safeTitle := sanitizeFilename(article.Title)
		safeCategoryName := sanitizeFilename(article.Category.Name)
		filename := fmt.Sprintf("%s/%s.md", safeCategoryName, safeTitle)

		// Create file in zip
		fileWriter, err := zipWriter.Create(filename)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create zip file"})
			return
		}

		// Write markdown content to zip file
		_, err = fileWriter.Write([]byte(markdown))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to write to zip file"})
			return
		}
	}
}

// generateMarkdown generates markdown content from article
func generateMarkdown(article models.Article) string {
	var builder strings.Builder

	// Write front matter (YAML header)
	builder.WriteString("---\n")
	builder.WriteString(fmt.Sprintf("title: \"%s\"\n", strings.ReplaceAll(article.Title, "\"", "\\\"")))
	builder.WriteString(fmt.Sprintf("category: \"%s\"\n", article.Category.Name))
	builder.WriteString(fmt.Sprintf("date: \"%s\"\n", article.CreatedAt.Format("2006-01-02 15:04:05")))
	if article.Summary != "" {
		builder.WriteString(fmt.Sprintf("summary: \"%s\"\n", strings.ReplaceAll(article.Summary, "\"", "\\\"")))
	}
	if article.ViewCount > 0 {
		builder.WriteString(fmt.Sprintf("views: %d\n", article.ViewCount))
	}
	builder.WriteString("---\n\n")

	// Write title as H1
	builder.WriteString(fmt.Sprintf("# %s\n\n", article.Title))

	// Write summary if exists
	if article.Summary != "" {
		builder.WriteString(fmt.Sprintf("*%s*\n\n", article.Summary))
	}

	// Write main content
	builder.WriteString(article.Content)

	// Add metadata footer
	builder.WriteString("\n\n---\n")
	builder.WriteString(fmt.Sprintf("**Published:** %s  \n", article.CreatedAt.Format("2006-01-02 15:04:05")))
	builder.WriteString(fmt.Sprintf("**Category:** %s  \n", article.Category.Name))
	if article.ViewCount > 0 {
		builder.WriteString(fmt.Sprintf("**Views:** %d  \n", article.ViewCount))
	}

	return builder.String()
}

// sanitizeFilename removes or replaces invalid characters for filenames
func sanitizeFilename(filename string) string {
	// Replace invalid characters with underscores
	invalidChars := []string{"/", "\\", ":", "*", "?", "\"", "<", ">", "|"}
	result := filename

	for _, char := range invalidChars {
		result = strings.ReplaceAll(result, char, "_")
	}

	// Trim spaces and dots from the end
	result = strings.TrimRight(result, " .")

	// Limit filename length to 100 characters
	if len(result) > 100 {
		result = result[:100]
	}

	// Ensure filename is not empty
	if result == "" {
		result = "untitled"
	}

	return result
}

// formatContentDisposition formats Content-Disposition header with proper UTF-8 encoding for non-ASCII filenames
func formatContentDisposition(filename string) string {
	// Check if filename contains non-ASCII characters
	hasNonASCII := false
	for _, r := range filename {
		if r > 127 {
			hasNonASCII = true
			break
		}
	}
	
	if !hasNonASCII {
		// Simple case: ASCII-only filename
		return fmt.Sprintf("attachment; filename=\"%s\"", filename)
	}
	
	// Complex case: filename contains non-ASCII characters
	// Use RFC 5987 format: filename*=UTF-8''encoded_filename
	encodedFilename := url.QueryEscape(filename)
	return fmt.Sprintf("attachment; filename=\"%s\"; filename*=UTF-8''%s", 
		sanitizeFilenameASCII(filename), encodedFilename)
}

// sanitizeFilenameASCII creates an ASCII-safe fallback filename
func sanitizeFilenameASCII(filename string) string {
	var result strings.Builder
	for _, r := range filename {
		if r <= 127 && r >= 32 && r != '"' && r != '\\' {
			result.WriteRune(r)
		} else {
			result.WriteRune('_')
		}
	}
	
	fallback := result.String()
	if fallback == "" || fallback == "_" {
		return "file"
	}
	return fallback
}
