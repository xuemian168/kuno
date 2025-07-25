package database

import (
	"blog-backend/internal/models"
	"log"
	"os"
	"strings"

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

	err = DB.AutoMigrate(&models.Article{}, &models.Category{}, &models.SiteSettings{}, &models.User{}, &models.MediaLibrary{}, &models.ArticleTranslation{}, &models.CategoryTranslation{}, &models.SiteSettingsTranslation{}, &models.ArticleView{}, &models.SocialMedia{})
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

	// Check recovery mode
	checkRecoveryMode()
}

// checkRecoveryMode handles password recovery functionality
func checkRecoveryMode() {
	recoveryMode := strings.ToLower(getEnv("RECOVERY_MODE", "false"))

	if recoveryMode == "true" {
		log.Println("⚠️  RECOVERY MODE ACTIVATED ⚠️")
		log.Println("🔑 Resetting admin password to default...")

		// Reset admin password to default
		var adminUser models.User
		result := DB.Where("username = ?", "admin").First(&adminUser)
		if result.Error != nil {
			log.Fatal("❌ Recovery failed: Admin user not found")
		}

		// Hash the default password
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte("xuemian168"), bcrypt.DefaultCost)
		if err != nil {
			log.Fatal("❌ Recovery failed: Unable to hash password")
		}

		// Update admin password
		adminUser.Password = string(hashedPassword)
		if err := DB.Save(&adminUser).Error; err != nil {
			log.Fatal("❌ Recovery failed: Unable to update password")
		}

		log.Println("✅ Admin password has been reset to: xuemian168")
		log.Println("📋 Username: admin")
		log.Println("🔒 Password: xuemian168")
		log.Println("")
		log.Println("⚠️  SECURITY WARNING ⚠️")
		log.Println("🛑 Recovery mode is still ENABLED!")
		log.Println("🔧 You MUST disable recovery mode to start the server:")
		log.Println("   1. Set RECOVERY_MODE=false in your .env file")
		log.Println("   2. Restart the application")
		log.Println("   3. Login with the reset credentials")
		log.Println("   4. Change your password immediately")
		log.Println("")
		log.Fatal("🚫 Server startup blocked due to active recovery mode")
	}
}

// IsRecoveryMode returns true if recovery mode is currently enabled
func IsRecoveryMode() bool {
	return strings.ToLower(getEnv("RECOVERY_MODE", "false")) == "true"
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
