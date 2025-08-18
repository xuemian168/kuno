package services

import (
	"blog-backend/internal/models"
	"encoding/json"
	"fmt"
	"gorm.io/gorm"
	"math"
	"regexp"
	"strings"
	"time"
	"unicode/utf8"
)

// SEOAnalyzerService provides comprehensive SEO analysis functionality
type SEOAnalyzerService struct {
	// Add dependencies here if needed
}

// NewSEOAnalyzerService creates a new SEO analyzer service
func NewSEOAnalyzerService() *SEOAnalyzerService {
	return &SEOAnalyzerService{}
}

// AnalyzeContent performs comprehensive SEO analysis of content
func (s *SEOAnalyzerService) AnalyzeContent(article *models.Article, focusKeyword string, language string) (*models.SEOAnalysisResult, error) {
	// Extract content components
	title := article.SEOTitle
	if title == "" {
		title = article.Title
	}

	description := article.SEODescription
	content := article.Content

	// Perform individual analyses
	titleAnalysis := s.analyzeTitleSEO(title, focusKeyword, language)
	descriptionAnalysis := s.analyzeDescriptionSEO(description, focusKeyword, language)
	contentAnalysis := s.analyzeContentSEO(content, focusKeyword, language)
	keywordAnalysis := s.analyzeKeywordUsage(title, description, content, focusKeyword, language)
	readabilityAnalysis := s.analyzeReadability(content, language)
	technicalAnalysis := s.analyzeTechnicalSEO(article)

	// Calculate overall score
	overallScore := s.calculateOverallScore(titleAnalysis, descriptionAnalysis, contentAnalysis, keywordAnalysis, readabilityAnalysis, technicalAnalysis)

	// Generate comprehensive suggestions
	suggestions := s.generateSuggestions(titleAnalysis, descriptionAnalysis, contentAnalysis, keywordAnalysis, readabilityAnalysis, technicalAnalysis)

	return &models.SEOAnalysisResult{
		OverallScore:        overallScore,
		TitleAnalysis:       titleAnalysis,
		DescriptionAnalysis: descriptionAnalysis,
		ContentAnalysis:     contentAnalysis,
		KeywordAnalysis:     keywordAnalysis,
		ReadabilityAnalysis: readabilityAnalysis,
		TechnicalAnalysis:   technicalAnalysis,
		Suggestions:         suggestions,
		CreatedAt:           time.Now(),
	}, nil
}

// analyzeTitleSEO analyzes SEO title quality
func (s *SEOAnalyzerService) analyzeTitleSEO(title, focusKeyword, language string) models.TitleAnalysis {
	analysis := models.TitleAnalysis{
		Length:          utf8.RuneCountInString(title),
		OptimalLength:   models.Range{Min: 30, Max: 60},
		HasFocusKeyword: s.containsKeyword(title, focusKeyword),
		BrandIncluded:   false, // This would need brand detection logic
		Uniqueness:      0.9,   // This would need database comparison
		Issues:          []string{},
		Suggestions:     []string{},
	}

	// Length scoring
	lengthScore := 100
	if analysis.Length < 30 {
		lengthScore = 60
		analysis.Issues = append(analysis.Issues, "标题太短，建议至少30个字符")
		analysis.Suggestions = append(analysis.Suggestions, "增加关键词或描述性词语来丰富标题")
	} else if analysis.Length > 60 {
		lengthScore = 70
		analysis.Issues = append(analysis.Issues, "标题太长，可能在搜索结果中被截断")
		analysis.Suggestions = append(analysis.Suggestions, "精简标题，保持在60个字符以内")
	}

	// Keyword scoring
	keywordScore := 100
	if !analysis.HasFocusKeyword && focusKeyword != "" {
		keywordScore = 40
		analysis.Issues = append(analysis.Issues, "标题中缺少焦点关键词")
		analysis.Suggestions = append(analysis.Suggestions, fmt.Sprintf("在标题中包含关键词：%s", focusKeyword))
	}

	// Calculate final score
	analysis.Score = (lengthScore + keywordScore) / 2

	return analysis
}

