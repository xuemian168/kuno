package services

import (
	"blog-backend/internal/models"
	"fmt"
	"gorm.io/gorm"
	"math/rand"
	"strings"
	"time"
)

// SEOKeywordTrackerService manages keyword tracking and monitoring
type SEOKeywordTrackerService struct {
	db *gorm.DB
}

// NewSEOKeywordTrackerService creates a new keyword tracker service
func NewSEOKeywordTrackerService(db *gorm.DB) *SEOKeywordTrackerService {
	return &SEOKeywordTrackerService{db: db}
}

// AddKeyword adds a new keyword for tracking
func (s *SEOKeywordTrackerService) AddKeyword(keyword models.SEOKeyword) (*models.SEOKeyword, error) {
	// Validate keyword
	if keyword.Keyword == "" {
		return nil, fmt.Errorf("keyword cannot be empty")
	}

	// Check for duplicates
	var existing models.SEOKeyword
	result := s.db.Where("keyword = ? AND language = ? AND article_id = ?",
		keyword.Keyword, keyword.Language, keyword.ArticleID).First(&existing)

	if result.Error == nil {
		return nil, fmt.Errorf("keyword already exists for this article")
	}

	// Set defaults
	if keyword.Language == "" {
		keyword.Language = "zh"
	}
	if keyword.Difficulty == "" {
		keyword.Difficulty = "medium"
	}
	if keyword.TrackingStatus == "" {
		keyword.TrackingStatus = "active"
	}

	// Estimate search volume and difficulty (in real app, use external APIs)
	keyword.SearchVolume = s.estimateSearchVolume(keyword.Keyword)

	// Save to database
	if err := s.db.Create(&keyword).Error; err != nil {
		return nil, fmt.Errorf("failed to create keyword: %w", err)
	}

	// Load relationships
	s.db.Preload("Article").First(&keyword, keyword.ID)

	return &keyword, nil
}

// GetKeywords retrieves keywords with optional filtering
func (s *SEOKeywordTrackerService) GetKeywords(filters map[string]interface{}) ([]models.SEOKeyword, error) {
	var keywords []models.SEOKeyword
	query := s.db.Preload("Article")

	// Apply filters
	if articleID, ok := filters["article_id"]; ok && articleID != nil {
		query = query.Where("article_id = ?", articleID)
	}

	if language, ok := filters["language"]; ok && language != "" {
		query = query.Where("language = ?", language)
	}

	if status, ok := filters["tracking_status"]; ok && status != "" {
		query = query.Where("tracking_status = ?", status)
	}

	if difficulty, ok := filters["difficulty"]; ok && difficulty != "" {
		query = query.Where("difficulty = ?", difficulty)
	}

	// Add search filter
	if search, ok := filters["search"]; ok && search != "" {
		query = query.Where("keyword LIKE ? OR notes LIKE ?", "%"+search.(string)+"%", "%"+search.(string)+"%")
	}

	// Order by creation date
	query = query.Order("created_at DESC")

	if err := query.Find(&keywords).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch keywords: %w", err)
	}

	return keywords, nil
}

// UpdateKeyword updates an existing keyword
func (s *SEOKeywordTrackerService) UpdateKeyword(id uint, updates map[string]interface{}) (*models.SEOKeyword, error) {
	var keyword models.SEOKeyword

	// Find keyword
	if err := s.db.First(&keyword, id).Error; err != nil {
		return nil, fmt.Errorf("keyword not found: %w", err)
	}

	// Update fields
	if err := s.db.Model(&keyword).Updates(updates).Error; err != nil {
		return nil, fmt.Errorf("failed to update keyword: %w", err)
	}

	// Reload with relationships
	s.db.Preload("Article").First(&keyword, id)

	return &keyword, nil
}

// DeleteKeyword removes a keyword from tracking
func (s *SEOKeywordTrackerService) DeleteKeyword(id uint) error {
	var keyword models.SEOKeyword

	if err := s.db.First(&keyword, id).Error; err != nil {
		return fmt.Errorf("keyword not found: %w", err)
	}

	// Soft delete
	if err := s.db.Delete(&keyword).Error; err != nil {
		return fmt.Errorf("failed to delete keyword: %w", err)
	}

	return nil
}

