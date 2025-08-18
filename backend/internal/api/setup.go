package api

import (
	"blog-backend/internal/database"
	"blog-backend/internal/models"
	"log"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

type SetupStatusResponse struct {
	SetupCompleted bool `json:"setup_completed"`
}

type SetupRequest struct {
	SiteTitle       string `json:"site_title" binding:"required,min=1,max=255"`
	SiteSubtitle    string `json:"site_subtitle" binding:"max=500"`
	DefaultLanguage string `json:"default_language" binding:"required,oneof=zh en ja"`
	AdminUsername   string `json:"admin_username" binding:"required,min=3,max=50"`
	AdminPassword   string `json:"admin_password" binding:"required,min=6"`
}

type SetupResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Token   string `json:"token,omitempty"`
}

// GetSetupStatus checks if the initial setup has been completed
func GetSetupStatus(c *gin.Context) {
	var settings models.SiteSettings
	if err := database.DB.First(&settings).Error; err != nil {
		// If no settings exist, setup is not completed
		c.JSON(http.StatusOK, SetupStatusResponse{
			SetupCompleted: false,
		})
		return
	}

	c.JSON(http.StatusOK, SetupStatusResponse{
		SetupCompleted: settings.SetupCompleted,
	})
}

// InitializeSetup completes the initial setup process
func InitializeSetup(c *gin.Context) {
	log.Printf("🔧 Setup initialization request received from %s", c.ClientIP())

	// Check if setup is already completed
	var existingSettings models.SiteSettings
	if err := database.DB.First(&existingSettings).Error; err == nil && existingSettings.SetupCompleted {
		log.Printf("⚠️  Setup already completed, rejecting request")
		c.JSON(http.StatusBadRequest, SetupResponse{
			Success: false,
			Message: "Setup has already been completed",
		})
		return
	}

	var req SetupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("❌ Invalid setup request data: %v", err)
		c.JSON(http.StatusBadRequest, SetupResponse{
			Success: false,
			Message: "Invalid request data: " + err.Error(),
		})
		return
	}

	log.Printf("📝 Setup request parsed: title=%s, language=%s, username=%s",
		req.SiteTitle, req.DefaultLanguage, req.AdminUsername)

	// Validate language
	validLanguages := []string{"zh", "en", "ja"}
	isValidLang := false
	for _, lang := range validLanguages {
		if req.DefaultLanguage == lang {
			isValidLang = true
			break
		}
	}
	if !isValidLang {
		c.JSON(http.StatusBadRequest, SetupResponse{
			Success: false,
			Message: "Invalid default language. Must be one of: zh, en, ja",
		})
		return
	}

	// Validate password strength
	if len(req.AdminPassword) < 6 {
		c.JSON(http.StatusBadRequest, SetupResponse{
			Success: false,
			Message: "Password must be at least 6 characters long",
		})
		return
	}

	// Start transaction
	log.Printf("🔄 Starting database transaction for setup")
	tx := database.DB.Begin()
	if tx.Error != nil {
		log.Printf("❌ Failed to start database transaction: %v", tx.Error)
		c.JSON(http.StatusInternalServerError, SetupResponse{
			Success: false,
			Message: "Failed to start database transaction",
		})
		return
	}

	// Update or create site settings
	log.Printf("🗃️  Checking for existing site settings")
	var settings models.SiteSettings
	if err := tx.First(&settings).Error; err != nil {
		log.Printf("📝 No existing settings found, creating new ones")
		// Create new settings if none exist
		settings = models.SiteSettings{
			SiteTitle:          req.SiteTitle,
			SiteSubtitle:       req.SiteSubtitle,
			FooterText:         "© 2025 " + req.SiteTitle,
			ShowViewCount:      true,
			ShowSiteTitle:      true,
			EnableSoundEffects: true,
			DefaultLanguage:    req.DefaultLanguage,
			SetupCompleted:     true,
			LogoURL:            "",
			FaviconURL:         "",
			ICPFiling:          "",
			PSBFiling:          "",
		}
		if err := tx.Create(&settings).Error; err != nil {
			log.Printf("❌ Failed to create site settings: %v", err)
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, SetupResponse{
				Success: false,
				Message: "Failed to create site settings: " + err.Error(),
			})
			return
		}
		log.Printf("✅ Site settings created successfully")
	} else {
		log.Printf("🔄 Updating existing site settings")
		// Update existing settings
		settings.SiteTitle = req.SiteTitle
		settings.SiteSubtitle = req.SiteSubtitle
		settings.DefaultLanguage = req.DefaultLanguage
		settings.SetupCompleted = true
		if settings.FooterText == "" || strings.Contains(settings.FooterText, "KUNO") {
			settings.FooterText = "© 2025 " + req.SiteTitle
		}
		if err := tx.Save(&settings).Error; err != nil {
			log.Printf("❌ Failed to update site settings: %v", err)
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, SetupResponse{
				Success: false,
				Message: "Failed to update site settings",
			})
			return
		}
		log.Printf("✅ Site settings updated successfully")
	}

	// Create admin user (during setup, we always create a new user)
	log.Printf("🔐 Processing admin user creation/update")
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.AdminPassword), bcrypt.DefaultCost)
	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, SetupResponse{
			Success: false,
			Message: "Failed to hash password: " + err.Error(),
		})
		return
	}

	// Check if user with this username already exists
	var existingUser models.User
	if err := tx.Where("username = ?", req.AdminUsername).First(&existingUser).Error; err == nil {
		// User exists, update their password and make them admin
		existingUser.Password = string(hashedPassword)
		existingUser.IsAdmin = true
		if err := tx.Save(&existingUser).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, SetupResponse{
				Success: false,
				Message: "Failed to update admin user: " + err.Error(),
			})
			return
		}
	} else {
		// Create new admin user
		adminUser := models.User{
			Username: req.AdminUsername,
			Password: string(hashedPassword),
			IsAdmin:  true,
		}
		if err := tx.Create(&adminUser).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, SetupResponse{
				Success: false,
				Message: "Failed to create admin user: " + err.Error(),
			})
			return
		}
	}

	// Commit transaction
	log.Printf("💾 Committing transaction")
	if err := tx.Commit().Error; err != nil {
		log.Printf("❌ Failed to commit transaction: %v", err)
		c.JSON(http.StatusInternalServerError, SetupResponse{
			Success: false,
			Message: "Failed to commit changes: " + err.Error(),
		})
		return
	}

	log.Printf("🎉 Setup completed successfully for user: %s", req.AdminUsername)
	c.JSON(http.StatusOK, SetupResponse{
		Success: true,
		Message: "Setup completed successfully! You can now login with your admin credentials.",
	})
}
