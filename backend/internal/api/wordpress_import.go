package api

import (
	"blog-backend/internal/database"
	"blog-backend/internal/models"
	"bytes"
	"encoding/xml"
	"fmt"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"html"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"
)

// WordPress WXR XML structures
type WXRChannel struct {
	XMLName     xml.Name      `xml:"channel"`
	Title       string        `xml:"title"`
	Link        string        `xml:"link"`
	Description string        `xml:"description"`
	PubDate     string        `xml:"pubDate"`
	Language    string        `xml:"language"`
	WXRVersion  string        `xml:"http://wordpress.org/export/1.2/ wxr_version"`
	BaseSiteURL string        `xml:"http://wordpress.org/export/1.2/ base_site_url"`
	BaseBlogURL string        `xml:"http://wordpress.org/export/1.2/ base_blog_url"`
	Authors     []WXRAuthor   `xml:"http://wordpress.org/export/1.2/ author"`
	Categories  []WXRCategory `xml:"http://wordpress.org/export/1.2/ category"`
	Tags        []WXRTag      `xml:"http://wordpress.org/export/1.2/ tag"`
	Items       []WXRItem     `xml:"item"`
}

type WXRAuthor struct {
	ID          int    `xml:"http://wordpress.org/export/1.2/ author_id"`
	Login       string `xml:"http://wordpress.org/export/1.2/ author_login"`
	Email       string `xml:"http://wordpress.org/export/1.2/ author_email"`
	DisplayName string `xml:"http://wordpress.org/export/1.2/ author_display_name"`
	FirstName   string `xml:"http://wordpress.org/export/1.2/ author_first_name"`
	LastName    string `xml:"http://wordpress.org/export/1.2/ author_last_name"`
}

type WXRCategory struct {
	TermID      int    `xml:"http://wordpress.org/export/1.2/ term_id"`
	NiceName    string `xml:"http://wordpress.org/export/1.2/ category_nicename"`
	Parent      string `xml:"http://wordpress.org/export/1.2/ category_parent"`
	Name        string `xml:"http://wordpress.org/export/1.2/ cat_name"`
	Description string `xml:"http://wordpress.org/export/1.2/ category_description"`
}

type WXRTag struct {
	TermID      int    `xml:"http://wordpress.org/export/1.2/ term_id"`
	Slug        string `xml:"http://wordpress.org/export/1.2/ tag_slug"`
	Name        string `xml:"http://wordpress.org/export/1.2/ tag_name"`
	Description string `xml:"http://wordpress.org/export/1.2/ tag_description"`
}

type WXRItem struct {
	Title        string            `xml:"title"`
	Link         string            `xml:"link"`
	PubDate      string            `xml:"pubDate"`
	Creator      string            `xml:"http://purl.org/dc/elements/1.1/ creator"`
	GUID         string            `xml:"guid"`
	Description  string            `xml:"description"`
	Content      string            `xml:"http://purl.org/rss/1.0/modules/content/ encoded"`
	Excerpt      string            `xml:"http://wordpress.org/export/1.2/excerpt/ encoded"`
	PostID       int               `xml:"http://wordpress.org/export/1.2/ post_id"`
	PostDate     string            `xml:"http://wordpress.org/export/1.2/ post_date"`
	PostDateGMT  string            `xml:"http://wordpress.org/export/1.2/ post_date_gmt"`
	PostType     string            `xml:"http://wordpress.org/export/1.2/ post_type"`
	PostStatus   string            `xml:"http://wordpress.org/export/1.2/ status"`
	PostParent   int               `xml:"http://wordpress.org/export/1.2/ post_parent"`
	MenuOrder    int               `xml:"http://wordpress.org/export/1.2/ menu_order"`
	PostPassword string            `xml:"http://wordpress.org/export/1.2/ post_password"`
	IsSticky     int               `xml:"http://wordpress.org/export/1.2/ is_sticky"`
	Categories   []WXRItemCategory `xml:"category"`
	PostMeta     []WXRPostMeta     `xml:"http://wordpress.org/export/1.2/ postmeta"`
	Comments     []WXRComment      `xml:"http://wordpress.org/export/1.2/ comment"`
}

