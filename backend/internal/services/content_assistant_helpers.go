package services

import (
	"blog-backend/internal/database"
	"blog-backend/internal/models"
	"encoding/json"
	"fmt"
	"math"
	"math/rand"
	"regexp"
	"sort"
	"strings"
	"time"
)

// ContentPattern represents a pattern found in existing content
type ContentPattern struct {
	Topic      string    `json:"topic"`
	Keywords   []string  `json:"keywords"`
	Frequency  int       `json:"frequency"`
	Relevance  float64   `json:"relevance"`
	LastUsed   time.Time `json:"last_used"`
	Articles   []uint    `json:"articles"`
	AvgLength  int       `json:"avg_length"`
	Difficulty string    `json:"difficulty"`
}

// generateWritingRecommendations creates writing suggestions based on gaps and clusters
func (ca *ContentAssistant) generateWritingRecommendations(gaps []TopicGap, clusters []TopicCluster, language string) ([]WritingIdea, error) {
	var recommendations []WritingIdea

	// Generate ideas from topic gaps
	for _, gap := range gaps {
		for i, title := range gap.SuggestedTitles {
			if i >= 2 { // Limit to 2 ideas per gap
				break
			}

			idea := WritingIdea{
				Title:           title,
				Description:     gap.Description,
				Category:        ca.inferCategory(gap.Keywords),
				Keywords:        gap.Keywords,
				DifficultyLevel: ca.inferDifficulty(gap.Keywords),
				EstimatedLength: ca.estimateLengthFromKeywords(gap.Keywords),
				Inspiration:     fmt.Sprintf("Fill content gap: %s", gap.Topic),
				Language:        language,
				RelevanceScore:  gap.Priority,
			}
			recommendations = append(recommendations, idea)
		}
	}

	// Generate trending topic ideas
	trendingIdeas := ca.generateTrendingIdeas(clusters, language)
	recommendations = append(recommendations, trendingIdeas...)

	// Generate seasonal ideas
	seasonalIdeas := ca.generateSeasonalIdeas(language)
	recommendations = append(recommendations, seasonalIdeas...)

	// Sort by relevance score
	sort.Slice(recommendations, func(i, j int) bool {
		return recommendations[i].RelevanceScore > recommendations[j].RelevanceScore
	})

	// Limit to top 10 recommendations
	if len(recommendations) > 10 {
		recommendations = recommendations[:10]
	}

	return recommendations, nil
}

// analyzeContentPatterns analyzes patterns in existing articles
func (ca *ContentAssistant) analyzeContentPatterns(articles []models.Article) []ContentPattern {
	keywordFreq := make(map[string]*ContentPattern)

	for _, article := range articles {
		keywords := ca.extractKeywords(article.Title+" "+article.Summary, article.DefaultLang)

		for _, keyword := range keywords {
			if pattern, exists := keywordFreq[keyword]; exists {
				pattern.Frequency++
				pattern.Articles = append(pattern.Articles, article.ID)
				pattern.AvgLength = (pattern.AvgLength + len(article.Content)) / 2
				if article.CreatedAt.After(pattern.LastUsed) {
					pattern.LastUsed = article.CreatedAt
				}
			} else {
				keywordFreq[keyword] = &ContentPattern{
					Topic:      keyword,
					Keywords:   []string{keyword},
					Frequency:  1,
					Relevance:  1.0,
					LastUsed:   article.CreatedAt,
					Articles:   []uint{article.ID},
					AvgLength:  len(article.Content),
					Difficulty: "intermediate",
				}
			}
		}
	}

	// Convert to slice and calculate relevance scores
	var patterns []ContentPattern
	for _, pattern := range keywordFreq {
		// Calculate relevance based on frequency and recency
		daysSinceUsed := time.Since(pattern.LastUsed).Hours() / 24
		recencyScore := math.Exp(-daysSinceUsed / 30) // Decay over 30 days
		pattern.Relevance = (float64(pattern.Frequency) * recencyScore) / float64(len(articles))
		patterns = append(patterns, *pattern)
	}

	// Sort by relevance
	sort.Slice(patterns, func(i, j int) bool {
		return patterns[i].Relevance > patterns[j].Relevance
	})

	return patterns
}

// generateIdeaTitle creates a compelling title for a writing idea
func (ca *ContentAssistant) generateIdeaTitle(pattern ContentPattern, language string) string {
	templates := ca.getTitleTemplates(language)

	// Choose template based on content type
	template := templates[rand.Intn(len(templates))]

	// Replace placeholders
	title := strings.ReplaceAll(template, "{keyword}", pattern.Topic)
	title = strings.ReplaceAll(title, "{topic}", pattern.Topic)

	return title
}

