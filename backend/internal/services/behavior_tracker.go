package services

import (
	"blog-backend/internal/database"
	"blog-backend/internal/models"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"sort"
	"strings"
	"sync"
	"time"
)

// BehaviorTracker tracks and analyzes user reading behavior
type BehaviorTracker struct {
	cache         *SmartCache
	profileCache  sync.Map // Cache for user profiles
	batchSize     int
	flushInterval time.Duration
	behaviorQueue chan models.UserReadingBehavior
	stopChan      chan struct{}
	mu            sync.RWMutex
}

// ReadingSession represents a user's reading session
type ReadingSession struct {
	UserID       string                        `json:"user_id"`
	SessionID    string                        `json:"session_id"`
	StartTime    time.Time                     `json:"start_time"`
	LastActivity time.Time                     `json:"last_activity"`
	Behaviors    []models.UserReadingBehavior  `json:"behaviors"`
	DeviceInfo   DeviceInfo                    `json:"device_info"`
}

// DeviceInfo contains device and browser information
type DeviceInfo struct {
	DeviceType string `json:"device_type"` // desktop, mobile, tablet
	Browser    string `json:"browser"`
	OS         string `json:"os"`
	ScreenSize string `json:"screen_size"`
	UserAgent  string `json:"user_agent"`
}

// UserInteraction represents a user interaction event
type UserInteraction struct {
	UserID          string            `json:"user_id"`
	SessionID       string            `json:"session_id"`
	ArticleID       uint              `json:"article_id"`
	InteractionType string            `json:"interaction_type"`
	ReadingTime     int               `json:"reading_time"`
	ScrollDepth     float64           `json:"scroll_depth"`
	DeviceInfo      DeviceInfo        `json:"device_info"`
	UTMParams       map[string]string `json:"utm_params"`
	ReferrerType    string            `json:"referrer_type"`
	Language        string            `json:"language"`
	Timestamp       time.Time         `json:"timestamp"`
}

// UserInterests represents user's aggregated interests
type UserInterests struct {
	Topics     map[string]float64 `json:"topics"`      // topic -> interest score
	Categories map[string]float64 `json:"categories"`  // category -> interest score
	Keywords   map[string]float64 `json:"keywords"`    // keyword -> interest score
	Languages  map[string]float64 `json:"languages"`   // language -> preference score
}

// NewBehaviorTracker creates a new behavior tracker
func NewBehaviorTracker() *BehaviorTracker {
	bt := &BehaviorTracker{
		cache:         GetGlobalCache(),
		batchSize:     100,
		flushInterval: time.Minute * 5,
		behaviorQueue: make(chan models.UserReadingBehavior, 1000),
		stopChan:      make(chan struct{}),
	}
	
	// Start background processors
	go bt.processBehaviorQueue()
	go bt.periodicProfileUpdate()
	
	return bt
}

// TrackInteraction tracks a user interaction
func (bt *BehaviorTracker) TrackInteraction(interaction UserInteraction) error {
	// Generate user ID if not provided (based on session/fingerprint)
	if interaction.UserID == "" {
		interaction.UserID = bt.generateUserID(interaction.SessionID, interaction.DeviceInfo)
	}
	
	// Create behavior record
	behavior := models.UserReadingBehavior{
		UserID:          interaction.UserID,
		ArticleID:       interaction.ArticleID,
		SessionID:       interaction.SessionID,
		ReadingTime:     interaction.ReadingTime,
		ScrollDepth:     interaction.ScrollDepth,
		InteractionType: interaction.InteractionType,
		DeviceType:      interaction.DeviceInfo.DeviceType,
		Language:        interaction.Language,
		ReferrerType:    interaction.ReferrerType,
		UTMSource:       interaction.UTMParams["utm_source"],
		UTMMedium:       interaction.UTMParams["utm_medium"],
		UTMCampaign:     interaction.UTMParams["utm_campaign"],
		CreatedAt:       interaction.Timestamp,
	}
	
	// Queue for batch processing
	select {
	case bt.behaviorQueue <- behavior:
		// Successfully queued
	default:
		// Queue is full, process immediately
		return bt.storeBehavior(behavior)
	}
	
	// Update user profile asynchronously
	go bt.updateUserProfile(interaction.UserID)
	
	return nil
}