type WXRItemCategory struct {
	Domain   string `xml:"domain,attr"`
	NiceName string `xml:"nicename,attr"`
	Value    string `xml:",chardata"`
}

type WXRPostMeta struct {
	Key   string `xml:"http://wordpress.org/export/1.2/ meta_key"`
	Value string `xml:"http://wordpress.org/export/1.2/ meta_value"`
}

type WXRComment struct {
	ID          int    `xml:"http://wordpress.org/export/1.2/ comment_id"`
	Author      string `xml:"http://wordpress.org/export/1.2/ comment_author"`
	AuthorEmail string `xml:"http://wordpress.org/export/1.2/ comment_author_email"`
	AuthorURL   string `xml:"http://wordpress.org/export/1.2/ comment_author_url"`
	AuthorIP    string `xml:"http://wordpress.org/export/1.2/ comment_author_IP"`
	Date        string `xml:"http://wordpress.org/export/1.2/ comment_date"`
	DateGMT     string `xml:"http://wordpress.org/export/1.2/ comment_date_gmt"`
	Content     string `xml:"http://wordpress.org/export/1.2/ comment_content"`
	Approved    string `xml:"http://wordpress.org/export/1.2/ comment_approved"`
	Type        string `xml:"http://wordpress.org/export/1.2/ comment_type"`
	Parent      int    `xml:"http://wordpress.org/export/1.2/ comment_parent"`
	UserID      int    `xml:"http://wordpress.org/export/1.2/ comment_user_id"`
}

// cleanXMLData removes illegal characters from XML data
func cleanXMLData(data []byte) []byte {
	// Remove null characters and other illegal XML characters
	cleaned := bytes.Map(func(r rune) rune {
		// Remove null character and other control characters except tab, newline, and carriage return
		if r == 0 || (r < 0x20 && r != 0x09 && r != 0x0A && r != 0x0D) {
			return -1 // Remove the character
		}
		// Remove invalid Unicode characters
		if r == 0xFFFD || !isValidXMLChar(r) {
			return -1
		}
		return r
	}, data)

	return cleaned
}

// isValidXMLChar checks if a rune is valid in XML
func isValidXMLChar(r rune) bool {
	return r == 0x09 || r == 0x0A || r == 0x0D ||
		(r >= 0x20 && r <= 0xD7FF) ||
		(r >= 0xE000 && r <= 0xFFFD) ||
		(r >= 0x10000 && r <= 0x10FFFF)
}

