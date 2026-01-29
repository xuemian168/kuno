package main

import (
	"blog-backend/internal/api"
	"blog-backend/internal/database"
	"log"
	"os"
	"runtime"
	"time"
)

func main() {
	// Enhanced logging setup
	log.SetOutput(os.Stdout)
	log.SetFlags(log.LstdFlags | log.Lshortfile)

	log.Printf("Starting KUNO Blog Backend Server")
	log.Printf("Time: %s", time.Now().Format("2006-01-02 15:04:05"))
	log.Printf("Go Version: %s", runtime.Version())
	log.Printf("OS/Arch: %s/%s", runtime.GOOS, runtime.GOARCH)
	log.Printf("Working Directory: %s", func() string {
		wd, _ := os.Getwd()
		return wd
	}())

	// Initialize database with enhanced error handling
	log.Println("Initializing database connection...")
	database.InitDatabase()
	log.Println("Database initialization completed")

	// Setup routes with enhanced logging
	log.Println("Setting up API routes...")
	r := api.SetupRoutes()
	log.Println("API routes configured")

	// Start server with detailed logging
	port := os.Getenv("PORT")
	if port == "" {
		port = "8085"
	}

	log.Printf("Server starting on port %s", port)
	log.Printf("GIN_MODE: %s", os.Getenv("GIN_MODE"))
	log.Printf("DB_PATH: %s", os.Getenv("DB_PATH"))

	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server on port %s: %v", port, err)
	}
}
