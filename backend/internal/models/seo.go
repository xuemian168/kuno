package models

import (
	"time"
	"gorm.io/gorm"
)

// SEOKeyword represents a tracked keyword for SEO monitoring
type SEOKeyword struct {
	ID             uint           `gorm:"primaryKey" json:"id"`
	ArticleID      *uint          `gorm:"index" json:"article_id,omitempty"`     // 可选，全站关键词跟踪
	Keyword        string         `gorm:"not null;index" json:"keyword"`
	Language       string         `gorm:"size:10;not null;index" json:"language"`
	TargetURL      string         `gorm:"size:500" json:"target_url"`            // 目标页面
	CurrentRank    int            `gorm:"default:0" json:"current_rank"`         // 当前排名
	BestRank       int            `gorm:"default:0" json:"best_rank"`            // 历史最佳排名
	SearchVolume   int            `gorm:"default:0" json:"search_volume"`        // 搜索量估值
	Difficulty     string         `gorm:"size:20;default:'medium'" json:"difficulty"` // easy/medium/hard
	TrackingStatus string         `gorm:"size:20;default:'active'" json:"tracking_status"` // active/paused
	Notes          string         `gorm:"type:text" json:"notes"`                // 备注
	Tags           string         `gorm:"size:500" json:"tags"`                  // 标签，逗号分隔
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`
	
	// Foreign key relationships
	Article        *Article       `gorm:"foreignKey:ArticleID" json:"article,omitempty"`
}

// SEOHealthCheck represents SEO health check results
type SEOHealthCheck struct {
	ID               uint           `gorm:"primaryKey" json:"id"`
	ArticleID        *uint          `gorm:"index" json:"article_id,omitempty"`    // null表示全站检查
	CheckType        string         `gorm:"not null;size:20" json:"check_type"`   // "article", "site", "auto"
	OverallScore     int            `gorm:"default:0" json:"overall_score"`       // 0-100
	TitleScore       int            `gorm:"default:0" json:"title_score"`
	DescriptionScore int            `gorm:"default:0" json:"description_score"`
	ContentScore     int            `gorm:"default:0" json:"content_score"`
	KeywordScore     int            `gorm:"default:0" json:"keyword_score"`
	TechnicalScore   int            `gorm:"default:0" json:"technical_score"`
	ReadabilityScore int            `gorm:"default:0" json:"readability_score"`
	IssuesFound      int            `gorm:"default:0" json:"issues_found"`
	CheckResults     string         `gorm:"type:text" json:"check_results"`       // JSON格式的详细结果
	Suggestions      string         `gorm:"type:text" json:"suggestions"`         // JSON格式的建议
	Language         string         `gorm:"size:10" json:"language"`
	CheckDuration    int            `gorm:"default:0" json:"check_duration"`      // 检查耗时（毫秒）
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
	DeletedAt        gorm.DeletedAt `gorm:"index" json:"-"`
	
	// Foreign key relationships
	Article          *Article       `gorm:"foreignKey:ArticleID" json:"article,omitempty"`
}

// SEOMetrics represents SEO performance metrics
type SEOMetrics struct {
	ID                uint           `gorm:"primaryKey" json:"id"`
	Date              time.Time      `gorm:"index;not null" json:"date"`           // 数据日期
	ArticleID         *uint          `gorm:"index" json:"article_id,omitempty"`    // null表示全站数据
	Language          string         `gorm:"size:10" json:"language"`
	OrganicViews      int            `gorm:"default:0" json:"organic_views"`       // 有机搜索访问量
	SearchImpressions int            `gorm:"default:0" json:"search_impressions"`  // 搜索展示次数
	SearchClicks      int            `gorm:"default:0" json:"search_clicks"`       // 搜索点击次数
	AvgPosition       float64        `gorm:"default:0" json:"avg_position"`        // 平均排名位置
	CTR               float64        `gorm:"default:0" json:"ctr"`                 // 点击率
	BounceRate        float64        `gorm:"default:0" json:"bounce_rate"`         // 跳出率
	AvgSessionTime    int            `gorm:"default:0" json:"avg_session_time"`    // 平均会话时长（秒）
	KeywordRankings   string         `gorm:"type:text" json:"keyword_rankings"`    // JSON格式的关键词排名数据
	TopQueries        string         `gorm:"type:text" json:"top_queries"`         // JSON格式的热门查询
	CreatedAt         time.Time      `json:"created_at"`
	UpdatedAt         time.Time      `json:"updated_at"`
	
	// Foreign key relationships
	Article           *Article       `gorm:"foreignKey:ArticleID" json:"article,omitempty"`
}

// SEOKeywordGroup represents grouped keywords for better organization
type SEOKeywordGroup struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	Name        string         `gorm:"not null;unique" json:"name"`
	Description string         `gorm:"type:text" json:"description"`
	Color       string         `gorm:"size:10" json:"color"`                // 分组颜色
	IsActive    bool           `gorm:"default:true" json:"is_active"`
	SortOrder   int            `gorm:"default:0" json:"sort_order"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

// SEOKeywordGroupMember represents the many-to-many relationship between keywords and groups
type SEOKeywordGroupMember struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	KeywordID  uint      `gorm:"not null;index" json:"keyword_id"`
	GroupID    uint      `gorm:"not null;index" json:"group_id"`
	CreatedAt  time.Time `json:"created_at"`
	
	// Foreign key relationships
	Keyword    SEOKeyword      `gorm:"foreignKey:KeywordID" json:"keyword"`
	Group      SEOKeywordGroup `gorm:"foreignKey:GroupID" json:"group"`
}