// ImportWordPress handles WordPress WXR file imports
func ImportWordPress(c *gin.Context) {
	// Parse multipart form
	err := c.Request.ParseMultipartForm(100 << 20) // 100 MB limit
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to parse form data"})
		return
	}

	// Get the uploaded file
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}
	defer file.Close()

	// Validate file type
	if !strings.HasSuffix(strings.ToLower(header.Filename), ".xml") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File must be an XML file"})
		return
	}

	// Read file content
	fileContent, err := io.ReadAll(file)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to read file"})
		return
	}

	// Clean XML data
	cleanedContent := cleanXMLData(fileContent)

	// Parse XML
	var rss struct {
		XMLName xml.Name   `xml:"rss"`
		Channel WXRChannel `xml:"channel"`
	}

	decoder := xml.NewDecoder(bytes.NewReader(cleanedContent))
	decoder.Strict = false // Be more lenient with XML parsing
	decoder.CharsetReader = func(charset string, input io.Reader) (io.Reader, error) {
		// Handle various character encodings
		return input, nil
	}

	if err := decoder.Decode(&rss); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Failed to parse XML: %v", err)})
		return
	}

	// Start database transaction
	tx := database.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	importResult := struct {
		ImportedArticles  int      `json:"imported_articles"`
		CreatedCategories int      `json:"created_categories"`
		SkippedPosts      int      `json:"skipped_posts"`
		Errors            []string `json:"errors"`
	}{
		ImportedArticles:  0,
		CreatedCategories: 0,
		SkippedPosts:      0,
		Errors:            []string{}, // Initialize as empty slice instead of nil
	}

	// Import categories first
	categoryMap := make(map[string]uint)
	for _, wxrCat := range rss.Channel.Categories {
		if wxrCat.Name == "" {
			continue
		}

		var category models.Category
		if err := tx.Where("name = ?", wxrCat.Name).First(&category).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				// Create new category
				category = models.Category{
					Name:        wxrCat.Name,
					Description: wxrCat.Description,
					DefaultLang: "zh",
				}
				if err := tx.Create(&category).Error; err != nil {
					importResult.Errors = append(importResult.Errors, fmt.Sprintf("Failed to create category '%s': %v", wxrCat.Name, err))
					continue
				}
				importResult.CreatedCategories++
			} else {
				importResult.Errors = append(importResult.Errors, fmt.Sprintf("Database error for category '%s': %v", wxrCat.Name, err))
				continue
			}
		}
		categoryMap[wxrCat.NiceName] = category.ID
	}

	// Import posts
	for _, item := range rss.Channel.Items {
		// Only import published posts (skip pages and other types)
		if item.PostType != "post" {
			importResult.SkippedPosts++
			continue
		}

		if item.PostStatus != "publish" {
			importResult.SkippedPosts++
			continue
		}

		// Skip if title is empty
		if strings.TrimSpace(item.Title) == "" {
			importResult.SkippedPosts++
			continue
		}

		// Check if article already exists (by title)
		var existingArticle models.Article
		if err := tx.Where("title = ?", item.Title).First(&existingArticle).Error; err == nil {
			importResult.SkippedPosts++
			continue
		}

		// Parse post date
		var postDate time.Time
		if item.PostDate != "" {
			if parsedDate, err := time.Parse("2006-01-02 15:04:05", item.PostDate); err == nil {
				postDate = parsedDate
			} else {
				postDate = time.Now()
			}
		} else {
			postDate = time.Now()
		}

		// Find category ID
		var categoryID uint
		for _, cat := range item.Categories {
			if cat.Domain == "category" {
				if id, exists := categoryMap[cat.NiceName]; exists {
					categoryID = id
					break
				}
			}
		}

		// Clean and process content
		content := cleanWordPressContent(item.Content)
		summary := generateSummary(item.Excerpt, content)

		// Clean and decode title
		title := html.UnescapeString(item.Title)
		if decodedTitle, err := url.QueryUnescape(title); err == nil {
			title = decodedTitle
		}

		// Create article
		article := models.Article{
			Title:       title,
			Content:     content,
			ContentType: "markdown",
			Summary:     summary,
			CategoryID:  categoryID,
			DefaultLang: "zh",
			CreatedAt:   postDate,
			UpdatedAt:   postDate,
		}

		if err := tx.Create(&article).Error; err != nil {
			importResult.Errors = append(importResult.Errors, fmt.Sprintf("Failed to create article '%s': %v", item.Title, err))
			continue
		}

		importResult.ImportedArticles++
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit import"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "WordPress import completed",
		"result":  importResult,
	})
}