// analyzeDescriptionSEO analyzes meta description quality
func (s *SEOAnalyzerService) analyzeDescriptionSEO(description, focusKeyword, language string) models.DescriptionAnalysis {
	analysis := models.DescriptionAnalysis{
		Length:          utf8.RuneCountInString(description),
		OptimalLength:   models.Range{Min: 120, Max: 160},
		HasFocusKeyword: s.containsKeyword(description, focusKeyword),
		HasCallToAction: s.hasCallToAction(description, language),
		Uniqueness:      0.9,
		Issues:          []string{},
		Suggestions:     []string{},
	}

	// Length scoring
	lengthScore := 100
	if analysis.Length == 0 {
		lengthScore = 0
		analysis.Issues = append(analysis.Issues, "缺少元描述")
		analysis.Suggestions = append(analysis.Suggestions, "添加120-160字符的元描述")
	} else if analysis.Length < 120 {
		lengthScore = 70
		analysis.Issues = append(analysis.Issues, "元描述太短")
		analysis.Suggestions = append(analysis.Suggestions, "增加描述内容，突出文章价值")
	} else if analysis.Length > 160 {
		lengthScore = 70
		analysis.Issues = append(analysis.Issues, "元描述太长，可能被截断")
		analysis.Suggestions = append(analysis.Suggestions, "精简描述，保持在160字符以内")
	}

	// Keyword scoring
	keywordScore := 100
	if !analysis.HasFocusKeyword && focusKeyword != "" {
		keywordScore = 60
		analysis.Issues = append(analysis.Issues, "元描述中缺少焦点关键词")
		analysis.Suggestions = append(analysis.Suggestions, "在描述中自然地包含关键词")
	}

	// Call to action scoring
	ctaScore := 100
	if !analysis.HasCallToAction {
		ctaScore = 80
		analysis.Suggestions = append(analysis.Suggestions, "考虑添加行动号召词语，如：了解更多、立即查看等")
	}

	// Calculate final score
	analysis.Score = (lengthScore + keywordScore + ctaScore) / 3

	return analysis
}

// analyzeContentSEO analyzes content quality and structure
func (s *SEOAnalyzerService) analyzeContentSEO(content, focusKeyword, language string) models.ContentAnalysis {
	// Clean content from markdown
	cleanContent := s.stripMarkdown(content)
	words := strings.Fields(cleanContent)
	wordCount := len(words)

	// Analyze heading structure
	headingStructure := s.analyzeHeadingStructure(content, focusKeyword)

	// Calculate keyword density
	keywordDensity := s.calculateKeywordDensity(cleanContent, focusKeyword)

	// Count links
	internalLinks := s.countInternalLinks(content)
	externalLinks := s.countExternalLinks(content)

	// Analyze images
	imageOptimization := s.analyzeImageOptimization(content)

	analysis := models.ContentAnalysis{
		WordCount:         wordCount,
		ParagraphCount:    strings.Count(content, "\n\n") + 1,
		HeadingStructure:  headingStructure,
		KeywordDensity:    keywordDensity,
		InternalLinks:     internalLinks,
		ExternalLinks:     externalLinks,
		ImageOptimization: imageOptimization,
		Issues:            []string{},
		Suggestions:       []string{},
	}

	// Word count scoring
	contentScore := 100
	if wordCount < 300 {
		contentScore = 60
		analysis.Issues = append(analysis.Issues, "内容太短，建议至少300字")
		analysis.Suggestions = append(analysis.Suggestions, "扩展内容，提供更详细的信息")
	} else if wordCount > 3000 {
		contentScore = 90
		analysis.Suggestions = append(analysis.Suggestions, "考虑将长文章分割成系列文章")
	}

	// Links scoring
	if internalLinks == 0 {
		analysis.Issues = append(analysis.Issues, "缺少内部链接")
		analysis.Suggestions = append(analysis.Suggestions, "添加2-3个相关文章的内部链接")
	}

	if externalLinks == 0 {
		analysis.Suggestions = append(analysis.Suggestions, "考虑添加权威来源的外部链接")
	}

	analysis.Score = contentScore

	return analysis
}