// SEOAutomationRule represents automated SEO check rules
type SEOAutomationRule struct {
	ID               uint           `gorm:"primaryKey" json:"id"`
	Name             string         `gorm:"not null" json:"name"`
	RuleType         string         `gorm:"not null;size:50" json:"rule_type"`        // "health_check", "keyword_monitor", "content_audit"
	TriggerCondition string         `gorm:"not null;size:50" json:"trigger_condition"` // "schedule", "on_publish", "on_update", "threshold"
	Schedule         string         `gorm:"size:100" json:"schedule"`                  // cron表达式
	TargetScope      string         `gorm:"size:50" json:"target_scope"`               // "all", "category", "specific_articles"
	TargetIDs        string         `gorm:"type:text" json:"target_ids"`               // JSON数组，目标文章或分类ID
	RuleConfig       string         `gorm:"type:text" json:"rule_config"`              // JSON格式的规则配置
	NotificationSettings string     `gorm:"type:text" json:"notification_settings"`   // JSON格式的通知设置
	IsActive         bool           `gorm:"default:true" json:"is_active"`
	LastRun          *time.Time     `json:"last_run,omitempty"`
	NextRun          *time.Time     `json:"next_run,omitempty"`
	RunCount         int            `gorm:"default:0" json:"run_count"`
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
	DeletedAt        gorm.DeletedAt `gorm:"index" json:"-"`
}