// UpdateKeywordRankings updates ranking positions for keywords
func (s *SEOKeywordTrackerService) UpdateKeywordRankings() error {
	var keywords []models.SEOKeyword

	// Get active keywords
	if err := s.db.Where("tracking_status = ?", "active").Find(&keywords).Error; err != nil {
		return fmt.Errorf("failed to fetch active keywords: %w", err)
	}

	// Update rankings (in real app, use search engine APIs)
	for _, keyword := range keywords {
		newRank := s.simulateRankingCheck(keyword.Keyword)

		updates := map[string]interface{}{
			"current_rank": newRank,
		}

		// Update best rank if improved
		if newRank > 0 && (keyword.BestRank == 0 || newRank < keyword.BestRank) {
			updates["best_rank"] = newRank
		}

		if err := s.db.Model(&keyword).Updates(updates).Error; err != nil {
			fmt.Printf("Failed to update keyword %d: %v\n", keyword.ID, err)
			continue
		}

		// Create notification for significant ranking changes
		if s.shouldNotifyRankingChange(keyword.CurrentRank, newRank) {
			s.createRankingNotification(keyword, newRank)
		}
	}

	return nil
}

// GetKeywordGroups retrieves keyword groups
func (s *SEOKeywordTrackerService) GetKeywordGroups() ([]models.SEOKeywordGroup, error) {
	var groups []models.SEOKeywordGroup

	if err := s.db.Order("sort_order ASC, name ASC").Find(&groups).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch keyword groups: %w", err)
	}

	return groups, nil
}

// CreateKeywordGroup creates a new keyword group
func (s *SEOKeywordTrackerService) CreateKeywordGroup(group models.SEOKeywordGroup) (*models.SEOKeywordGroup, error) {
	if group.Name == "" {
		return nil, fmt.Errorf("group name cannot be empty")
	}

	// Check for duplicate names
	var existing models.SEOKeywordGroup
	if err := s.db.Where("name = ?", group.Name).First(&existing).Error; err == nil {
		return nil, fmt.Errorf("group name already exists")
	}

	// Set defaults
	if group.Color == "" {
		group.Color = s.generateRandomColor()
	}

	if err := s.db.Create(&group).Error; err != nil {
		return nil, fmt.Errorf("failed to create group: %w", err)
	}

	return &group, nil
}

// AssignKeywordToGroup assigns a keyword to a group
func (s *SEOKeywordTrackerService) AssignKeywordToGroup(keywordID, groupID uint) error {
	// Check if keyword exists
	var keyword models.SEOKeyword
	if err := s.db.First(&keyword, keywordID).Error; err != nil {
		return fmt.Errorf("keyword not found: %w", err)
	}

	// Check if group exists
	var group models.SEOKeywordGroup
	if err := s.db.First(&group, groupID).Error; err != nil {
		return fmt.Errorf("group not found: %w", err)
	}

	// Check if already assigned
	var existing models.SEOKeywordGroupMember
	if err := s.db.Where("keyword_id = ? AND group_id = ?", keywordID, groupID).First(&existing).Error; err == nil {
		return fmt.Errorf("keyword already assigned to this group")
	}

	// Create assignment
	member := models.SEOKeywordGroupMember{
		KeywordID: keywordID,
		GroupID:   groupID,
	}

	if err := s.db.Create(&member).Error; err != nil {
		return fmt.Errorf("failed to assign keyword to group: %w", err)
	}

	return nil
}

// GetKeywordsByGroup retrieves keywords grouped by their assigned groups
func (s *SEOKeywordTrackerService) GetKeywordsByGroup() (map[string][]models.SEOKeyword, error) {
	// Get all keywords with their group assignments
	var members []models.SEOKeywordGroupMember
	if err := s.db.Preload("Keyword").Preload("Group").Find(&members).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch group members: %w", err)
	}

	// Group keywords by group name
	grouped := make(map[string][]models.SEOKeyword)

	for _, member := range members {
		groupName := member.Group.Name
		if _, exists := grouped[groupName]; !exists {
			grouped[groupName] = []models.SEOKeyword{}
		}
		grouped[groupName] = append(grouped[groupName], member.Keyword)
	}

	// Add ungrouped keywords
	var ungroupedKeywords []models.SEOKeyword
	if err := s.db.Where("id NOT IN (SELECT keyword_id FROM seo_keyword_group_members)").Find(&ungroupedKeywords).Error; err == nil {
		if len(ungroupedKeywords) > 0 {
			grouped["未分组"] = ungroupedKeywords
		}
	}

	return grouped, nil
}

