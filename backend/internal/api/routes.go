package api

import (
	"blog-backend/internal/auth"
	"github.com/gin-gonic/gin"
	"github.com/gin-contrib/cors"
)

func SetupRoutes() *gin.Engine {
	r := gin.Default()

	config := cors.DefaultConfig()
	config.AllowOrigins = []string{"http://localhost:3000"}
	config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Type", "Accept", "Authorization", "Cache-Control"}
	r.Use(cors.New(config))

	api := r.Group("/api")
	{
		// Public routes
		api.POST("/login", Login)
		
		// Public read-only routes
		articles := api.Group("/articles")
		{
			articles.GET("", GetArticles)
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

		// Media serving - public access
		api.Static("/uploads", "./uploads")

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
			}
		}
	}

	return r
}