// SEONotification represents SEO-related notifications
type SEONotification struct {
	ID           uint           `gorm:"primaryKey" json:"id"`
	Type         string         `gorm:"not null;size:50" json:"type"`          // "health_alert", "ranking_change", "keyword_opportunity"
	Severity     string         `gorm:"size:20;default:'info'" json:"severity"` // "info", "warning", "error", "critical"
	Title        string         `gorm:"not null" json:"title"`
	Message      string         `gorm:"type:text" json:"message"`
	ArticleID    *uint          `gorm:"index" json:"article_id,omitempty"`
	KeywordID    *uint          `gorm:"index" json:"keyword_id,omitempty"`
	ActionURL    string         `gorm:"size:500" json:"action_url"`            // 相关操作链接
	IsRead       bool           `gorm:"default:false" json:"is_read"`
	IsArchived   bool           `gorm:"default:false" json:"is_archived"`
	ExpiresAt    *time.Time     `json:"expires_at,omitempty"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
	
	// Foreign key relationships
	Article      *Article       `gorm:"foreignKey:ArticleID" json:"article,omitempty"`
	Keyword      *SEOKeyword    `gorm:"foreignKey:KeywordID" json:"keyword,omitempty"`
}

// SEOTemplate represents reusable SEO templates
type SEOTemplate struct {
	ID           uint           `gorm:"primaryKey" json:"id"`
	Name         string         `gorm:"not null" json:"name"`
	Description  string         `gorm:"type:text" json:"description"`
	Type         string         `gorm:"not null;size:50" json:"type"`          // "title", "description", "keywords", "full"
	Language     string         `gorm:"size:10;not null" json:"language"`
	CategoryID   *uint          `gorm:"index" json:"category_id,omitempty"`    // 关联特定分类
	Template     string         `gorm:"type:text;not null" json:"template"`    // 模板内容，支持变量替换
	Variables    string         `gorm:"type:text" json:"variables"`            // JSON格式的可用变量说明
	IsDefault    bool           `gorm:"default:false" json:"is_default"`       // 是否为默认模板
	UsageCount   int            `gorm:"default:0" json:"usage_count"`          // 使用次数
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
	
	// Foreign key relationships
	Category     *Category      `gorm:"foreignKey:CategoryID" json:"category,omitempty"`
}

// Helper structs for API responses

// SEODashboardData represents comprehensive SEO dashboard data
type SEODashboardData struct {
	OverallScore         int                    `json:"overall_score"`
	TotalKeywords        int                    `json:"total_keywords"`
	RankingKeywords      int                    `json:"ranking_keywords"`
	OrganicTraffic       int                    `json:"organic_traffic"`
	SEOIssues           int                    `json:"seo_issues"`
	LastCheck           *time.Time             `json:"last_check,omitempty"`
	TrendDirection      string                 `json:"trend_direction"`      // "up", "down", "stable"
	TrendPercentage     float64                `json:"trend_percentage"`
	TopPerformingPages  []ArticlePerformance   `json:"top_performing_pages"`
	RecentImprovements  []SEOImprovement       `json:"recent_improvements"`
	UpcomingTasks       []SEOTask              `json:"upcoming_tasks"`
}

// ArticlePerformance represents article SEO performance data
type ArticlePerformance struct {
	ArticleID      uint    `json:"article_id"`
	Title          string  `json:"title"`
	URL            string  `json:"url"`
	SEOScore       int     `json:"seo_score"`
	OrganicTraffic int     `json:"organic_traffic"`
	KeywordCount   int     `json:"keyword_count"`
	AvgPosition    float64 `json:"avg_position"`
	CTR            float64 `json:"ctr"`
}

// SEOImprovement represents recent SEO improvements
type SEOImprovement struct {
	Type        string    `json:"type"`         // "technical", "content", "keywords"
	Description string    `json:"description"`
	Impact      string    `json:"impact"`
	ArticleID   *uint     `json:"article_id,omitempty"`
	Date        time.Time `json:"date"`
}

// SEOTask represents upcoming SEO tasks
type SEOTask struct {
	ID          uint      `json:"id"`
	Type        string    `json:"type"`         // "health_check", "keyword_review", "content_audit"
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Priority    string    `json:"priority"`     // "high", "medium", "low"
	DueDate     time.Time `json:"due_date"`
	ArticleID   *uint     `json:"article_id,omitempty"`
}

// SEOAnalysisResult represents comprehensive SEO analysis results
type SEOAnalysisResult struct {
	OverallScore        int                    `json:"overall_score"`
	TitleAnalysis       TitleAnalysis          `json:"title_analysis"`
	DescriptionAnalysis DescriptionAnalysis    `json:"description_analysis"`
	ContentAnalysis     ContentAnalysis        `json:"content_analysis"`
	KeywordAnalysis     KeywordAnalysis        `json:"keyword_analysis"`
	ReadabilityAnalysis ReadabilityAnalysis    `json:"readability_analysis"`
	TechnicalAnalysis   TechnicalAnalysis      `json:"technical_analysis"`
	Suggestions         []string               `json:"suggestions"`
	CreatedAt           time.Time              `json:"created_at"`
}

// Analysis sub-structures
type TitleAnalysis struct {
	Score          int      `json:"score"`
	Length         int      `json:"length"`
	OptimalLength  Range    `json:"optimal_length"`
	HasFocusKeyword bool    `json:"has_focus_keyword"`
	BrandIncluded  bool     `json:"brand_included"`
	Uniqueness     float64  `json:"uniqueness"`
	Issues         []string `json:"issues"`
	Suggestions    []string `json:"suggestions"`
}

type DescriptionAnalysis struct {
	Score             int      `json:"score"`
	Length            int      `json:"length"`
	OptimalLength     Range    `json:"optimal_length"`
	HasFocusKeyword   bool     `json:"has_focus_keyword"`
	HasCallToAction   bool     `json:"has_call_to_action"`
	Uniqueness        float64  `json:"uniqueness"`
	Issues            []string `json:"issues"`
	Suggestions       []string `json:"suggestions"`
}

type ContentAnalysis struct {
	Score              int               `json:"score"`
	WordCount          int               `json:"word_count"`
	ParagraphCount     int               `json:"paragraph_count"`
	HeadingStructure   HeadingStructure  `json:"heading_structure"`
	KeywordDensity     []KeywordDensity  `json:"keyword_density"`
	InternalLinks      int               `json:"internal_links"`
	ExternalLinks      int               `json:"external_links"`
	ImageOptimization  ImageOptimization `json:"image_optimization"`
	Issues             []string          `json:"issues"`
	Suggestions        []string          `json:"suggestions"`
}

type KeywordAnalysis struct {
	Score                 int                  `json:"score"`
	FocusKeywordUsage     int                  `json:"focus_keyword_usage"`
	KeywordDistribution   []KeywordDistribution `json:"keyword_distribution"`
	KeywordDensity        float64              `json:"keyword_density"`
	OptimalDensity        Range                `json:"optimal_density"`
	RelatedKeywordsFound  int                  `json:"related_keywords_found"`
	Issues                []string             `json:"issues"`
	Suggestions           []string             `json:"suggestions"`
}

type ReadabilityAnalysis struct {
	Score                     int      `json:"score"`
	ReadingLevel              string   `json:"reading_level"`
	AvgSentenceLength         float64  `json:"avg_sentence_length"`
	AvgParagraphLength        float64  `json:"avg_paragraph_length"`
	PassiveVoicePercentage    float64  `json:"passive_voice_percentage"`
	TransitionWordsPercentage float64  `json:"transition_words_percentage"`
	Issues                    []string `json:"issues"`
	Suggestions               []string `json:"suggestions"`
}

type TechnicalAnalysis struct {
	Score       int      `json:"score"`
	URLStructure URLStructure `json:"url_structure"`
	MetaTags    MetaTags     `json:"meta_tags"`
	Schema      Schema       `json:"schema"`
	Issues      []string     `json:"issues"`
	Suggestions []string     `json:"suggestions"`
}

// Helper structures
type Range struct {
	Min int `json:"min"`
	Max int `json:"max"`
}

type HeadingStructure struct {
	H1Count                int      `json:"h1_count"`
	H2Count                int      `json:"h2_count"`
	H3Count                int      `json:"h3_count"`
	StructureScore         int      `json:"structure_score"`
	HasKeywordInHeadings   bool     `json:"has_keyword_in_headings"`
	Issues                 []string `json:"issues"`
}

type KeywordDensity struct {
	Keyword string  `json:"keyword"`
	Count   int     `json:"count"`
	Density float64 `json:"density"`
}

type KeywordDistribution struct {
	Keyword  string `json:"keyword"`
	Title    int    `json:"title"`
	Headings int    `json:"headings"`
	Content  int    `json:"content"`
	Meta     int    `json:"meta"`
}

type ImageOptimization struct {
	TotalImages      int      `json:"total_images"`
	ImagesWithAlt    int      `json:"images_with_alt"`
	ImagesWithTitle  int      `json:"images_with_title"`
	OptimizedImages  int      `json:"optimized_images"`
	Score            int      `json:"score"`
	Issues           []string `json:"issues"`
}

type URLStructure struct {
	Length       int    `json:"length"`
	HasKeywords  bool   `json:"has_keywords"`
	IsReadable   bool   `json:"is_readable"`
	HasUnderscore bool  `json:"has_underscore"`
	Score        int    `json:"score"`
}

type MetaTags struct {
	HasTitle       bool `json:"has_title"`
	HasDescription bool `json:"has_description"`
	HasKeywords    bool `json:"has_keywords"`
	HasViewport    bool `json:"has_viewport"`
	HasCanonical   bool `json:"has_canonical"`
	Score          int  `json:"score"`
}

type Schema struct {
	HasArticleSchema bool `json:"has_article_schema"`
	HasBreadcrumbs   bool `json:"has_breadcrumbs"`
	HasAuthor        bool `json:"has_author"`
	Score            int  `json:"score"`
}