// GetUserProfile retrieves or creates a user profile
func (bt *BehaviorTracker) GetUserProfile(userID string) (*models.UserProfile, error) {
	// Check cache first
	if cached, exists := bt.profileCache.Load(userID); exists {
		if profile, ok := cached.(*models.UserProfile); ok {
			return profile, nil
		}
	}
	
	// Check database
	var profile models.UserProfile
	result := database.DB.Where("user_id = ?", userID).First(&profile)
	
	if result.Error != nil {
		// Create new profile if not found
		if result.Error.Error() == "record not found" {
			profile = models.UserProfile{
				UserID:           userID,
				Language:         "en",
				PreferredTopics:  "[]",
				ReadingSpeed:     200, // Default reading speed
				ActiveHours:      "[]",
				InterestVector:   "[]",
				LastActive:       time.Now(),
				CreatedAt:        time.Now(),
				UpdatedAt:        time.Now(),
			}
			
			if err := database.DB.Create(&profile).Error; err != nil {
				return nil, fmt.Errorf("failed to create user profile: %v", err)
			}
		} else {
			return nil, fmt.Errorf("failed to fetch user profile: %v", result.Error)
		}
	}
	
	// Cache the profile
	bt.profileCache.Store(userID, &profile)
	
	return &profile, nil
}

// GetUserInterests calculates user interests based on reading behavior
func (bt *BehaviorTracker) GetUserInterests(userID string) (*UserInterests, error) {
	cacheKey := fmt.Sprintf("user_interests_%s", userID)
	
	// Check cache first
	if cached, exists := bt.cache.Get(cacheKey); exists {
		if interests, ok := cached.(*UserInterests); ok {
			return interests, nil
		}
	}
	
	// Calculate interests from behavior
	interests, err := bt.calculateUserInterests(userID)
	if err != nil {
		return nil, err
	}
	
	// Cache the result
	bt.cache.Set(cacheKey, interests)
	
	return interests, nil
}

// GetSimilarUsers finds users with similar reading patterns
func (bt *BehaviorTracker) GetSimilarUsers(userID string, limit int) ([]string, error) {
	userProfile, err := bt.GetUserProfile(userID)
	if err != nil {
		return nil, err
	}
	
	// Parse user's interest vector
	var userVector []float64
	if err := json.Unmarshal([]byte(userProfile.InterestVector), &userVector); err != nil {
		return nil, fmt.Errorf("failed to parse user interest vector: %v", err)
	}
	
	if len(userVector) == 0 {
		return []string{}, nil // No interests yet
	}
	
	// Get other user profiles
	var profiles []models.UserProfile
	if err := database.DB.Where("user_id != ? AND interest_vector != '[]'", userID).
		Find(&profiles).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch user profiles: %v", err)
	}
	
	// Calculate similarities
	type userSimilarity struct {
		userID     string
		similarity float64
	}
	
	var similarities []userSimilarity
	for _, profile := range profiles {
		var otherVector []float64
		if err := json.Unmarshal([]byte(profile.InterestVector), &otherVector); err != nil {
			continue
		}
		
		// Calculate cosine similarity
		similarity := bt.cosineSimilarity(userVector, otherVector)
		if similarity > 0.1 { // Only consider users with some similarity
			similarities = append(similarities, userSimilarity{
				userID:     profile.UserID,
				similarity: similarity,
			})
		}
	}
	
	// Sort by similarity
	sort.Slice(similarities, func(i, j int) bool {
		return similarities[i].similarity > similarities[j].similarity
	})
	
	// Return top similar users
	var result []string
	for i, sim := range similarities {
		if i >= limit {
			break
		}
		result = append(result, sim.userID)
	}
	
	return result, nil
}

// GetReadingPatterns analyzes reading patterns for a user
func (bt *BehaviorTracker) GetReadingPatterns(userID string, days int) (*ReadingPatterns, error) {
	if days <= 0 {
		days = 30
	}
	
	since := time.Now().AddDate(0, 0, -days)
	
	var behaviors []models.UserReadingBehavior
	if err := database.DB.Preload("Article").
		Where("user_id = ? AND created_at >= ?", userID, since).
		Order("created_at DESC").
		Find(&behaviors).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch reading behaviors: %v", err)
	}
	
	return bt.analyzeReadingPatterns(behaviors), nil
}

