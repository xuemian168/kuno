package models

import (
	"gorm.io/gorm"
	"time"
)

type Article struct {
	ID           uint                 `gorm:"primaryKey" json:"id"`
	Title        string               `gorm:"not null" json:"title"`
	Content      string               `gorm:"type:text" json:"content"`
	ContentType  string               `gorm:"default:'markdown'" json:"content_type"`
	Summary      string               `gorm:"type:text" json:"summary"`
	CategoryID   uint                 `json:"category_id"`
	Category     Category             `gorm:"foreignKey:CategoryID" json:"category"`
	DefaultLang  string               `gorm:"default:'zh'" json:"default_lang"`
	Translations []ArticleTranslation `gorm:"foreignKey:ArticleID" json:"translations,omitempty"`
	ViewCount    uint                 `gorm:"default:0" json:"view_count"`
	// Pinned Fields
	IsPinned bool       `gorm:"default:false" json:"is_pinned"`
	PinOrder int        `gorm:"default:0" json:"pin_order"`
	PinnedAt *time.Time `json:"pinned_at,omitempty"`
	// SEO Fields
	SEOTitle       string         `gorm:"size:255" json:"seo_title"`
	SEODescription string         `gorm:"size:500" json:"seo_description"`
	SEOKeywords    string         `gorm:"size:255" json:"seo_keywords"`
	SEOSlug        string         `gorm:"size:255;index" json:"seo_slug"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`
}

type Category struct {
	ID           uint                  `gorm:"primaryKey" json:"id"`
	Name         string                `gorm:"unique;not null" json:"name"`
	Description  string                `json:"description"`
	DefaultLang  string                `gorm:"default:'zh'" json:"default_lang"`
	Articles     []Article             `gorm:"foreignKey:CategoryID" json:"articles,omitempty"`
	Translations []CategoryTranslation `gorm:"foreignKey:CategoryID" json:"translations,omitempty"`
	CreatedAt    time.Time             `json:"created_at"`
	UpdatedAt    time.Time             `json:"updated_at"`
	DeletedAt    gorm.DeletedAt        `gorm:"index" json:"-"`
}

type SiteSettings struct {
	ID                 uint   `gorm:"primaryKey" json:"id"`
	SiteTitle          string `gorm:"default:'Blog'" json:"site_title"`
	SiteSubtitle       string `gorm:"default:'A minimalist space for thoughts and ideas'" json:"site_subtitle"`
	FooterText         string `gorm:"default:'© 2025 xuemian168'" json:"footer_text"`
	ICPFiling          string `gorm:"size:255" json:"icp_filing"`
	PSBFiling          string `gorm:"size:255" json:"psb_filing"`
	ShowViewCount      bool   `gorm:"default:true" json:"show_view_count"`
	ShowSiteTitle      bool   `gorm:"default:true" json:"show_site_title"`
	EnableSoundEffects bool   `gorm:"default:true" json:"enable_sound_effects"`
	DefaultLanguage    string `gorm:"default:'zh';size:10" json:"default_language"`
	LogoURL            string `gorm:"size:255" json:"logo_url"`
	FaviconURL         string `gorm:"size:255" json:"favicon_url"`
	CustomCSS          string `gorm:"type:text" json:"custom_css"`
	CustomJS           string `gorm:"type:text" json:"custom_js"`
	ThemeConfig        string `gorm:"type:text" json:"theme_config"`
	ActiveTheme        string `gorm:"size:100" json:"active_theme"`
	// Background Settings
	BackgroundType     string  `gorm:"default:'none';size:20" json:"background_type"` // "none", "color", "image"
	BackgroundColor    string  `gorm:"size:20" json:"background_color"`               // hex color value
	BackgroundImageURL string  `gorm:"size:255" json:"background_image_url"`          // background image URL
	BackgroundOpacity  float64 `gorm:"default:0.8" json:"background_opacity"`         // 0.0 to 1.0
	SetupCompleted     bool    `gorm:"default:false" json:"setup_completed"`
	// AI API Configuration
	AIConfig string `gorm:"type:text" json:"ai_config"`
	// Privacy and Indexing Control
	BlockSearchEngines bool                      `gorm:"default:false" json:"block_search_engines"`
	BlockAITraining    bool                      `gorm:"default:false" json:"block_ai_training"`
	Translations       []SiteSettingsTranslation `gorm:"foreignKey:SettingsID" json:"translations,omitempty"`
	CreatedAt          time.Time                 `json:"created_at"`
	UpdatedAt          time.Time                 `json:"updated_at"`
}

