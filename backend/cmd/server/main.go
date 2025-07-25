package main

import (
	"log"
	"blog-backend/internal/api"
	"blog-backend/internal/database"
)

func main() {
	database.InitDatabase()
	
	r := api.SetupRoutes()
	
	log.Println("Server starting on :8080")
	if err := r.Run(":8080"); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}