// ReadingPatterns represents analyzed reading patterns
type ReadingPatterns struct {
	TotalReadingTime   int                    `json:"total_reading_time"`
	AverageReadingTime int                    `json:"average_reading_time"`
	AverageScrollDepth float64               `json:"average_scroll_depth"`
	ReadingSpeed       float64               `json:"reading_speed"`
	PreferredHours     []int                 `json:"preferred_hours"`
	DeviceDistribution map[string]int        `json:"device_distribution"`
	TopicInterests     map[string]float64    `json:"topic_interests"`
	CategoryInterests  map[string]float64    `json:"category_interests"`
	ReadingFrequency   map[string]int        `json:"reading_frequency"` // day of week -> count
}

// Helper methods

// generateUserID generates a consistent user ID from session and device info
func (bt *BehaviorTracker) generateUserID(sessionID string, deviceInfo DeviceInfo) string {
	data := fmt.Sprintf("%s:%s:%s", sessionID, deviceInfo.DeviceType, deviceInfo.UserAgent)
	hash := sha256.Sum256([]byte(data))
	return fmt.Sprintf("user_%x", hash[:8])
}

// storeBehavior stores a behavior record in the database
func (bt *BehaviorTracker) storeBehavior(behavior models.UserReadingBehavior) error {
	return database.DB.Create(&behavior).Error
}

// processBehaviorQueue processes queued behaviors in batches
func (bt *BehaviorTracker) processBehaviorQueue() {
	ticker := time.NewTicker(bt.flushInterval)
	defer ticker.Stop()
	
	behaviors := make([]models.UserReadingBehavior, 0, bt.batchSize)
	
	for {
		select {
		case behavior := <-bt.behaviorQueue:
			behaviors = append(behaviors, behavior)
			
			if len(behaviors) >= bt.batchSize {
				bt.flushBehaviors(behaviors)
				behaviors = behaviors[:0] // Reset slice
			}
			
		case <-ticker.C:
			if len(behaviors) > 0 {
				bt.flushBehaviors(behaviors)
				behaviors = behaviors[:0] // Reset slice
			}
			
		case <-bt.stopChan:
			// Flush remaining behaviors before stopping
			if len(behaviors) > 0 {
				bt.flushBehaviors(behaviors)
			}
			return
		}
	}
}

// flushBehaviors saves a batch of behaviors to database
func (bt *BehaviorTracker) flushBehaviors(behaviors []models.UserReadingBehavior) {
	if len(behaviors) == 0 {
		return
	}
	
	if err := database.DB.CreateInBatches(behaviors, bt.batchSize).Error; err != nil {
		log.Printf("Failed to flush behaviors: %v", err)
	}
}

// updateUserProfile updates user profile based on latest behavior
func (bt *BehaviorTracker) updateUserProfile(userID string) {
	profile, err := bt.GetUserProfile(userID)
	if err != nil {
		log.Printf("Failed to get user profile for update: %v", err)
		return
	}
	
	// Calculate updated statistics
	var behaviors []models.UserReadingBehavior
	if err := database.DB.Where("user_id = ?", userID).
		Find(&behaviors).Error; err != nil {
		log.Printf("Failed to fetch behaviors for profile update: %v", err)
		return
	}
	
	if len(behaviors) == 0 {
		return
	}
	
	// Update aggregated statistics
	totalTime := 0
	totalScrollDepth := 0.0
	deviceCount := make(map[string]int)
	hourCount := make(map[int]int)
	
	for _, behavior := range behaviors {
		totalTime += behavior.ReadingTime
		totalScrollDepth += behavior.ScrollDepth
		deviceCount[behavior.DeviceType]++
		
		hour := behavior.CreatedAt.Hour()
		hourCount[hour]++
	}
	
	profile.AvgReadingTime = totalTime / len(behaviors)
	profile.AvgScrollDepth = totalScrollDepth / float64(len(behaviors))
	profile.TotalReadingTime = totalTime
	profile.ArticleCount = len(behaviors)
	profile.LastActive = time.Now()
	
	// Find most used device
	maxCount := 0
	for device, count := range deviceCount {
		if count > maxCount {
			maxCount = count
			profile.DevicePreference = device
		}
	}
	
	// Find most active hours
	type hourFreq struct {
		hour  int
		count int
	}
	
	var hourFreqs []hourFreq
	for hour, count := range hourCount {
		hourFreqs = append(hourFreqs, hourFreq{hour, count})
	}
	
	sort.Slice(hourFreqs, func(i, j int) bool {
		return hourFreqs[i].count > hourFreqs[j].count
	})
	
	// Store top 3 active hours
	var activeHours []int
	for i, hf := range hourFreqs {
		if i >= 3 {
			break
		}
		activeHours = append(activeHours, hf.hour)
	}
	
	activeHoursJSON, _ := json.Marshal(activeHours)
	profile.ActiveHours = string(activeHoursJSON)
	
	// Calculate interest vector (simplified)
	interests, err := bt.calculateUserInterests(userID)
	if err == nil {
		// Convert interests to vector (simplified representation)
		vector := bt.interestsToVector(interests)
		vectorJSON, _ := json.Marshal(vector)
		profile.InterestVector = string(vectorJSON)
	}
	
	// Update in database
	if err := database.DB.Save(profile).Error; err != nil {
		log.Printf("Failed to update user profile: %v", err)
		return
	}
	
	// Update cache
	bt.profileCache.Store(userID, profile)
}