// analyzeKeywordUsage analyzes keyword usage across all content
func (s *SEOAnalyzerService) analyzeKeywordUsage(title, description, content, focusKeyword, language string) models.KeywordAnalysis {
	if focusKeyword == "" {
		return models.KeywordAnalysis{
			Score:       50,
			Issues:      []string{"未设置焦点关键词"},
			Suggestions: []string{"设置一个主要关键词来优化内容"},
		}
	}

	// Count keyword usage
	cleanContent := s.stripMarkdown(content)
	allText := title + " " + description + " " + cleanContent
	totalWords := len(strings.Fields(allText))
	keywordCount := s.countKeywordOccurrences(allText, focusKeyword)

	density := float64(keywordCount) / float64(totalWords) * 100

	// Analyze distribution
	distribution := []models.KeywordDistribution{
		{
			Keyword:  focusKeyword,
			Title:    s.countKeywordOccurrences(title, focusKeyword),
			Headings: s.countKeywordInHeadings(content, focusKeyword),
			Content:  s.countKeywordOccurrences(cleanContent, focusKeyword),
			Meta:     s.countKeywordOccurrences(description, focusKeyword),
		},
	}

	analysis := models.KeywordAnalysis{
		FocusKeywordUsage:    keywordCount,
		KeywordDistribution:  distribution,
		KeywordDensity:       density,
		OptimalDensity:       models.Range{Min: 50, Max: 250}, // 0.5% to 2.5%
		RelatedKeywordsFound: 0,                               // Would need semantic analysis
		Issues:               []string{},
		Suggestions:          []string{},
	}

	// Density scoring
	score := 100
	if density < 0.5 {
		score = 60
		analysis.Issues = append(analysis.Issues, "关键词密度过低")
		analysis.Suggestions = append(analysis.Suggestions, "适当增加关键词使用频率")
	} else if density > 2.5 {
		score = 50
		analysis.Issues = append(analysis.Issues, "关键词密度过高，可能被视为堆砌")
		analysis.Suggestions = append(analysis.Suggestions, "减少关键词使用，使内容更自然")
	}

	// Distribution scoring
	if distribution[0].Title == 0 {
		score -= 20
		analysis.Issues = append(analysis.Issues, "标题中缺少关键词")
	}

	if distribution[0].Headings == 0 {
		score -= 10
		analysis.Suggestions = append(analysis.Suggestions, "在副标题中包含关键词")
	}

	analysis.Score = score

	return analysis
}

// analyzeReadability analyzes content readability
func (s *SEOAnalyzerService) analyzeReadability(content, language string) models.ReadabilityAnalysis {
	cleanContent := s.stripMarkdown(content)
	sentences := s.splitIntoSentences(cleanContent)
	words := strings.Fields(cleanContent)
	paragraphs := strings.Split(cleanContent, "\n\n")

	// Calculate metrics
	avgSentenceLength := float64(len(words)) / float64(len(sentences))
	avgParagraphLength := float64(len(words)) / float64(len(paragraphs))

	analysis := models.ReadabilityAnalysis{
		ReadingLevel:              "Grade 8-9", // Simplified
		AvgSentenceLength:         avgSentenceLength,
		AvgParagraphLength:        avgParagraphLength,
		PassiveVoicePercentage:    s.calculatePassiveVoice(sentences),
		TransitionWordsPercentage: s.calculateTransitionWords(cleanContent, language),
		Issues:                    []string{},
		Suggestions:               []string{},
	}

	// Scoring
	score := 100

	if avgSentenceLength > 20 {
		score -= 15
		analysis.Issues = append(analysis.Issues, "句子平均长度过长")
		analysis.Suggestions = append(analysis.Suggestions, "使用更短的句子提高可读性")
	}

	if avgParagraphLength > 100 {
		score -= 10
		analysis.Issues = append(analysis.Issues, "段落过长")
		analysis.Suggestions = append(analysis.Suggestions, "将长段落分成更短的段落")
	}

	if analysis.PassiveVoicePercentage > 25 {
		score -= 10
		analysis.Issues = append(analysis.Issues, "被动语态使用过多")
		analysis.Suggestions = append(analysis.Suggestions, "使用更多主动语态")
	}

	analysis.Score = score

	return analysis
}

