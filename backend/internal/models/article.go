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
	CreatedAt    time.Time            `json:"created_at"`
	UpdatedAt    time.Time            `json:"updated_at"`
	DeletedAt    gorm.DeletedAt       `gorm:"index" json:"-"`
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
	ShowViewCount bool                    `gorm:"default:true" json:"show_view_count"`
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

// ArticleView tracks unique visitors for each article
type ArticleView struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	ArticleID  uint      `gorm:"not null;index" json:"article_id"`
	IPAddress  string    `gorm:"not null;size:45" json:"ip_address"`
	UserAgent  string    `gorm:"size:500" json:"user_agent"`
	Fingerprint string   `gorm:"size:64;index" json:"fingerprint"`
	CreatedAt  time.Time `json:"created_at"`
}