// calculateUserInterests calculates user interests from reading behavior
func (bt *BehaviorTracker) calculateUserInterests(userID string) (*UserInterests, error) {
	var behaviors []models.UserReadingBehavior
	if err := database.DB.Preload("Article").Preload("Article.Category").
		Where("user_id = ? AND interaction_type = 'view'", userID).
		Find(&behaviors).Error; err != nil {
		return nil, err
	}
	
	interests := &UserInterests{
		Topics:     make(map[string]float64),
		Categories: make(map[string]float64),
		Keywords:   make(map[string]float64),
		Languages:  make(map[string]float64),
	}
	
	for _, behavior := range behaviors {
		if behavior.Article.ID == 0 {
			continue
		}
		
		article := behavior.Article
		
		// Weight based on reading time and scroll depth
		weight := bt.calculateInterestWeight(behavior.ReadingTime, behavior.ScrollDepth)
		
		// Category interests
		if article.Category.Name != "" {
			interests.Categories[article.Category.Name] += weight
		}
		
		// Language preferences
		interests.Languages[behavior.Language] += weight
		
		// Extract keywords from title and summary
		keywords := bt.extractKeywordsFromText(article.Title + " " + article.Summary)
		for _, keyword := range keywords {
			interests.Keywords[keyword] += weight * 0.5 // Lower weight for keywords
		}
	}
	
	// Normalize scores
	bt.normalizeInterests(interests)
	
	return interests, nil
}

// calculateInterestWeight calculates interest weight based on engagement
func (bt *BehaviorTracker) calculateInterestWeight(readingTime int, scrollDepth float64) float64 {
	// Base weight
	weight := 1.0
	
	// Increase weight for longer reading time
	if readingTime > 60 {
		weight += 0.5
	}
	if readingTime > 300 {
		weight += 0.5
	}
	
	// Increase weight for higher scroll depth
	weight += scrollDepth
	
	return weight
}

// extractKeywordsFromText extracts keywords from text (simplified)
func (bt *BehaviorTracker) extractKeywordsFromText(text string) []string {
	words := strings.Fields(strings.ToLower(text))
	
	// Filter out common stop words and short words
	stopWords := map[string]bool{
		"the": true, "and": true, "or": true, "but": true, "in": true, "on": true, "at": true,
		"to": true, "for": true, "of": true, "with": true, "by": true, "is": true, "are": true,
		"was": true, "were": true, "be": true, "been": true, "have": true, "has": true, "had": true,
		"一个": true, "这个": true, "那个": true, "我们": true, "它们": true, "可以": true, "应该": true,
	}
	
	var keywords []string
	for _, word := range words {
		if len(word) > 2 && !stopWords[word] {
			keywords = append(keywords, word)
		}
	}
	
	return keywords
}

// normalizeInterests normalizes interest scores
func (bt *BehaviorTracker) normalizeInterests(interests *UserInterests) {
	// Normalize each category separately
	bt.normalizeMap(interests.Topics)
	bt.normalizeMap(interests.Categories)
	bt.normalizeMap(interests.Keywords)
	bt.normalizeMap(interests.Languages)
}

// normalizeMap normalizes a map of scores
func (bt *BehaviorTracker) normalizeMap(m map[string]float64) {
	if len(m) == 0 {
		return
	}
	
	// Find max value
	max := 0.0
	for _, value := range m {
		if value > max {
			max = value
		}
	}
	
	if max == 0 {
		return
	}
	
	// Normalize to 0-1 range
	for key, value := range m {
		m[key] = value / max
	}
}

