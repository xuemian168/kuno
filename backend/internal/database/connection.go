package database

import (
	"log"
	"os"
	"blog-backend/internal/models"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

var DB *gorm.DB

func InitDatabase() {
	dbPath := getEnv("DB_PATH", "./data/blog.db")

	var err error
	DB, err = gorm.Open(sqlite.Open(dbPath), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect database:", err)
	}

	err = DB.AutoMigrate(&models.Article{}, &models.Category{}, &models.SiteSettings{}, &models.User{}, &models.MediaLibrary{}, &models.ArticleTranslation{}, &models.CategoryTranslation{}, &models.SiteSettingsTranslation{})
	if err != nil {
		log.Fatal("Failed to migrate database:", err)
	}

	// Initialize default site settings if none exist
	var settingsCount int64
	DB.Model(&models.SiteSettings{}).Count(&settingsCount)
	if settingsCount == 0 {
		defaultSettings := models.SiteSettings{
			SiteTitle:    "Blog",
			SiteSubtitle: "A minimalist space for thoughts and ideas",
		}
		DB.Create(&defaultSettings)
		log.Println("Default site settings created")
	}

	// Initialize default admin user if none exist
	var userCount int64
	DB.Model(&models.User{}).Count(&userCount)
	if userCount == 0 {
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte("xuemian168"), bcrypt.DefaultCost)
		if err != nil {
			log.Fatal("Failed to hash password:", err)
		}
		
		defaultUser := models.User{
			Username: "admin",
			Password: string(hashedPassword),
			IsAdmin:  true,
		}
		DB.Create(&defaultUser)
		log.Println("Default admin user created (username: admin)")
	}

	log.Println("Database connected and migrated successfully")
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}