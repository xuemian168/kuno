package api

import (
	"fmt"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
)

// SystemInfo represents current system information
type SystemInfo struct {
	Version     string `json:"version"`
	BuildDate   string `json:"build_date"`
	GitCommit   string `json:"git_commit"`
	GitBranch   string `json:"git_branch"`
	BuildNumber string `json:"build_number"`
}

// checkUpdatesResponse is the update check result plus whether one-click update can be offered.
type checkUpdatesResponse struct {
	UpdateInfo
	SelfUpdate SelfUpdateStatus `json:"self_update"`
}

// currentAppVersion is the version baked into the image at build time.
func currentAppVersion() string {
	return getEnvOrDefault("NEXT_PUBLIC_APP_VERSION", "1.0.0")
}

// GetSystemInfo returns current system information
func GetSystemInfo(c *gin.Context) {
	info := SystemInfo{
		Version:     currentAppVersion(),
		BuildDate:   getEnvOrDefault("NEXT_PUBLIC_BUILD_DATE", "unknown"),
		GitCommit:   getEnvOrDefault("NEXT_PUBLIC_GIT_COMMIT", "unknown"),
		GitBranch:   getEnvOrDefault("NEXT_PUBLIC_GIT_BRANCH", "unknown"),
		BuildNumber: getEnvOrDefault("NEXT_PUBLIC_BUILD_NUMBER", "unknown"),
	}

	c.JSON(http.StatusOK, gin.H{
		"system_info": info,
	})
}

// CheckUpdates compares the running version with the latest published release.
func CheckUpdates(c *gin.Context) {
	info, err := updates.Get(currentAppVersion())
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{
			"error": fmt.Sprintf("Failed to check updates: %v", err),
		})
		return
	}

	c.JSON(http.StatusOK, checkUpdatesResponse{
		UpdateInfo: info,
		SelfUpdate: currentSelfUpdateStatus(),
	})
}

// ClearUpdateCache clears the update cache so the next check queries upstream again.
func ClearUpdateCache(c *gin.Context) {
	updates.Clear()

	c.JSON(http.StatusOK, gin.H{
		"message": "Update cache cleared",
	})
}

// getEnvOrDefault gets environment variable or returns default value
func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