// analyzeTechnicalSEO analyzes technical SEO aspects
func (s *SEOAnalyzerService) analyzeTechnicalSEO(article *models.Article) models.TechnicalAnalysis {
	urlStructure := s.analyzeURLStructure(article.SEOSlug)
	metaTags := s.analyzeMetaTags(article)
	schema := s.analyzeSchema() // Basic schema analysis

	analysis := models.TechnicalAnalysis{
		URLStructure: urlStructure,
		MetaTags:     metaTags,
		Schema:       schema,
		Issues:       []string{},
		Suggestions:  []string{},
	}

	// Calculate score based on sub-analyses
	analysis.Score = (urlStructure.Score + metaTags.Score + schema.Score) / 3

	return analysis
}

// Helper methods

func (s *SEOAnalyzerService) containsKeyword(text, keyword string) bool {
	if keyword == "" {
		return false
	}
	return strings.Contains(strings.ToLower(text), strings.ToLower(keyword))
}

func (s *SEOAnalyzerService) hasCallToAction(text, language string) bool {
	// Simplified CTA detection
	ctaWords := []string{"了解", "查看", "阅读", "点击", "获取", "下载", "立即", "马上"}
	if language == "en" {
		ctaWords = []string{"learn", "discover", "read", "click", "get", "download", "now", "today"}
	}

	textLower := strings.ToLower(text)
	for _, word := range ctaWords {
		if strings.Contains(textLower, word) {
			return true
		}
	}
	return false
}

func (s *SEOAnalyzerService) stripMarkdown(content string) string {
	// Remove markdown syntax (simplified)
	re := regexp.MustCompile(`[#*_\[\]()!]`)
	return re.ReplaceAllString(content, "")
}

func (s *SEOAnalyzerService) analyzeHeadingStructure(content, focusKeyword string) models.HeadingStructure {
	h1Count := strings.Count(content, "# ")
	h2Count := strings.Count(content, "## ")
	h3Count := strings.Count(content, "### ")

	hasKeywordInHeadings := strings.Contains(content, "# "+focusKeyword) ||
		strings.Contains(content, "## "+focusKeyword) ||
		strings.Contains(content, "### "+focusKeyword)

	score := 100
	issues := []string{}

	if h1Count == 0 {
		score -= 30
		issues = append(issues, "缺少H1标题")
	} else if h1Count > 1 {
		score -= 20
		issues = append(issues, "H1标题过多")
	}

	if h2Count == 0 {
		score -= 20
		issues = append(issues, "缺少H2副标题")
	}

	return models.HeadingStructure{
		H1Count:              h1Count,
		H2Count:              h2Count,
		H3Count:              h3Count,
		StructureScore:       score,
		HasKeywordInHeadings: hasKeywordInHeadings,
		Issues:               issues,
	}
}

func (s *SEOAnalyzerService) calculateKeywordDensity(content, keyword string) []models.KeywordDensity {
	if keyword == "" {
		return []models.KeywordDensity{}
	}

	words := strings.Fields(content)
	count := s.countKeywordOccurrences(content, keyword)
	density := float64(count) / float64(len(words)) * 100

	return []models.KeywordDensity{
		{
			Keyword: keyword,
			Count:   count,
			Density: density,
		},
	}
}

func (s *SEOAnalyzerService) countKeywordOccurrences(text, keyword string) int {
	if keyword == "" {
		return 0
	}
	return strings.Count(strings.ToLower(text), strings.ToLower(keyword))
}

func (s *SEOAnalyzerService) countKeywordInHeadings(content, keyword string) int {
	if keyword == "" {
		return 0
	}

	headingPattern := regexp.MustCompile(`(?m)^#{1,6}\s+(.*)$`)
	matches := headingPattern.FindAllString(content, -1)

	count := 0
	for _, match := range matches {
		if strings.Contains(strings.ToLower(match), strings.ToLower(keyword)) {
			count++
		}
	}

	return count
}

func (s *SEOAnalyzerService) countInternalLinks(content string) int {
	// Simplified - count markdown links that don't start with http
	linkPattern := regexp.MustCompile(`\[([^\]]+)\]\(([^)]+)\)`)
	matches := linkPattern.FindAllStringSubmatch(content, -1)

	count := 0
	for _, match := range matches {
		if len(match) > 2 && !strings.HasPrefix(match[2], "http") {
			count++
		}
	}

	return count
}

