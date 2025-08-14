package models

import (
	"time"
	"gorm.io/gorm"
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
	// SEO Fields
	SEOTitle       string             `gorm:"size:255" json:"seo_title"`
	SEODescription string             `gorm:"size:500" json:"seo_description"`
	SEOKeywords    string             `gorm:"size:255" json:"seo_keywords"`
	SEOSlug        string             `gorm:"size:255;index" json:"seo_slug"`
	CreatedAt      time.Time          `json:"created_at"`
	UpdatedAt      time.Time          `json:"updated_at"`
	DeletedAt      gorm.DeletedAt     `gorm:"index" json:"-"`
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
	ID          uint                      `gorm:"primaryKey" json:"id"`
	SiteTitle   string                    `gorm:"default:'Blog'" json:"site_title"`
	SiteSubtitle string                   `gorm:"default:'A minimalist space for thoughts and ideas'" json:"site_subtitle"`
	FooterText  string                    `gorm:"default:'© 2025 xuemian168'" json:"footer_text"`
	ICPFiling   string                    `gorm:"size:255" json:"icp_filing"`
	PSBFiling   string                    `gorm:"size:255" json:"psb_filing"`
	ShowViewCount bool                    `gorm:"default:true" json:"show_view_count"`
	ShowSiteTitle bool                    `gorm:"default:true" json:"show_site_title"`
	EnableSoundEffects bool               `gorm:"default:true" json:"enable_sound_effects"`
	DefaultLanguage string                `gorm:"default:'zh';size:10" json:"default_language"`
	LogoURL     string                    `gorm:"size:255" json:"logo_url"`
	FaviconURL  string                    `gorm:"size:255" json:"favicon_url"`
	CustomCSS   string                    `gorm:"type:text" json:"custom_css"`
	ThemeConfig string                    `gorm:"type:text" json:"theme_config"`
	ActiveTheme string                    `gorm:"size:100" json:"active_theme"`
	SetupCompleted bool                   `gorm:"default:false" json:"setup_completed"`
	Translations []SiteSettingsTranslation `gorm:"foreignKey:SettingsID" json:"translations,omitempty"`
	CreatedAt   time.Time                 `json:"created_at"`
	UpdatedAt   time.Time                 `json:"updated_at"`
}

type SiteSettingsTranslation struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	SettingsID uint      `gorm:"not null;index" json:"settings_id"`
	Language   string    `gorm:"not null;size:10;index" json:"language"`
	SiteTitle  string    `gorm:"not null" json:"site_title"`
	SiteSubtitle string  `gorm:"not null" json:"site_subtitle"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

type User struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	Username    string         `gorm:"unique;not null" json:"username"`
	Password    string         `gorm:"not null" json:"-"`
	IsAdmin     bool           `gorm:"default:true" json:"is_admin"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
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
	ID         uint      `gorm:"primaryKey" json:"id"`
	ArticleID  uint      `gorm:"not null;index" json:"article_id"`
	IPAddress  string    `gorm:"not null;size:45" json:"ip_address"`
	UserAgent  string    `gorm:"size:500" json:"user_agent"`
	Fingerprint string   `gorm:"size:64;index" json:"fingerprint"`
	CreatedAt  time.Time `json:"created_at"`
	
	// Geographic information
	Country    string    `gorm:"size:100;index" json:"country"`
	Region     string    `gorm:"size:100" json:"region"`
	City       string    `gorm:"size:100" json:"city"`
	
	// Browser information
	Browser        string `gorm:"size:50;index" json:"browser"`
	BrowserVersion string `gorm:"size:20" json:"browser_version"`
	
	// Operating system information
	OS         string `gorm:"size:50;index" json:"os"`
	OSVersion  string `gorm:"size:20" json:"os_version"`
	
	// Device information
	DeviceType string `gorm:"size:20;index" json:"device_type"` // desktop, mobile, tablet
	Platform   string `gorm:"size:30;index" json:"platform"`   // Windows, macOS, iOS, Android, Linux
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
	ID           uint      `gorm:"primaryKey" json:"id"`
	ServiceType  string    `gorm:"not null;size:50;index" json:"service_type"` // "summary", "translation", "seo"
	Provider     string    `gorm:"not null;size:50;index" json:"provider"`     // "openai", "gemini", "deepl", etc.
	Model        string    `gorm:"size:100" json:"model"`                      // specific model used
	Operation    string    `gorm:"not null;size:100" json:"operation"`         // "generate_summary", "translate_text", etc.
	
	// Token usage
	InputTokens  int       `gorm:"default:0" json:"input_tokens"`
	OutputTokens int       `gorm:"default:0" json:"output_tokens"`
	TotalTokens  int       `gorm:"default:0" json:"total_tokens"`
	
	// Cost tracking
	EstimatedCost float64  `gorm:"type:decimal(10,6);default:0" json:"estimated_cost"`
	Currency      string   `gorm:"size:10;default:'USD'" json:"currency"`
	
	// Request metadata
	Language     string    `gorm:"size:10" json:"language"`
	InputLength  int       `gorm:"default:0" json:"input_length"`  // character count of input
	OutputLength int       `gorm:"default:0" json:"output_length"` // character count of output
	
	// Performance metrics
	ResponseTime int       `gorm:"default:0" json:"response_time"` // milliseconds
	Success      bool      `gorm:"default:true" json:"success"`
	ErrorMessage string    `gorm:"type:text" json:"error_message,omitempty"`
	
	// Context
	ArticleID    *uint     `gorm:"index" json:"article_id,omitempty"`    // if related to specific article
	UserAgent    string    `gorm:"size:500" json:"user_agent,omitempty"`
	IPAddress    string    `gorm:"size:45" json:"ip_address,omitempty"`
	
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
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