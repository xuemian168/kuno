package api

import (
	"blog-backend/internal/auth"
	"github.com/gin-gonic/gin"
	"github.com/gin-contrib/cors"
)

func SetupRoutes() *gin.Engine {
	r := gin.Default()

	// Increase maximum multipart memory for large file uploads
	r.MaxMultipartMemory = 100 << 20 // 100 MB

	config := cors.DefaultConfig()
	// Allow all origins for embed functionality
	config.AllowAllOrigins = true
	config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Type", "Accept", "Authorization", "Cache-Control"}
	config.ExposeHeaders = []string{"Content-Length"}
	config.AllowCredentials = true
	config.MaxAge = 12 * 3600
	r.Use(cors.New(config))

	api := r.Group("/api")
	{
		// Public routes
		api.POST("/login", Login)
		api.GET("/recovery-status", GetRecoveryStatus)
		
		// Public read-only routes
		articles := api.Group("/articles")
		{
			articles.GET("", GetArticles)
			articles.GET("/search", SearchArticles)
			articles.GET("/:id", GetArticle)
		}

		categories := api.Group("/categories")
		{
			categories.GET("", GetCategories)
			categories.GET("/:id", GetCategory)
		}

		settings := api.Group("/settings")
		{
			settings.GET("", GetSettings)
		}

		// RSS feeds - public access
		rss := api.Group("/rss")
		{
			rss.GET("", GetRSSFeed)
			rss.GET("/category/:id", GetRSSFeedByCategory)
		}

		// Media serving - public access
		api.Static("/uploads", "./uploads")

		// Social media links - public access
		api.GET("/social-media", GetSocialMediaList)

		// System information - public access
		api.GET("/system/info", GetSystemInfo)

		// Protected routes - require authentication
		protected := api.Group("/")
		protected.Use(auth.AuthMiddleware())
		{
			// User routes
			protected.GET("/me", GetCurrentUser)
			protected.PUT("/change-password", ChangePassword)

			// Admin routes - require admin role
			admin := protected.Group("/")
			admin.Use(auth.AdminMiddleware())
			{
				// Article management
				adminArticles := admin.Group("/articles")
				{
					adminArticles.POST("", CreateArticle)
					adminArticles.PUT("/:id", UpdateArticle)
					adminArticles.DELETE("/:id", DeleteArticle)
					adminArticles.POST("/import", ImportMarkdown)
					adminArticles.POST("/parse-wordpress", ParseWordPress)
					adminArticles.POST("/import-wordpress", ImportWordPress)
				}

				// Category management
				adminCategories := admin.Group("/categories")
				{
					adminCategories.POST("", CreateCategory)
					adminCategories.PUT("/:id", UpdateCategory)
					adminCategories.DELETE("/:id", DeleteCategory)
				}

				// Settings management
				adminSettings := admin.Group("/settings")
				{
					adminSettings.PUT("", UpdateSettings)
					adminSettings.POST("/upload-logo", UploadLogo)
					adminSettings.POST("/upload-favicon", UploadFavicon)
				}

				// Media management
				adminMedia := admin.Group("/media")
				{
					adminMedia.POST("/upload", UploadMedia)
					adminMedia.GET("", GetMediaList)
					adminMedia.GET("/:id", GetMedia)
					adminMedia.PUT("/:id", UpdateMedia)
					adminMedia.DELETE("/:id", DeleteMedia)
				}

				// Analytics
				admin.GET("/analytics", GetAnalytics)
				admin.GET("/analytics/articles/:id", GetArticleAnalytics)
				admin.GET("/analytics/geographic", GetGeographicAnalytics)
				admin.GET("/analytics/browsers", GetBrowserAnalytics)
				admin.GET("/analytics/trends", GetTrendAnalytics)

				// Export functions
				admin.GET("/export/article/:id", ExportArticle)
				admin.GET("/export/articles", ExportArticles)
				admin.GET("/export/all", ExportAllArticles)

				// Social media management
				adminSocialMedia := admin.Group("/social-media")
				{
					adminSocialMedia.GET("/all", GetAllSocialMedia)
					adminSocialMedia.GET("/:id", GetSocialMedia)
					adminSocialMedia.POST("", CreateSocialMedia)
					adminSocialMedia.PUT("/:id", UpdateSocialMedia)
					adminSocialMedia.DELETE("/:id", DeleteSocialMedia)
					adminSocialMedia.PUT("/order", UpdateSocialMediaOrder)
				}

				// System management
				adminSystem := admin.Group("/system")
				{
					adminSystem.GET("/check-updates", CheckUpdates)
					adminSystem.POST("/clear-cache", ClearUpdateCache)
				}

				// AI Usage tracking
				aiUsageController := NewAIUsageController()
				adminAIUsage := admin.Group("/ai-usage")
				{
					adminAIUsage.POST("/track", aiUsageController.TrackUsage)
					adminAIUsage.GET("/stats", aiUsageController.GetUsageStats)
					adminAIUsage.GET("/cost", aiUsageController.GetTotalCost)
					adminAIUsage.GET("/recent", aiUsageController.GetRecentUsage)
					adminAIUsage.GET("/daily", aiUsageController.GetDailyUsage)
					adminAIUsage.GET("/article/:id", aiUsageController.GetUsageByArticle)
					adminAIUsage.DELETE("/cleanup", aiUsageController.CleanupOldRecords)
				}
			}
		}
	}

	return r
}