// GetKeywordStats returns keyword statistics
func (s *SEOKeywordTrackerService) GetKeywordStats() (map[string]interface{}, error) {
	stats := make(map[string]interface{})

	// Total keywords
	var totalKeywords int64
	s.db.Model(&models.SEOKeyword{}).Count(&totalKeywords)
	stats["total_keywords"] = totalKeywords

	// Active keywords
	var activeKeywords int64
	s.db.Model(&models.SEOKeyword{}).Where("tracking_status = ?", "active").Count(&activeKeywords)
	stats["active_keywords"] = activeKeywords

	// Keywords with rankings
	var rankingKeywords int64
	s.db.Model(&models.SEOKeyword{}).Where("current_rank > 0").Count(&rankingKeywords)
	stats["ranking_keywords"] = rankingKeywords

	// Average ranking position
	var avgRank float64
	s.db.Model(&models.SEOKeyword{}).Where("current_rank > 0").Select("AVG(current_rank)").Scan(&avgRank)
	stats["avg_ranking_position"] = avgRank

	// Top 10 rankings
	var top10Keywords int64
	s.db.Model(&models.SEOKeyword{}).Where("current_rank BETWEEN 1 AND 10").Count(&top10Keywords)
	stats["top_10_rankings"] = top10Keywords

	// Keywords by difficulty
	difficultyStats := make(map[string]int64)
	difficulties := []string{"easy", "medium", "hard"}
	for _, difficulty := range difficulties {
		var count int64
		s.db.Model(&models.SEOKeyword{}).Where("difficulty = ?", difficulty).Count(&count)
		difficultyStats[difficulty] = count
	}
	stats["by_difficulty"] = difficultyStats

	// Recent ranking changes (last 7 days)
	sevenDaysAgo := time.Now().AddDate(0, 0, -7)
	var recentChanges int64
	s.db.Model(&models.SEOKeyword{}).Where("updated_at >= ?", sevenDaysAgo).Count(&recentChanges)
	stats["recent_changes"] = recentChanges

	return stats, nil
}

// GenerateKeywordSuggestions generates AI-powered keyword suggestions
func (s *SEOKeywordTrackerService) GenerateKeywordSuggestions(articleID uint, baseKeyword string) ([]string, error) {
	// In real implementation, this would use AI APIs
	// For now, generate mock suggestions based on the base keyword

	if baseKeyword == "" {
		return nil, fmt.Errorf("base keyword is required")
	}

	suggestions := []string{}

	// Add variations
	variations := []string{
		baseKeyword + "教程",
		baseKeyword + "指南",
		"如何" + baseKeyword,
		baseKeyword + "技巧",
		baseKeyword + "最佳实践",
		baseKeyword + "入门",
		baseKeyword + "进阶",
		baseKeyword + "完整指南",
	}

	// Add language-specific variations
	if s.isEnglishKeyword(baseKeyword) {
		variations = []string{
			baseKeyword + " tutorial",
			baseKeyword + " guide",
			"how to " + baseKeyword,
			baseKeyword + " tips",
			baseKeyword + " best practices",
			baseKeyword + " beginner",
			baseKeyword + " advanced",
			baseKeyword + " complete guide",
		}
	}

	suggestions = append(suggestions, variations...)

	// Add related terms (simplified semantic expansion)
	relatedTerms := s.getRelatedTerms(baseKeyword)
	suggestions = append(suggestions, relatedTerms...)

	// Filter existing keywords
	filteredSuggestions := []string{}
	for _, suggestion := range suggestions {
		var count int64
		s.db.Model(&models.SEOKeyword{}).Where("keyword = ? AND article_id = ?", suggestion, articleID).Count(&count)
		if count == 0 {
			filteredSuggestions = append(filteredSuggestions, suggestion)
		}
	}

	// Limit to 20 suggestions
	if len(filteredSuggestions) > 20 {
		filteredSuggestions = filteredSuggestions[:20]
	}

	return filteredSuggestions, nil
}

// BulkImportKeywords imports multiple keywords from a list
func (s *SEOKeywordTrackerService) BulkImportKeywords(articleID *uint, keywords []string, language string) ([]models.SEOKeyword, error) {
	if language == "" {
		language = "zh"
	}

	created := []models.SEOKeyword{}

	for _, keywordText := range keywords {
		keyword := models.SEOKeyword{
			ArticleID:      articleID,
			Keyword:        strings.TrimSpace(keywordText),
			Language:       language,
			Difficulty:     "medium",
			TrackingStatus: "active",
			SearchVolume:   s.estimateSearchVolume(keywordText),
		}

		// Check for duplicates
		var existing models.SEOKeyword
		if err := s.db.Where("keyword = ? AND language = ? AND article_id = ?",
			keyword.Keyword, keyword.Language, keyword.ArticleID).First(&existing).Error; err == nil {
			continue // Skip duplicates
		}

		if err := s.db.Create(&keyword).Error; err != nil {
			fmt.Printf("Failed to create keyword %s: %v\n", keywordText, err)
			continue
		}

		created = append(created, keyword)
	}

	return created, nil
}