// generateIdeaDescription creates a description for a writing idea
func (ca *ContentAssistant) generateIdeaDescription(pattern ContentPattern, language string) string {
	if language == "zh" {
		return fmt.Sprintf("探讨%s的深入分析，基于%d篇相关文章的见解。平均文章长度：%d字。",
			pattern.Topic, pattern.Frequency, pattern.AvgLength)
	} else {
		return fmt.Sprintf("An in-depth exploration of %s, based on insights from %d related articles. Average article length: %d words.",
			pattern.Topic, pattern.Frequency, pattern.AvgLength)
	}
}

// generateInspiration creates inspiration text for why this idea is relevant
func (ca *ContentAssistant) generateInspiration(pattern ContentPattern, language string) string {
	daysSince := int(time.Since(pattern.LastUsed).Hours() / 24)

	if language == "zh" {
		if daysSince < 7 {
			return fmt.Sprintf("这是一个热门话题，最近%d天内有文章涉及", daysSince)
		} else if daysSince < 30 {
			return fmt.Sprintf("这个话题有潜力，%d天前最后涉及，可以提供新视角", daysSince)
		} else {
			return fmt.Sprintf("这个话题值得重新审视，已经%d天没有相关内容", daysSince)
		}
	} else {
		if daysSince < 7 {
			return fmt.Sprintf("This is a trending topic with articles published %d days ago", daysSince)
		} else if daysSince < 30 {
			return fmt.Sprintf("This topic has potential, last covered %d days ago with room for new perspectives", daysSince)
		} else {
			return fmt.Sprintf("This topic deserves a fresh take, no content for %d days", daysSince)
		}
	}
}

// estimateDifficulty estimates the difficulty level of a content pattern
func (ca *ContentAssistant) estimateDifficulty(pattern ContentPattern) string {
	if pattern.AvgLength < 500 {
		return "beginner"
	} else if pattern.AvgLength < 1500 {
		return "intermediate"
	} else {
		return "advanced"
	}
}

// estimateLength estimates article length from pattern
func (ca *ContentAssistant) estimateLength(pattern ContentPattern) int {
	// Return average length with some variation
	variation := int(float64(pattern.AvgLength) * 0.2)
	return pattern.AvgLength + rand.Intn(variation*2) - variation
}

// extractKeyPhrases extracts important phrases from content
func (ca *ContentAssistant) extractKeyPhrases(content string, language string) []string {
	// Simple n-gram extraction (2-3 words)
	words := ca.tokenizeText(content, language)
	var phrases []string

	// For CJK languages, adjust minimum word length
	minLength := 2
	if language == "zh" || language == "ja" {
		minLength = 1 // Chinese/Japanese characters can be meaningful individually
	}

	// Extract individual words as potential phrases for CJK languages
	if language == "zh" || language == "ja" {
		for _, word := range words {
			if len(word) >= minLength {
				phrases = append(phrases, word)
			}
		}
	}

	// Extract 2-grams
	for i := 0; i < len(words)-1; i++ {
		if len(words[i]) >= minLength && len(words[i+1]) >= minLength {
			phrase := words[i] + " " + words[i+1]
			phrases = append(phrases, phrase)
		}
	}

	// Extract 3-grams
	for i := 0; i < len(words)-2; i++ {
		if len(words[i]) >= minLength && len(words[i+1]) >= minLength && len(words[i+2]) >= minLength {
			phrase := words[i] + " " + words[i+1] + " " + words[i+2]
			phrases = append(phrases, phrase)
		}
	}

	// Score and rank phrases
	phraseScores := make(map[string]int)
	for _, phrase := range phrases {
		phraseScores[phrase]++
	}

	// Sort by frequency
	type phraseScore struct {
		phrase string
		score  int
	}

	var scored []phraseScore
	for phrase, score := range phraseScores {
		if score > 1 { // Only phrases that appear multiple times
			scored = append(scored, phraseScore{phrase, score})
		}
	}

	sort.Slice(scored, func(i, j int) bool {
		return scored[i].score > scored[j].score
	})

	// Return top phrases
	var result []string
	for i, ps := range scored {
		if i >= 10 { // Limit to top 10
			break
		}
		result = append(result, ps.phrase)
	}

	return result
}