func (s *SEOAnalyzerService) countExternalLinks(content string) int {
	// Count markdown links that start with http
	linkPattern := regexp.MustCompile(`\[([^\]]+)\]\((https?://[^)]+)\)`)
	return len(linkPattern.FindAllString(content, -1))
}

func (s *SEOAnalyzerService) analyzeImageOptimization(content string) models.ImageOptimization {
	// Count markdown images
	imagePattern := regexp.MustCompile(`!\[([^\]]*)\]\(([^)]+)\)`)
	matches := imagePattern.FindAllStringSubmatch(content, -1)

	totalImages := len(matches)
	imagesWithAlt := 0

	for _, match := range matches {
		if len(match) > 1 && match[1] != "" {
			imagesWithAlt++
		}
	}

	score := 100
	if totalImages > 0 && imagesWithAlt == 0 {
		score = 0
	} else if totalImages > 0 {
		score = int(float64(imagesWithAlt) / float64(totalImages) * 100)
	}

	issues := []string{}
	if totalImages > 0 && imagesWithAlt < totalImages {
		issues = append(issues, "部分图片缺少alt属性")
	}

	return models.ImageOptimization{
		TotalImages:     totalImages,
		ImagesWithAlt:   imagesWithAlt,
		ImagesWithTitle: 0, // Would need more complex parsing
		OptimizedImages: imagesWithAlt,
		Score:           score,
		Issues:          issues,
	}
}

func (s *SEOAnalyzerService) splitIntoSentences(text string) []string {
	// Simplified sentence splitting
	sentences := regexp.MustCompile(`[.!?]+`).Split(text, -1)
	result := []string{}
	for _, sentence := range sentences {
		if strings.TrimSpace(sentence) != "" {
			result = append(result, strings.TrimSpace(sentence))
		}
	}
	return result
}

func (s *SEOAnalyzerService) calculatePassiveVoice(sentences []string) float64 {
	// Simplified passive voice detection (would need more sophisticated NLP)
	passiveIndicators := []string{"被", "由", "让", "使", "遭到", "受到"}
	passiveCount := 0

	for _, sentence := range sentences {
		for _, indicator := range passiveIndicators {
			if strings.Contains(sentence, indicator) {
				passiveCount++
				break
			}
		}
	}

	if len(sentences) == 0 {
		return 0
	}

	return float64(passiveCount) / float64(len(sentences)) * 100
}

func (s *SEOAnalyzerService) calculateTransitionWords(content, language string) float64 {
	// Simplified transition word detection
	transitionWords := []string{"因此", "所以", "然而", "但是", "而且", "另外", "首先", "其次", "最后", "总之"}
	if language == "en" {
		transitionWords = []string{"therefore", "however", "moreover", "furthermore", "first", "second", "finally", "in conclusion"}
	}

	words := strings.Fields(content)
	transitionCount := 0

	for _, word := range words {
		for _, transition := range transitionWords {
			if strings.EqualFold(word, transition) {
				transitionCount++
				break
			}
		}
	}

	if len(words) == 0 {
		return 0
	}

	return float64(transitionCount) / float64(len(words)) * 100
}

func (s *SEOAnalyzerService) analyzeURLStructure(slug string) models.URLStructure {
	length := len(slug)
	hasKeywords := true // Simplified - assume slug contains keywords
	isReadable := !strings.Contains(slug, "_")
	hasUnderscore := strings.Contains(slug, "_")

	score := 100
	if length > 100 {
		score -= 20
	}
	if hasUnderscore {
		score -= 10
	}
	if length == 0 {
		score = 0
	}

	return models.URLStructure{
		Length:        length,
		HasKeywords:   hasKeywords,
		IsReadable:    isReadable,
		HasUnderscore: hasUnderscore,
		Score:         score,
	}
}