// interestsToVector converts interests to a numerical vector
func (bt *BehaviorTracker) interestsToVector(interests *UserInterests) []float64 {
	// Simplified: create a vector based on top interests
	vector := make([]float64, 50) // Fixed size vector
	
	index := 0
	
	// Add category interests
	for _, score := range interests.Categories {
		if index >= len(vector) {
			break
		}
		vector[index] = score
		index++
	}
	
	// Add language preferences
	for _, score := range interests.Languages {
		if index >= len(vector) {
			break
		}
		vector[index] = score
		index++
	}
	
	// Fill remaining with keyword interests
	for _, score := range interests.Keywords {
		if index >= len(vector) {
			break
		}
		vector[index] = score * 0.5 // Lower weight for keywords
		index++
	}
	
	return vector
}

// cosineSimilarity calculates cosine similarity between two vectors
func (bt *BehaviorTracker) cosineSimilarity(a, b []float64) float64 {
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

// analyzeReadingPatterns analyzes reading patterns from behaviors
func (bt *BehaviorTracker) analyzeReadingPatterns(behaviors []models.UserReadingBehavior) *ReadingPatterns {
	if len(behaviors) == 0 {
		return &ReadingPatterns{}
	}
	
	patterns := &ReadingPatterns{
		DeviceDistribution: make(map[string]int),
		TopicInterests:     make(map[string]float64),
		CategoryInterests:  make(map[string]float64),
		ReadingFrequency:   make(map[string]int),
	}
	
	totalTime := 0
	totalScrollDepth := 0.0
	hourCount := make(map[int]int)
	
	for _, behavior := range behaviors {
		totalTime += behavior.ReadingTime
		totalScrollDepth += behavior.ScrollDepth
		patterns.DeviceDistribution[behavior.DeviceType]++
		
		hour := behavior.CreatedAt.Hour()
		hourCount[hour]++
		
		weekday := behavior.CreatedAt.Weekday().String()
		patterns.ReadingFrequency[weekday]++
		
		// Add category interest
		if behavior.Article.Category.Name != "" {
			weight := bt.calculateInterestWeight(behavior.ReadingTime, behavior.ScrollDepth)
			patterns.CategoryInterests[behavior.Article.Category.Name] += weight
		}
	}
	
	patterns.TotalReadingTime = totalTime
	patterns.AverageReadingTime = totalTime / len(behaviors)
	patterns.AverageScrollDepth = totalScrollDepth / float64(len(behaviors))
	
	// Calculate reading speed (words per minute)
	// Simplified: assume 200 words per minute as baseline
	if patterns.AverageReadingTime > 0 {
		patterns.ReadingSpeed = 200.0 * (60.0 / float64(patterns.AverageReadingTime))
	}
	
	// Find top 3 preferred hours
	type hourFreq struct {
		hour  int
		count int
	}
	
	var hourFreqs []hourFreq
	for hour, count := range hourCount {
		hourFreqs = append(hourFreqs, hourFreq{hour, count})
	}
	
	sort.Slice(hourFreqs, func(i, j int) bool {
		return hourFreqs[i].count > hourFreqs[j].count
	})
	
	for i, hf := range hourFreqs {
		if i >= 3 {
			break
		}
		patterns.PreferredHours = append(patterns.PreferredHours, hf.hour)
	}
	
	return patterns
}

// periodicProfileUpdate runs periodic profile updates
func (bt *BehaviorTracker) periodicProfileUpdate() {
	ticker := time.NewTicker(time.Hour) // Update profiles every hour
	defer ticker.Stop()
	
	for {
		select {
		case <-ticker.C:
			bt.updateAllActiveProfiles()
		case <-bt.stopChan:
			return
		}
	}
}

// updateAllActiveProfiles updates profiles for recently active users
func (bt *BehaviorTracker) updateAllActiveProfiles() {
	// Get users active in the last 24 hours
	since := time.Now().Add(-24 * time.Hour)
	
	var userIDs []string
	if err := database.DB.Model(&models.UserReadingBehavior{}).
		Where("created_at >= ?", since).
		Distinct("user_id").
		Pluck("user_id", &userIDs).Error; err != nil {
		log.Printf("Failed to get active users: %v", err)
		return
	}
	
	// Update profiles in background
	for _, userID := range userIDs {
		go bt.updateUserProfile(userID)
	}
}

// RecentUser represents a recently active user with summary info
type RecentUser struct {
	UserID           string    `json:"user_id"`
	LastActive       time.Time `json:"last_active"`
	TotalReadingTime int       `json:"total_reading_time"`
	ArticleCount     int       `json:"article_count"`
	DevicePreference string    `json:"device_preference"`
	Language         string    `json:"language"`
	AvgScrollDepth   float64   `json:"avg_scroll_depth"`
}

// GetRecentUsers returns a list of recently active users with summary information
func (bt *BehaviorTracker) GetRecentUsers(limit, offset, days int) ([]RecentUser, error) {
	since := time.Now().AddDate(0, 0, -days)
	
	// Query to get recent users with aggregated data
	var results []struct {
		UserID           string  `gorm:"column:user_id"`
		LastActive       string  `gorm:"column:last_active"`
		TotalReadingTime int     `gorm:"column:total_reading_time"`
		ArticleCount     int64   `gorm:"column:article_count"`
		Language         string  `gorm:"column:language"`
		AvgScrollDepth   float64 `gorm:"column:avg_scroll_depth"`
	}
	
	// Get aggregated user data from reading behaviors
	err := database.DB.Table("user_reading_behaviors").
		Select(`
			user_id,
			MAX(created_at) as last_active,
			SUM(reading_time) as total_reading_time,
			COUNT(DISTINCT article_id) as article_count,
			language,
			CASE 
				WHEN AVG(scroll_depth) > 1.0 THEN AVG(scroll_depth) / 100.0
				ELSE AVG(scroll_depth)
			END as avg_scroll_depth
		`).
		Where("created_at >= ? AND interaction_type = 'view'", since).
		Group("user_id, language").
		Having("COUNT(*) > 0").
		Order("last_active DESC").
		Limit(limit).
		Offset(offset).
		Find(&results).Error
	
	if err != nil {
		return nil, fmt.Errorf("failed to get recent users: %w", err)
	}
	
	// Convert results to RecentUser structs and enrich with profile data
	var recentUsers []RecentUser
	for _, result := range results {
		// Parse the last_active string to time.Time
		lastActive, err := time.Parse(time.RFC3339, result.LastActive)
		if err != nil {
			// Try alternative time formats if RFC3339 fails
			if lastActive, err = time.Parse("2006-01-02 15:04:05", result.LastActive); err != nil {
				// If all parsing fails, use current time
				lastActive = time.Now()
			}
		}
		
		// Normalize scroll depth to ensure it's between 0 and 1
		scrollDepth := result.AvgScrollDepth
		if scrollDepth > 1.0 {
			scrollDepth = scrollDepth / 100.0
		}
		// Ensure it's not more than 1.0 (100%)
		if scrollDepth > 1.0 {
			scrollDepth = 1.0
		}
		
		user := RecentUser{
			UserID:           result.UserID,
			LastActive:       lastActive,
			TotalReadingTime: result.TotalReadingTime,
			ArticleCount:     int(result.ArticleCount),
			Language:         result.Language,
			AvgScrollDepth:   scrollDepth,
		}
		
		// Try to get device preference from user profile
		if profile, err := bt.GetUserProfile(result.UserID); err == nil && profile != nil {
			user.DevicePreference = profile.DevicePreference
		} else {
			// Fallback: get most recent device type from behaviors
			var deviceInfo string
			database.DB.Table("user_reading_behaviors").
				Select("device_info").
				Where("user_id = ?", result.UserID).
				Order("created_at DESC").
				Limit(1).
				Pluck("device_info", &deviceInfo)
			
			if deviceInfo != "" {
				var device DeviceInfo
				if err := json.Unmarshal([]byte(deviceInfo), &device); err == nil {
					user.DevicePreference = device.DeviceType
				}
			}
		}
		
		recentUsers = append(recentUsers, user)
	}
	
	return recentUsers, nil
}

// Stop stops the behavior tracker
func (bt *BehaviorTracker) Stop() {
	close(bt.stopChan)
}

// Global behavior tracker instance
var globalBehaviorTracker *BehaviorTracker

// GetGlobalBehaviorTracker returns the global behavior tracker instance
func GetGlobalBehaviorTracker() *BehaviorTracker {
	if globalBehaviorTracker == nil {
		globalBehaviorTracker = NewBehaviorTracker()
	}
	return globalBehaviorTracker
}