// generateSemanticTags generates tags using semantic analysis
func (ca *ContentAssistant) generateSemanticTags(content string, language string) ([]SmartTag, error) {
	// Use embeddings to find similar content and extract tags
	if ca.embeddingService == nil {
		return []SmartTag{}, nil
	}

	// Generate embedding for content
	embedding, _, err := ca.embeddingService.GenerateEmbedding(content)
	if err != nil {
		return []SmartTag{}, err
	}

	// Find similar articles
	var embeddings []models.ArticleEmbedding
	if err := database.DB.Preload("Article").Where("language = ?", language).
		Find(&embeddings).Error; err != nil {
		return []SmartTag{}, err
	}

	var tags []SmartTag
	similarities := make([]struct {
		embedding  models.ArticleEmbedding
		similarity float64
	}, 0)

	// Calculate similarities
	for _, emb := range embeddings {
		var storedEmbedding []float64
		if err := json.Unmarshal([]byte(emb.Embedding), &storedEmbedding); err != nil {
			continue
		}

		similarity := ca.cosineSimilarity(embedding, storedEmbedding)
		if similarity > 0.7 { // Only highly similar articles
			similarities = append(similarities, struct {
				embedding  models.ArticleEmbedding
				similarity float64
			}{emb, similarity})
		}
	}

	// Sort by similarity
	sort.Slice(similarities, func(i, j int) bool {
		return similarities[i].similarity > similarities[j].similarity
	})

	// Extract tags from similar articles
	tagFreq := make(map[string]float64)
	for i, sim := range similarities {
		if i >= 5 { // Use top 5 similar articles
			break
		}

		// Extract keywords from similar articles
		keywords := ca.extractKeywords(sim.embedding.Article.Title+" "+sim.embedding.Article.Summary, language)
		for _, keyword := range keywords {
			tagFreq[keyword] += sim.similarity
		}
	}

	// Convert to SmartTag format
	for tag, confidence := range tagFreq {
		if confidence > 0.5 { // Only confident tags
			tags = append(tags, SmartTag{
				Tag:        tag,
				Confidence: confidence,
				Type:       "semantic",
				Context:    "derived from similar content",
			})
		}
	}

	return tags, nil
}

// generateTopicTags generates topic-based tags
func (ca *ContentAssistant) generateTopicTags(keyPhrases []string, language string) []SmartTag {
	var tags []SmartTag

	// Define topic categories
	topicCategories := ca.getTopicCategories(language)

	for _, phrase := range keyPhrases {
		for category, keywords := range topicCategories {
			for _, keyword := range keywords {
				// Handle different languages properly
				var matched bool
				if language == "zh" || language == "ja" {
					// For CJK languages, direct contains check without case conversion
					matched = strings.Contains(phrase, keyword)
				} else {
					// For other languages, use case-insensitive matching
					matched = strings.Contains(strings.ToLower(phrase), strings.ToLower(keyword))
				}

				if matched {
					confidence := 0.7 + rand.Float64()*0.2 // 0.7-0.9
					tags = append(tags, SmartTag{
						Tag:        category,
						Confidence: confidence,
						Type:       "topic",
						Context:    fmt.Sprintf("matched phrase: %s", phrase),
					})
					break
				}
			}
		}
	}

	return tags
}

// generateTechnicalTags generates technical/domain-specific tags
func (ca *ContentAssistant) generateTechnicalTags(content string, language string) []SmartTag {
	var tags []SmartTag

	// Technical patterns
	techPatterns := ca.getTechnicalPatterns(language)

	for category, patterns := range techPatterns {
		for _, pattern := range patterns {
			if matched, _ := regexp.MatchString(pattern, strings.ToLower(content)); matched {
				confidence := 0.8 + rand.Float64()*0.15 // 0.8-0.95
				tags = append(tags, SmartTag{
					Tag:        category,
					Confidence: confidence,
					Type:       "technical",
					Context:    fmt.Sprintf("matched pattern: %s", pattern),
				})
			}
		}
	}

	return tags
}

// dedupAndSortTags removes duplicates and sorts tags by confidence
func (ca *ContentAssistant) dedupAndSortTags(tags []SmartTag) []SmartTag {
	tagMap := make(map[string]SmartTag)

	// Keep highest confidence for each tag
	for _, tag := range tags {
		if existing, exists := tagMap[tag.Tag]; exists {
			if tag.Confidence > existing.Confidence {
				tagMap[tag.Tag] = tag
			}
		} else {
			tagMap[tag.Tag] = tag
		}
	}

	// Convert back to slice
	var result []SmartTag
	for _, tag := range tagMap {
		result = append(result, tag)
	}

	// Sort by confidence
	sort.Slice(result, func(i, j int) bool {
		return result[i].Confidence > result[j].Confidence
	})

	return result
}

