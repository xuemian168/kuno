package models

import (
	"gorm.io/gorm"
	"time"
)

type MediaType string

const (
	MediaTypeImage MediaType = "image"
	MediaTypeVideo MediaType = "video"
)

type MediaLibrary struct {
	ID           uint           `gorm:"primaryKey" json:"id"`
	FileName     string         `gorm:"not null" json:"file_name"`
	OriginalName string         `gorm:"not null" json:"original_name"`
	FilePath     string         `gorm:"not null" json:"file_path"`
	FileSize     int64          `gorm:"not null" json:"file_size"`
	MimeType     string         `gorm:"not null" json:"mime_type"`
	MediaType    MediaType      `gorm:"not null" json:"media_type"`
	URL          string         `gorm:"not null" json:"url"`
	Alt          string         `json:"alt"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}