// Helper methods

func (s *SEOKeywordTrackerService) estimateSearchVolume(keyword string) int {
	// Simplified search volume estimation based on keyword length and popularity
	baseVolume := rand.Intn(10000) + 100

	// Adjust based on keyword characteristics
	if strings.Contains(keyword, "教程") || strings.Contains(keyword, "tutorial") {
		baseVolume += 500
	}
	if strings.Contains(keyword, "如何") || strings.Contains(keyword, "how to") {
		baseVolume += 300
	}
	if len(keyword) > 20 {
		baseVolume = baseVolume / 2 // Long tail keywords have lower volume
	}

	return baseVolume
}

func (s *SEOKeywordTrackerService) simulateRankingCheck(keyword string) int {
	// Simulate ranking check (in real app, use search engine APIs)
	// Return 0 for not ranking, or position 1-100

	if rand.Float32() < 0.3 {
		return 0 // 30% chance of not ranking
	}

	// Simulate ranking between 1-100
	return rand.Intn(100) + 1
}

func (s *SEOKeywordTrackerService) shouldNotifyRankingChange(oldRank, newRank int) bool {
	// Notify for significant changes
	if oldRank == 0 && newRank > 0 {
		return true // New ranking
	}

	if oldRank > 0 && newRank == 0 {
		return true // Lost ranking
	}

	// Notify for changes of 5+ positions
	diff := oldRank - newRank
	if diff < 0 {
		diff = -diff
	}

	return diff >= 5
}

func (s *SEOKeywordTrackerService) createRankingNotification(keyword models.SEOKeyword, newRank int) {
	var title, message string
	severity := "info"

	if keyword.CurrentRank == 0 && newRank > 0 {
		title = "新关键词排名"
		message = fmt.Sprintf("关键词 \"%s\" 获得排名位置 %d", keyword.Keyword, newRank)
		severity = "info"
	} else if keyword.CurrentRank > 0 && newRank == 0 {
		title = "排名丢失警告"
		message = fmt.Sprintf("关键词 \"%s\" 失去排名", keyword.Keyword)
		severity = "warning"
	} else if newRank < keyword.CurrentRank {
		title = "排名提升"
		message = fmt.Sprintf("关键词 \"%s\" 排名从 %d 提升到 %d", keyword.Keyword, keyword.CurrentRank, newRank)
		severity = "info"
	} else {
		title = "排名下降"
		message = fmt.Sprintf("关键词 \"%s\" 排名从 %d 下降到 %d", keyword.Keyword, keyword.CurrentRank, newRank)
		severity = "warning"
	}

	notification := models.SEONotification{
		Type:      "ranking_change",
		Severity:  severity,
		Title:     title,
		Message:   message,
		KeywordID: &keyword.ID,
		ArticleID: keyword.ArticleID,
	}

	s.db.Create(&notification)
}

func (s *SEOKeywordTrackerService) generateRandomColor() string {
	colors := []string{"#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16"}
	return colors[rand.Intn(len(colors))]
}

func (s *SEOKeywordTrackerService) isEnglishKeyword(keyword string) bool {
	// Simple detection - check if keyword contains mostly English characters
	englishChars := 0
	totalChars := 0

	for _, char := range keyword {
		totalChars++
		if (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') {
			englishChars++
		}
	}

	if totalChars == 0 {
		return false
	}

	return float64(englishChars)/float64(totalChars) > 0.7
}

func (s *SEOKeywordTrackerService) getRelatedTerms(baseKeyword string) []string {
	// Simplified related terms generation
	// In real implementation, this would use semantic similarity APIs

	related := []string{}

	// Add some generic related terms based on common patterns
	if strings.Contains(baseKeyword, "开发") {
		related = append(related, baseKeyword+" 工具", baseKeyword+" 框架", baseKeyword+" 环境")
	}

	if strings.Contains(baseKeyword, "学习") {
		related = append(related, baseKeyword+" 资源", baseKeyword+" 课程", baseKeyword+" 书籍")
	}

	// Add English equivalents if Chinese
	if !s.isEnglishKeyword(baseKeyword) {
		// This would need proper translation in real implementation
		if baseKeyword == "网站开发" {
			related = append(related, "web development", "website development")
		}
	}

	return related
}