type SiteSettingsTranslation struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	SettingsID   uint      `gorm:"not null;index" json:"settings_id"`
	Language     string    `gorm:"not null;size:10;index" json:"language"`
	SiteTitle    string    `gorm:"not null" json:"site_title"`
	SiteSubtitle string    `gorm:"not null" json:"site_subtitle"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// AIProviderConfig represents AI API configuration for different providers
type AIProviderConfig struct {
	Provider string            `json:"provider"` // "openai", "gemini", "volcano"
	APIKey   string            `json:"api_key"`
	Model    string            `json:"model"`
	Enabled  bool              `json:"enabled"`
	Settings map[string]string `json:"settings,omitempty"` // Additional provider-specific settings
}

// AIConfig represents global AI configuration
type AIConfig struct {
	DefaultProvider string                      `json:"default_provider"`
	Providers       map[string]AIProviderConfig `json:"providers"`
	EmbeddingConfig struct {
		DefaultProvider string `json:"default_provider"`
		Enabled         bool   `json:"enabled"`
	} `json:"embedding_config"`
}

type User struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	Username  string         `gorm:"unique;not null" json:"username"`
	Password  string         `gorm:"not null" json:"-"`
	IsAdmin   bool           `gorm:"default:true" json:"is_admin"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

type ArticleTranslation struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	ArticleID uint      `gorm:"not null;index" json:"article_id"`
	Language  string    `gorm:"not null;size:10;index" json:"language"`
	Title     string    `gorm:"not null" json:"title"`
	Content   string    `gorm:"type:text" json:"content"`
	Summary   string    `gorm:"type:text" json:"summary"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type CategoryTranslation struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	CategoryID  uint      `gorm:"not null;index" json:"category_id"`
	Language    string    `gorm:"not null;size:10;index" json:"language"`
	Name        string    `gorm:"not null" json:"name"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// ArticleView tracks unique visitors for each article with detailed analytics
type ArticleView struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	ArticleID   uint      `gorm:"not null;index" json:"article_id"`
	IPAddress   string    `gorm:"not null;size:45" json:"ip_address"`
	UserAgent   string    `gorm:"size:500" json:"user_agent"`
	Fingerprint string    `gorm:"size:64;index" json:"fingerprint"`
	CreatedAt   time.Time `json:"created_at"`

	// Geographic information
	Country string `gorm:"size:100;index" json:"country"`
	Region  string `gorm:"size:100" json:"region"`
	City    string `gorm:"size:100" json:"city"`

	// Browser information
	Browser        string `gorm:"size:50;index" json:"browser"`
	BrowserVersion string `gorm:"size:20" json:"browser_version"`

	// Operating system information
	OS        string `gorm:"size:50;index" json:"os"`
	OSVersion string `gorm:"size:20" json:"os_version"`

	// Device information
	DeviceType string `gorm:"size:20;index" json:"device_type"` // desktop, mobile, tablet
	Platform   string `gorm:"size:30;index" json:"platform"`    // Windows, macOS, iOS, Android, Linux
}

// Analytics statistics structures for efficient querying
type GeographicStats struct {
	Country      string `json:"country"`
	Region       string `json:"region"`
	City         string `json:"city"`
	VisitorCount int64  `json:"visitor_count"`
	ViewCount    int64  `json:"view_count"`
}

type BrowserStats struct {
	Browser        string `json:"browser"`
	BrowserVersion string `json:"browser_version"`
	VisitorCount   int64  `json:"visitor_count"`
	ViewCount      int64  `json:"view_count"`
}

type PlatformStats struct {
	OS           string `json:"os"`
	OSVersion    string `json:"os_version"`
	Platform     string `json:"platform"`
	DeviceType   string `json:"device_type"`
	VisitorCount int64  `json:"visitor_count"`
	ViewCount    int64  `json:"view_count"`
}