// extractKeywords extracts keywords from text
func (ca *ContentAssistant) extractKeywords(text string, language string) []string {
	words := ca.tokenizeText(text, language)

	// Calculate word frequencies
	wordFreq := make(map[string]int)
	for _, word := range words {
		if len(word) > 2 { // Filter short words
			wordFreq[word]++
		}
	}

	// Sort by frequency
	type wordScore struct {
		word  string
		score int
	}

	var scored []wordScore
	for word, freq := range wordFreq {
		scored = append(scored, wordScore{word, freq})
	}

	sort.Slice(scored, func(i, j int) bool {
		return scored[i].score > scored[j].score
	})

	// Return top keywords
	var keywords []string
	for i, ws := range scored {
		if i >= 20 { // Limit to top 20
			break
		}
		keywords = append(keywords, ws.word)
	}

	return keywords
}

// tokenizeText tokenizes text based on language
func (ca *ContentAssistant) tokenizeText(text string, language string) []string {
	// Handle different languages properly
	if language != "zh" && language != "ja" {
		// For non-CJK languages, convert to lowercase
		text = strings.ToLower(text)
	}

	// Remove punctuation and special characters but keep Unicode letters
	reg := regexp.MustCompile(`[^\p{L}\p{N}\s]+`)
	text = reg.ReplaceAllString(text, " ")

	// Split into words
	words := strings.Fields(text)

	// Filter stop words and short words
	stopWords := ca.getStopWords(language)
	var filtered []string
	for _, word := range words {
		// For CJK languages, use original word; for others, use lowercase for stop word check
		checkWord := word
		if language != "zh" && language != "ja" {
			checkWord = strings.ToLower(word)
		}

		if !stopWords[checkWord] && len(word) > 1 {
			filtered = append(filtered, word)
		}
	}

	return filtered
}

// calculateKeywordDensity calculates keyword density in content
func (ca *ContentAssistant) calculateKeywordDensity(content string, keywords []string) map[string]float64 {
	words := ca.tokenizeText(content, "")
	totalWords := len(words)

	if totalWords == 0 {
		return make(map[string]float64)
	}

	wordCount := make(map[string]int)
	for _, word := range words {
		wordCount[word]++
	}

	density := make(map[string]float64)
	for _, keyword := range keywords {
		count := wordCount[strings.ToLower(keyword)]
		density[keyword] = float64(count) / float64(totalWords)
	}

	return density
}

// cosineSimilarity calculates cosine similarity between two vectors
func (ca *ContentAssistant) cosineSimilarity(a, b []float64) float64 {
	if len(a) != len(b) {
		return 0.0
	}

	var dotProduct, normA, normB float64
	for i := 0; i < len(a); i++ {
		dotProduct += a[i] * b[i]
		normA += a[i] * a[i]
		normB += b[i] * b[i]
	}

	if normA == 0.0 || normB == 0.0 {
		return 0.0
	}

	return dotProduct / (math.Sqrt(normA) * math.Sqrt(normB))
}

// calculateCoverageScore calculates how well the content covers different topics
func (ca *ContentAssistant) calculateCoverageScore(clusters []TopicCluster, gaps []TopicGap) float64 {
	if len(clusters) == 0 {
		return 0.0
	}

	// Calculate based on cluster sizes and gaps
	totalArticles := 0
	minClusterSize := math.Inf(1)
	maxClusterSize := 0.0

	for _, cluster := range clusters {
		totalArticles += cluster.Size
		if float64(cluster.Size) < minClusterSize {
			minClusterSize = float64(cluster.Size)
		}
		if float64(cluster.Size) > maxClusterSize {
			maxClusterSize = float64(cluster.Size)
		}
	}

	if totalArticles == 0 {
		return 0.0
	}

	// Calculate balance score (how evenly distributed articles are)
	avgClusterSize := float64(totalArticles) / float64(len(clusters))
	balanceScore := minClusterSize / avgClusterSize

	// Penalize for gaps
	gapPenalty := float64(len(gaps)) * 0.1
	if gapPenalty > 0.5 {
		gapPenalty = 0.5
	}

	coverageScore := balanceScore - gapPenalty
	if coverageScore < 0 {
		coverageScore = 0
	}
	if coverageScore > 1 {
		coverageScore = 1
	}

	return coverageScore
}

// Helper methods for generating content