func (s *SEOAnalyzerService) analyzeMetaTags(article *models.Article) models.MetaTags {
	hasTitle := article.SEOTitle != "" || article.Title != ""
	hasDescription := article.SEODescription != ""
	hasKeywords := article.SEOKeywords != ""

	score := 0
	if hasTitle {
		score += 40
	}
	if hasDescription {
		score += 40
	}
	if hasKeywords {
		score += 20
	}

	return models.MetaTags{
		HasTitle:       hasTitle,
		HasDescription: hasDescription,
		HasKeywords:    hasKeywords,
		HasViewport:    true, // Assume this is handled by template
		HasCanonical:   true, // Assume this is handled by template
		Score:          score,
	}
}

func (s *SEOAnalyzerService) analyzeSchema() models.Schema {
	// Basic schema analysis - would need to check actual HTML output
	return models.Schema{
		HasArticleSchema: true,  // Assume this is implemented
		HasBreadcrumbs:   false, // Would need to check
		HasAuthor:        true,  // Assume this is implemented
		Score:            70,
	}
}

func (s *SEOAnalyzerService) calculateOverallScore(title models.TitleAnalysis, description models.DescriptionAnalysis, content models.ContentAnalysis, keyword models.KeywordAnalysis, readability models.ReadabilityAnalysis, technical models.TechnicalAnalysis) int {
	// Weighted average
	weights := map[string]float64{
		"title":       0.20,
		"description": 0.15,
		"content":     0.25,
		"keyword":     0.20,
		"readability": 0.10,
		"technical":   0.10,
	}

	totalScore := float64(title.Score)*weights["title"] +
		float64(description.Score)*weights["description"] +
		float64(content.Score)*weights["content"] +
		float64(keyword.Score)*weights["keyword"] +
		float64(readability.Score)*weights["readability"] +
		float64(technical.Score)*weights["technical"]

	return int(math.Round(totalScore))
}

func (s *SEOAnalyzerService) generateSuggestions(title models.TitleAnalysis, description models.DescriptionAnalysis, content models.ContentAnalysis, keyword models.KeywordAnalysis, readability models.ReadabilityAnalysis, technical models.TechnicalAnalysis) []string {
	suggestions := []string{}

	// Collect high-priority suggestions
	if title.Score < 70 {
		suggestions = append(suggestions, "优化标题："+strings.Join(title.Suggestions, "，"))
	}

	if description.Score < 70 {
		suggestions = append(suggestions, "改进元描述："+strings.Join(description.Suggestions, "，"))
	}

	if keyword.Score < 70 {
		suggestions = append(suggestions, "优化关键词使用："+strings.Join(keyword.Suggestions, "，"))
	}

	if content.Score < 70 {
		suggestions = append(suggestions, "改进内容结构："+strings.Join(content.Suggestions, "，"))
	}

	// Add general best practices
	suggestions = append(suggestions, "定期更新内容以保持新鲜度")
	suggestions = append(suggestions, "确保内容对用户有价值")

	return suggestions
}

// SaveAnalysisResult saves SEO analysis result to database
func (s *SEOAnalyzerService) SaveAnalysisResult(db *gorm.DB, articleID uint, analysis *models.SEOAnalysisResult, checkType string) error {
	// Convert analysis to JSON strings
	checkResultsJSON, _ := json.Marshal(analysis)
	suggestionsJSON, _ := json.Marshal(analysis.Suggestions)

	healthCheck := &models.SEOHealthCheck{
		ArticleID:        &articleID,
		CheckType:        checkType,
		OverallScore:     analysis.OverallScore,
		TitleScore:       analysis.TitleAnalysis.Score,
		DescriptionScore: analysis.DescriptionAnalysis.Score,
		ContentScore:     analysis.ContentAnalysis.Score,
		KeywordScore:     analysis.KeywordAnalysis.Score,
		ReadabilityScore: analysis.ReadabilityAnalysis.Score,
		TechnicalScore:   analysis.TechnicalAnalysis.Score,
		IssuesFound:      len(analysis.TitleAnalysis.Issues) + len(analysis.DescriptionAnalysis.Issues) + len(analysis.ContentAnalysis.Issues),
		CheckResults:     string(checkResultsJSON),
		Suggestions:      string(suggestionsJSON),
		Language:         "zh", // Would detect from content
		CheckDuration:    100,  // Would measure actual time
	}

	return db.Create(healthCheck).Error
}