// SocialMedia represents social media links
type SocialMedia struct {
	ID           uint           `gorm:"primaryKey" json:"id"`
	Platform     string         `gorm:"not null;size:50" json:"platform"`
	URL          string         `gorm:"not null" json:"url"`
	IconName     string         `gorm:"size:50" json:"icon_name"`
	DisplayOrder int            `gorm:"default:0" json:"display_order"`
	IsActive     bool           `gorm:"default:true" json:"is_active"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}

// AIUsageRecord tracks AI service usage for analytics and cost monitoring
type AIUsageRecord struct {
	ID          uint   `gorm:"primaryKey" json:"id"`
	ServiceType string `gorm:"not null;size:50;index" json:"service_type"` // "summary", "translation", "seo"
	Provider    string `gorm:"not null;size:50;index" json:"provider"`     // "openai", "gemini", "deepl", etc.
	Model       string `gorm:"size:100" json:"model"`                      // specific model used
	Operation   string `gorm:"not null;size:100" json:"operation"`         // "generate_summary", "translate_text", etc.

	// Token usage
	InputTokens  int `gorm:"default:0" json:"input_tokens"`
	OutputTokens int `gorm:"default:0" json:"output_tokens"`
	TotalTokens  int `gorm:"default:0" json:"total_tokens"`

	// Cost tracking
	EstimatedCost float64 `gorm:"type:decimal(10,6);default:0" json:"estimated_cost"`
	Currency      string  `gorm:"size:10;default:'USD'" json:"currency"`

	// Request metadata
	Language     string `gorm:"size:10" json:"language"`
	InputLength  int    `gorm:"default:0" json:"input_length"`  // character count of input
	OutputLength int    `gorm:"default:0" json:"output_length"` // character count of output

	// Performance metrics
	ResponseTime int    `gorm:"default:0" json:"response_time"` // milliseconds
	Success      bool   `gorm:"default:true" json:"success"`
	ErrorMessage string `gorm:"type:text" json:"error_message,omitempty"`

	// Context
	ArticleID *uint  `gorm:"index" json:"article_id,omitempty"` // if related to specific article
	UserAgent string `gorm:"size:500" json:"user_agent,omitempty"`
	IPAddress string `gorm:"size:45" json:"ip_address,omitempty"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// AIUsageStats aggregated statistics for reporting
type AIUsageStats struct {
	ServiceType     string  `json:"service_type"`
	Provider        string  `json:"provider"`
	TotalRequests   int64   `json:"total_requests"`
	SuccessRequests int64   `json:"success_requests"`
	TotalTokens     int64   `json:"total_tokens"`
	TotalCost       float64 `json:"total_cost"`
	Currency        string  `json:"currency"`
	AvgResponseTime float64 `json:"avg_response_time"`
}

// ArticleEmbedding stores vector embeddings for articles to enable semantic search
type ArticleEmbedding struct {
	ID          uint   `gorm:"primaryKey" json:"id"`
	ArticleID   uint   `gorm:"not null;index" json:"article_id"`
	ContentType string `gorm:"not null;size:20;index" json:"content_type"` // "title", "content", "summary", "combined"
	Language    string `gorm:"not null;size:10;index" json:"language"`     // language code
	Provider    string `gorm:"not null;size:50" json:"provider"`           // "openai", "gemini", etc.
	Model       string `gorm:"size:100" json:"model"`                      // specific model used for embedding

	// Vector data - storing as JSON string for simplicity and SQLite compatibility
	Embedding  string `gorm:"type:text;not null" json:"embedding"` // JSON array of floats
	Dimensions int    `gorm:"not null" json:"dimensions"`          // vector dimensions (e.g., 1536 for OpenAI)

	// Metadata for tracking and versioning
	ContentHash string `gorm:"size:64;index" json:"content_hash"` // SHA256 hash of content
	TokenCount  int    `gorm:"default:0" json:"token_count"`      // tokens used for embedding

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	// Foreign key relationship
	Article Article `gorm:"foreignKey:ArticleID" json:"article,omitempty"`
}

// EmbeddingSearchResult represents a search result with similarity score
type EmbeddingSearchResult struct {
	ArticleID    uint      `json:"article_id"`
	Title        string    `json:"title"`
	Summary      string    `json:"summary"`
	CategoryName string    `json:"category_name"`
	Language     string    `json:"language"`
	Similarity   float64   `json:"similarity"`
	ViewCount    uint      `json:"view_count"`
	CreatedAt    time.Time `json:"created_at"`
}

// SearchIndex tracks search performance and caching
type SearchIndex struct {
	ID               uint      `gorm:"primaryKey" json:"id"`
	IndexType        string    `gorm:"not null;size:50;index" json:"index_type"` // "embedding", "keyword", "hybrid"
	Language         string    `gorm:"size:10;index" json:"language"`
	TotalDocuments   int       `gorm:"default:0" json:"total_documents"`
	LastUpdated      time.Time `json:"last_updated"`
	LastRebuild      time.Time `json:"last_rebuild"`
	AverageQueryTime float64   `gorm:"default:0" json:"average_query_time"` // milliseconds
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

// SearchCache stores cached search results and popular queries
type SearchCache struct {
	ID          uint       `gorm:"primaryKey" json:"id"`
	CacheKey    string     `gorm:"unique;not null;size:255" json:"cache_key"`
	CacheValue  string     `gorm:"type:text;not null" json:"cache_value"` // JSON string
	AccessCount int        `gorm:"default:1" json:"access_count"`
	ExpiresAt   *time.Time `gorm:"index" json:"expires_at"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

// PopularQuery tracks frequently searched queries
type PopularQuery struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	QueryHash    string    `gorm:"unique;not null;size:64" json:"query_hash"`
	QueryText    string    `gorm:"type:text;not null" json:"query_text"`
	HitCount     int       `gorm:"default:1" json:"hit_count"`
	Language     string    `gorm:"size:10;index" json:"language"`
	LastAccessed time.Time `gorm:"default:CURRENT_TIMESTAMP" json:"last_accessed"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// ContentQualityAnalysis stores article content quality analysis results
type ContentQualityAnalysis struct {
	ID               uint      `gorm:"primaryKey" json:"id"`
	ArticleID        uint      `gorm:"not null;index" json:"article_id"`
	TopicClusters    string    `gorm:"type:text" json:"topic_clusters"`    // JSON format
	ContentScore     float64   `gorm:"default:0" json:"content_score"`     // Content quality score
	KeywordDensity   string    `gorm:"type:text" json:"keyword_density"`   // JSON format
	ReadabilityScore float64   `gorm:"default:0" json:"readability_score"` // Readability score
	OriginalityScore float64   `gorm:"default:0" json:"originality_score"` // Originality score
	SEOScore         float64   `gorm:"default:0" json:"seo_score"`         // SEO optimization score
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`

	// Foreign key relationship
	Article Article `gorm:"foreignKey:ArticleID" json:"article,omitempty"`
}

// WritingSuggestion stores AI-generated writing suggestions
type WritingSuggestion struct {
	ID             uint      `gorm:"primaryKey" json:"id"`
	SuggestionType string    `gorm:"not null;size:50;index" json:"suggestion_type"` // 'topic_gap', 'keyword', 'tag', 'seo'
	Content        string    `gorm:"type:text;not null" json:"content"`
	RelevanceScore float64   `gorm:"default:0" json:"relevance_score"`
	Language       string    `gorm:"size:10;index" json:"language"`
	CategoryID     *uint     `gorm:"index" json:"category_id"`
	IsUsed         bool      `gorm:"default:false" json:"is_used"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`

	// Foreign key relationships
	Category *Category `gorm:"foreignKey:CategoryID" json:"category,omitempty"`
}

// UserReadingBehavior tracks user reading patterns and engagement
type UserReadingBehavior struct {
	ID              uint      `gorm:"primaryKey" json:"id"`
	UserID          string    `gorm:"size:255;index;not null" json:"user_id"` // IP fingerprint or session ID
	ArticleID       uint      `gorm:"not null;index" json:"article_id"`
	SessionID       string    `gorm:"size:255;index" json:"session_id"`
	ReadingTime     int       `gorm:"default:0" json:"reading_time"`         // Reading time in seconds
	ScrollDepth     float64   `gorm:"default:0" json:"scroll_depth"`         // Scroll depth percentage (0-1)
	InteractionType string    `gorm:"size:20;index" json:"interaction_type"` // 'view', 'share', 'comment', 'like'
	DeviceType      string    `gorm:"size:20" json:"device_type"`            // 'desktop', 'mobile', 'tablet'
	Language        string    `gorm:"size:10;index" json:"language"`
	ReferrerType    string    `gorm:"size:50" json:"referrer_type"` // 'search', 'social', 'direct', 'internal'
	UTMSource       string    `gorm:"size:100" json:"utm_source"`
	UTMMedium       string    `gorm:"size:100" json:"utm_medium"`
	UTMCampaign     string    `gorm:"size:100" json:"utm_campaign"`
	CreatedAt       time.Time `json:"created_at"`

	// Foreign key relationship
	Article Article `gorm:"foreignKey:ArticleID" json:"article,omitempty"`
}

// PersonalizedRecommendation stores personalized article recommendations
type PersonalizedRecommendation struct {
	ID                 uint       `gorm:"primaryKey" json:"id"`
	UserID             string     `gorm:"size:255;index;not null" json:"user_id"`
	ArticleID          uint       `gorm:"not null;index" json:"article_id"`
	RecommendationType string     `gorm:"size:50;index" json:"recommendation_type"` // 'reading_path', 'similar_interest', 'trending', 'collaborative'
	Confidence         float64    `gorm:"default:0" json:"confidence"`              // Recommendation confidence (0-1)
	ReasonType         string     `gorm:"size:50" json:"reason_type"`               // 'similar_content', 'reading_history', 'popular_among_similar_users'
	ReasonDetails      string     `gorm:"type:text" json:"reason_details"`          // JSON details about why this was recommended
	Position           int        `gorm:"default:0" json:"position"`                // Position in recommendation list
	Category           string     `gorm:"size:50;index" json:"category"`            // 'learning', 'discovery'
	IsLearningPath     bool       `gorm:"default:false" json:"is_learning_path"`    // Whether this is part of a learning path
	IsClicked          bool       `gorm:"default:false" json:"is_clicked"`
	IsViewed           bool       `gorm:"default:false" json:"is_viewed"`
	ClickedAt          *time.Time `json:"clicked_at"`
	ViewedAt           *time.Time `json:"viewed_at"`
	CreatedAt          time.Time  `json:"created_at"`
	UpdatedAt          time.Time  `json:"updated_at"`

	// Foreign key relationship
	Article Article `gorm:"foreignKey:ArticleID" json:"article,omitempty"`
}

// UserProfile stores aggregated user preferences and interests
type UserProfile struct {
	ID               uint      `gorm:"primaryKey" json:"id"`
	UserID           string    `gorm:"size:255;unique;not null" json:"user_id"`
	Language         string    `gorm:"size:10;index" json:"language"`
	PreferredTopics  string    `gorm:"type:text" json:"preferred_topics"` // JSON array of topics
	ReadingSpeed     float64   `gorm:"default:0" json:"reading_speed"`    // Words per minute
	AvgReadingTime   int       `gorm:"default:0" json:"avg_reading_time"` // Average reading time in seconds
	AvgScrollDepth   float64   `gorm:"default:0" json:"avg_scroll_depth"` // Average scroll depth
	DevicePreference string    `gorm:"size:20" json:"device_preference"`  // Most used device type
	ActiveHours      string    `gorm:"type:text" json:"active_hours"`     // JSON array of preferred reading hours
	InterestVector   string    `gorm:"type:text" json:"interest_vector"`  // JSON array representing user interests as vector
	LastActive       time.Time `json:"last_active"`
	TotalReadingTime int       `gorm:"default:0" json:"total_reading_time"` // Total reading time in seconds
	ArticleCount     int       `gorm:"default:0" json:"article_count"`      // Number of articles read
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}