// getTitleTemplates returns title templates for different languages
func (ca *ContentAssistant) getTitleTemplates(language string) []string {
	if language == "zh" {
		return []string{
			"深入理解{keyword}",
			"{keyword}完全指南",
			"关于{keyword}你需要知道的一切",
			"{keyword}最佳实践",
			"如何有效使用{keyword}",
			"{keyword}进阶技巧",
			"探索{keyword}的奥秘",
			"{keyword}实战经验分享",
		}
	} else {
		return []string{
			"Understanding {keyword} in Depth",
			"The Complete Guide to {keyword}",
			"Everything You Need to Know About {keyword}",
			"{keyword} Best Practices",
			"How to Effectively Use {keyword}",
			"Advanced {keyword} Techniques",
			"Exploring the World of {keyword}",
			"Practical {keyword} Experience",
		}
	}
}

// More helper methods continue...
// (Additional utility methods would be implemented here)

// storeWritingSuggestions stores suggestions in database
func (ca *ContentAssistant) storeWritingSuggestions(ideas []WritingIdea, suggestionType string) {
	for _, idea := range ideas {
		suggestion := models.WritingSuggestion{
			SuggestionType: suggestionType,
			Content:        fmt.Sprintf("Title: %s\nDescription: %s", idea.Title, idea.Description),
			RelevanceScore: idea.RelevanceScore,
			Language:       idea.Language,
			IsUsed:         false,
		}

		// Don't worry about errors here - this is background storage
		database.DB.Create(&suggestion)
	}
}

// generateFallbackTags generates basic tags when all other methods fail
func (ca *ContentAssistant) generateFallbackTags(content string, language string) []SmartTag {
	var tags []SmartTag

	// Basic content analysis
	contentLength := len(content)
	wordCount := len(strings.Fields(content))

	// Generate tags based on content characteristics
	if language == "zh" {
		if contentLength > 1000 {
			tags = append(tags, SmartTag{Tag: "长文", Confidence: 0.8, Type: "general", Context: "基于内容长度"})
		} else if contentLength > 500 {
			tags = append(tags, SmartTag{Tag: "中文", Confidence: 0.9, Type: "language", Context: "语言检测"})
		}

		// Check for common Chinese patterns
		if strings.Contains(content, "技术") || strings.Contains(content, "编程") || strings.Contains(content, "开发") {
			tags = append(tags, SmartTag{Tag: "技术", Confidence: 0.7, Type: "topic", Context: "关键词匹配"})
		}
		if strings.Contains(content, "设计") || strings.Contains(content, "界面") {
			tags = append(tags, SmartTag{Tag: "设计", Confidence: 0.7, Type: "topic", Context: "关键词匹配"})
		}
		if strings.Contains(content, "学习") || strings.Contains(content, "教程") {
			tags = append(tags, SmartTag{Tag: "教育", Confidence: 0.7, Type: "topic", Context: "关键词匹配"})
		}
	} else {
		// English fallback tags
		if contentLength > 1000 {
			tags = append(tags, SmartTag{Tag: "Long-form", Confidence: 0.8, Type: "general", Context: "content length analysis"})
		}

		tags = append(tags, SmartTag{Tag: "English", Confidence: 0.9, Type: "language", Context: "language detection"})

		// Check for common English patterns
		contentLower := strings.ToLower(content)
		if strings.Contains(contentLower, "technology") || strings.Contains(contentLower, "programming") {
			tags = append(tags, SmartTag{Tag: "Technology", Confidence: 0.7, Type: "topic", Context: "keyword matching"})
		}
		if strings.Contains(contentLower, "design") || strings.Contains(contentLower, "ui") {
			tags = append(tags, SmartTag{Tag: "Design", Confidence: 0.7, Type: "topic", Context: "keyword matching"})
		}
	}

	// Add basic content type tags
	if wordCount < 100 {
		var tag string
		if language == "zh" {
			tag = "简短"
		} else {
			tag = "Brief"
		}
		tags = append(tags, SmartTag{Tag: tag, Confidence: 0.6, Type: "general", Context: "word count analysis"})
	} else if wordCount > 500 {
		var tag string
		if language == "zh" {
			tag = "详细"
		} else {
			tag = "Detailed"
		}
		tags = append(tags, SmartTag{Tag: tag, Confidence: 0.6, Type: "general", Context: "word count analysis"})
	}

	// Ensure we always have at least one tag
	if len(tags) == 0 {
		var tag string
		if language == "zh" {
			tag = "一般内容"
		} else {
			tag = "General Content"
		}
		defaultTag := SmartTag{
			Tag:        tag,
			Confidence: 0.5,
			Type:       "fallback",
			Context:    "default fallback tag",
		}
		tags = append(tags, defaultTag)
	}

	return tags
}