// cleanWordPressContent removes WordPress-specific shortcodes and cleans HTML
func cleanWordPressContent(content string) string {
	// Unescape HTML entities
	content = html.UnescapeString(content)

	// Remove WordPress shortcodes (including caption shortcode)
	shortcodeRegex := regexp.MustCompile(`\[/?[^\]]+\]`)
	content = shortcodeRegex.ReplaceAllString(content, "")

	// Remove HTML comments
	commentRegex := regexp.MustCompile(`<!--[\s\S]*?-->`)
	content = commentRegex.ReplaceAllString(content, "")

	// Convert links
	linkRegex := regexp.MustCompile(`<a[^>]+href="([^"]+)"[^>]*>([^<]+)</a>`)
	content = linkRegex.ReplaceAllString(content, "[$2]($1)")

	// Convert images
	imgRegex := regexp.MustCompile(`<img[^>]+src="([^"]+)"[^>]*(?:alt="([^"]*)")?[^>]*>`)
	content = imgRegex.ReplaceAllStringFunc(content, func(match string) string {
		matches := imgRegex.FindStringSubmatch(match)
		if len(matches) > 2 && matches[2] != "" {
			return fmt.Sprintf("![%s](%s)", matches[2], matches[1])
		}
		return fmt.Sprintf("![](%s)", matches[1])
	})

	// Convert lists
	content = strings.ReplaceAll(content, "<ul>", "")
	content = strings.ReplaceAll(content, "</ul>", "\n")
	content = strings.ReplaceAll(content, "<ol>", "")
	content = strings.ReplaceAll(content, "</ol>", "\n")
	content = strings.ReplaceAll(content, "<li>", "- ")
	content = strings.ReplaceAll(content, "</li>", "\n")

	// Convert blockquotes
	content = strings.ReplaceAll(content, "<blockquote>", "> ")
	content = strings.ReplaceAll(content, "</blockquote>", "\n\n")

	// Convert code blocks
	codeRegex := regexp.MustCompile(`<pre[^>]*><code[^>]*>([\s\S]*?)</code></pre>`)
	content = codeRegex.ReplaceAllString(content, "```\n$1\n```")

	// Convert inline code
	inlineCodeRegex := regexp.MustCompile(`<code>([^<]+)</code>`)
	content = inlineCodeRegex.ReplaceAllString(content, "`$1`")

	// Convert common HTML to Markdown
	content = strings.ReplaceAll(content, "<strong>", "**")
	content = strings.ReplaceAll(content, "</strong>", "**")
	content = strings.ReplaceAll(content, "<b>", "**")
	content = strings.ReplaceAll(content, "</b>", "**")
	content = strings.ReplaceAll(content, "<em>", "*")
	content = strings.ReplaceAll(content, "</em>", "*")
	content = strings.ReplaceAll(content, "<i>", "*")
	content = strings.ReplaceAll(content, "</i>", "*")

	// Convert paragraphs
	content = strings.ReplaceAll(content, "<p>", "")
	content = strings.ReplaceAll(content, "</p>", "\n\n")

	// Convert headings
	for i := 1; i <= 6; i++ {
		hTag := fmt.Sprintf("<h%d>", i)
		hCloseTag := fmt.Sprintf("</h%d>", i)
		hMarkdown := strings.Repeat("#", i) + " "
		content = strings.ReplaceAll(content, hTag, hMarkdown)
		content = strings.ReplaceAll(content, hCloseTag, "\n\n")
	}

	// Convert line breaks
	content = strings.ReplaceAll(content, "<br>", "\n")
	content = strings.ReplaceAll(content, "<br/>", "\n")
	content = strings.ReplaceAll(content, "<br />", "\n")

	// Remove any remaining HTML tags
	htmlTagRegex := regexp.MustCompile(`<[^>]+>`)
	content = htmlTagRegex.ReplaceAllString(content, "")

	// Clean up extra whitespace
	content = regexp.MustCompile(`[ \t]+`).ReplaceAllString(content, " ")
	content = regexp.MustCompile(`\n[ \t]+`).ReplaceAllString(content, "\n")

	// Clean up multiple newlines
	multipleNewlineRegex := regexp.MustCompile(`\n{3,}`)
	content = multipleNewlineRegex.ReplaceAllString(content, "\n\n")

	// Remove any remaining null characters that might have slipped through
	content = strings.ReplaceAll(content, "\x00", "")

	return strings.TrimSpace(content)
}

// ParsedArticle represents an article from WordPress without database operations
type ParsedArticle struct {
	Title       string   `json:"title"`
	Content     string   `json:"content"`
	Excerpt     string   `json:"excerpt,omitempty"`
	Author      string   `json:"author,omitempty"`
	PublishDate string   `json:"publishDate,omitempty"`
	Categories  []string `json:"categories"`
	Tags        []string `json:"tags"`
	Status      string   `json:"status"`
}

// ParseResult represents the result of parsing a WordPress file
type ParseResult struct {
	Articles         []ParsedArticle `json:"articles"`
	Categories       []string        `json:"categories"`
	TotalPosts       int             `json:"total_posts"`
	PublishablePosts int             `json:"publishable_posts"`
}

