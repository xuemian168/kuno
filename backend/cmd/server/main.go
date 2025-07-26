package main

import (
	"blog-backend/internal/api"
	"blog-backend/internal/database"
	"log"
)

func main() {
	database.InitDatabase()

	r := api.SetupRoutes()

	log.Println("Server starting on :8085")
	if err := r.Run(":8085"); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