// ParseWordPress handles WordPress WXR file parsing without importing
func ParseWordPress(c *gin.Context) {
	// Parse multipart form
	err := c.Request.ParseMultipartForm(100 << 20) // 100 MB limit
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to parse form data"})
		return
	}

	// Get the uploaded file
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}
	defer file.Close()

	// Validate file type
	if !strings.HasSuffix(strings.ToLower(header.Filename), ".xml") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File must be an XML file"})
		return
	}

	// Read file content
	fileContent, err := io.ReadAll(file)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to read file"})
		return
	}

	// Clean XML data
	cleanedContent := cleanXMLData(fileContent)

	// Parse XML
	var rss struct {
		XMLName xml.Name   `xml:"rss"`
		Channel WXRChannel `xml:"channel"`
	}

	decoder := xml.NewDecoder(bytes.NewReader(cleanedContent))
	decoder.Strict = false
	decoder.CharsetReader = func(charset string, input io.Reader) (io.Reader, error) {
		return input, nil
	}

	if err := decoder.Decode(&rss); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Failed to parse XML: %v", err)})
		return
	}

	// Parse categories
	var categories []string
	categorySet := make(map[string]bool)
	for _, wxrCat := range rss.Channel.Categories {
		if wxrCat.Name != "" && !categorySet[wxrCat.Name] {
			categories = append(categories, wxrCat.Name)
			categorySet[wxrCat.Name] = true
		}
	}

	// Parse articles
	var articles []ParsedArticle
	var totalPosts int
	var publishablePosts int

	for _, item := range rss.Channel.Items {
		totalPosts++

		// Skip non-post items (pages, attachments, etc.)
		if item.PostType != "post" {
			continue
		}

		// Skip empty titles
		if strings.TrimSpace(item.Title) == "" {
			continue
		}

		// Extract categories for this item
		var itemCategories []string
		var itemTags []string
		for _, cat := range item.Categories {
			if cat.Domain == "category" {
				itemCategories = append(itemCategories, cat.Value)
			} else if cat.Domain == "post_tag" {
				itemTags = append(itemTags, cat.Value)
			}
		}

		// Parse post date
		var publishDate string
		if item.PostDate != "" {
			if parsedDate, err := time.Parse("2006-01-02 15:04:05", item.PostDate); err == nil {
				publishDate = parsedDate.Format(time.RFC3339)
			}
		}

		// Clean content for preview
		content := cleanWordPressContent(item.Content)
		excerpt := ""
		if item.Excerpt != "" {
			excerpt = generateSummary(item.Excerpt, "")
		}

		// Clean and decode title
		title := html.UnescapeString(item.Title)
		if decodedTitle, err := url.QueryUnescape(title); err == nil {
			title = decodedTitle
		}

		article := ParsedArticle{
			Title:       title,
			Content:     content,
			Excerpt:     excerpt,
			Author:      item.Creator,
			PublishDate: publishDate,
			Categories:  itemCategories,
			Tags:        itemTags,
			Status:      item.PostStatus,
		}

		articles = append(articles, article)

		// Count publishable posts (posts that are published and have titles)
		if item.PostStatus == "publish" {
			publishablePosts++
		}
	}

	result := ParseResult{
		Articles:         articles,
		Categories:       categories,
		TotalPosts:       totalPosts,
		PublishablePosts: publishablePosts,
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "WordPress file parsed successfully",
		"result":  result,
	})
}

// generateSummary creates a summary from excerpt or content
func generateSummary(excerpt, content string) string {
	if excerpt != "" {
		excerpt = html.UnescapeString(excerpt)
		excerpt = regexp.MustCompile(`<[^>]+>`).ReplaceAllString(excerpt, "")
		excerpt = strings.TrimSpace(excerpt)
		if len(excerpt) > 200 {
			excerpt = excerpt[:200] + "..."
		}
		return excerpt
	}

	// Generate from content
	cleanContent := regexp.MustCompile(`<[^>]+>`).ReplaceAllString(content, "")
	cleanContent = strings.TrimSpace(cleanContent)
	if len(cleanContent) > 200 {
		cleanContent = cleanContent[:200] + "..."
	}
	return cleanContent
}
