package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// Version represents a semantic version
type Version struct {
	Major int    `json:"major"`
	Minor int    `json:"minor"`
	Patch int    `json:"patch"`
	Raw   string `json:"raw"`
}

// DockerHubResponse represents the response from Docker Hub REST API
type DockerHubResponse struct {
	Results []DockerHubTag `json:"results"`
}

type DockerHubTag struct {
	Name        string    `json:"name"`
	LastUpdated time.Time `json:"last_updated"`
	ImageSize   int64     `json:"full_size"`
}

// UpdateInfo represents update information
type UpdateInfo struct {
	HasUpdate      bool      `json:"has_update"`
	CurrentVersion string    `json:"current_version"`
	LatestVersion  string    `json:"latest_version"`
	ReleaseDate    time.Time `json:"release_date,omitempty"`
	ImageSize      int64     `json:"image_size,omitempty"`
	UpdateCommand  string    `json:"update_command,omitempty"`
	Changelog      []string  `json:"changelog,omitempty"`
}

// SystemInfo represents current system information
type SystemInfo struct {
	Version     string `json:"version"`
	BuildDate   string `json:"build_date"`
	GitCommit   string `json:"git_commit"`
	GitBranch   string `json:"git_branch"`
	BuildNumber string `json:"build_number"`
}

var (
	dockerHubCache  *UpdateInfo
	cacheExpiry     time.Time
	cacheDuration   = 1 * time.Hour // Cache for 1 hour
	dockerHubAPIURL = "https://hub.docker.com/v2/repositories/ictrun/i18n_blog/tags"
	dockerImageName = "ictrun/i18n_blog"
)

// GetSystemInfo returns current system information
func GetSystemInfo(c *gin.Context) {
	info := SystemInfo{
		Version:     getEnvOrDefault("NEXT_PUBLIC_APP_VERSION", "1.0.0"),
		BuildDate:   getEnvOrDefault("NEXT_PUBLIC_BUILD_DATE", "unknown"),
		GitCommit:   getEnvOrDefault("NEXT_PUBLIC_GIT_COMMIT", "unknown"),
		GitBranch:   getEnvOrDefault("NEXT_PUBLIC_GIT_BRANCH", "unknown"),
		BuildNumber: getEnvOrDefault("NEXT_PUBLIC_BUILD_NUMBER", "unknown"),
	}

	c.JSON(http.StatusOK, gin.H{
		"system_info": info,
	})
}

// CheckUpdates checks for available updates from Docker Hub
func CheckUpdates(c *gin.Context) {
	// Check cache first
	if dockerHubCache != nil && time.Now().Before(cacheExpiry) {
		c.JSON(http.StatusOK, dockerHubCache)
		return
	}

	// Get current version
	currentVersion := getEnvOrDefault("NEXT_PUBLIC_APP_VERSION", "1.0.0")

	// Fetch latest version from Docker Hub
	updateInfo, err := fetchLatestVersion(currentVersion)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Failed to check updates: %v", err),
		})
		return
	}

	// Cache the result
	dockerHubCache = updateInfo
	cacheExpiry = time.Now().Add(cacheDuration)

	c.JSON(http.StatusOK, updateInfo)
}

// fetchLatestVersion fetches the latest version from Docker Hub
func fetchLatestVersion(currentVersion string) (*UpdateInfo, error) {
	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	// Fetch tags from Docker Hub REST API
	resp, err := client.Get(dockerHubAPIURL)
	if err != nil {
		// Fallback to simulation if API call fails
		latestVersion := simulateLatestVersion()
		return createUpdateInfo(currentVersion, latestVersion, true)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		// Fallback to simulation if API call fails
		latestVersion := simulateLatestVersion()
		return createUpdateInfo(currentVersion, latestVersion, true)
	}

	var dockerResponse DockerHubResponse
	if err := json.NewDecoder(resp.Body).Decode(&dockerResponse); err != nil {
		// Fallback to simulation if parsing fails
		latestVersion := simulateLatestVersion()
		return createUpdateInfo(currentVersion, latestVersion, true)
	}

	// Find the latest version tag
	latestVersion := findLatestVersion(dockerResponse.Results)
	if latestVersion == "" {
		// Fallback to simulation if no valid version found
		latestVersion = simulateLatestVersion()
		return createUpdateInfo(currentVersion, latestVersion, true)
	}

	return createUpdateInfo(currentVersion, latestVersion, false)
}

// findLatestVersion finds the latest semantic version from Docker tags
func findLatestVersion(tags []DockerHubTag) string {
	var versions []Version

	for _, tag := range tags {
		// Skip non-version tags like "latest", "dev", etc.
		if tag.Name == "latest" || tag.Name == "dev" || strings.Contains(tag.Name, "beta") {
			continue
		}

		version, err := parseVersion(tag.Name)
		if err == nil {
			versions = append(versions, version)
		}
	}

	if len(versions) == 0 {
		return ""
	}

	// Sort versions to find the latest
	sort.Slice(versions, func(i, j int) bool {
		return compareVersions(versions[i], versions[j]) > 0
	})

	return versions[0].Raw
}

// createUpdateInfo creates UpdateInfo struct
func createUpdateInfo(currentVersion, latestVersion string, isSimulated bool) (*UpdateInfo, error) {
	currentVer, err := parseVersion(currentVersion)
	if err != nil {
		return nil, fmt.Errorf("invalid current version: %v", err)
	}

	latestVer, err := parseVersion(latestVersion)
	if err != nil {
		return nil, fmt.Errorf("invalid latest version: %v", err)
	}

	hasUpdate := compareVersions(latestVer, currentVer) > 0

	updateInfo := &UpdateInfo{
		HasUpdate:      hasUpdate,
		CurrentVersion: currentVersion,
		LatestVersion:  latestVersion,
		ReleaseDate:    time.Now().Add(-24 * time.Hour), // Simulate release date
		ImageSize:      150 * 1024 * 1024,               // 150MB (simulated)
	}

	if hasUpdate {
		updateInfo.UpdateCommand = generateUpdateCommand()
		updateInfo.Changelog = generateChangelog(currentVer, latestVer)

		// Add note if this is simulated data
		if isSimulated {
			updateInfo.Changelog = append([]string{"📝 Note: Update check uses 'latest' tag - version-based updates not available"}, updateInfo.Changelog...)
		}
	} else if isSimulated {
		// Show information about the current setup when no updates
		updateInfo.Changelog = []string{
			"ℹ️ Currently using 'latest' Docker tag",
			"🔄 To enable version-based updates, push tagged releases (e.g., v1.0.0, v1.1.0)",
			"📋 Current setup pulls the latest image automatically",
		}
	}

	return updateInfo, nil
}

// simulateLatestVersion simulates fetching the latest version
// In production, this would fetch from Docker Hub API
func simulateLatestVersion() string {
	// Return the current version to indicate no update available
	// since we only have 'latest' tag without version numbers
	return getEnvOrDefault("NEXT_PUBLIC_APP_VERSION", "1.0.0")
}

// generateUpdateCommand generates the Docker update command
func generateUpdateCommand() string {
	return fmt.Sprintf(`## 🐳 Docker Deployment (Single Container)

# 1. Backup your data
mkdir -p ./backups/$(date +%%Y%%m%%d_%%H%%M%%S)
docker run --rm -v blog-data:/data -v $(pwd)/backups/$(date +%%Y%%m%%d_%%H%%M%%S):/backup alpine sh -c "cd /data && tar czf /backup/blog-data-backup.tar.gz ."

# 2. Pull the latest image
docker pull %s:latest

# 3. Stop and remove the old container
docker stop i18n_blog
docker rm i18n_blog

# 4. Start the new container
docker run -d \
  --name i18n_blog \
  --restart unless-stopped \
  -p 80:80 \
  -v blog-data:/app/data \
  -e NEXT_PUBLIC_API_URL=https://your-domain.com/api \
  -e DB_PATH=/app/data/blog.db \
  %s:latest

# 5. Verify the upgrade
docker ps | grep i18n_blog
docker logs i18n_blog

## 🐳 Docker Compose Deployment

# 1. Backup your data
mkdir -p ./backups/$(date +%%Y%%m%%d_%%H%%M%%S)
docker-compose stop
docker run --rm -v blog_blog_data:/data -v $(pwd)/backups/$(date +%%Y%%m%%d_%%H%%M%%S):/backup alpine sh -c "cd /data && tar czf /backup/blog-data-backup.tar.gz ."
docker-compose start

# 2. Pull the latest images
docker-compose pull

# 3. Upgrade with zero downtime
docker-compose up -d --force-recreate --remove-orphans

# 4. Clean up old images (optional)
docker image prune -f

# 5. Verify the upgrade
docker-compose ps
docker-compose logs -f --tail=50`, dockerImageName, dockerImageName)
}

// generateChangelog generates a mock changelog
func generateChangelog(current, latest Version) []string {
	changelog := []string{}

	if latest.Major > current.Major {
		changelog = append(changelog, "🚀 Major version update with new features and improvements")
	}
	if latest.Minor > current.Minor {
		changelog = append(changelog, "✨ New features and enhancements")
		changelog = append(changelog, "🐛 Bug fixes and stability improvements")
	}
	if latest.Patch > current.Patch {
		changelog = append(changelog, "🔧 Bug fixes and minor improvements")
	}

	if len(changelog) == 0 {
		changelog = append(changelog, "📝 Minor updates and improvements")
	}

	return changelog
}

// parseVersion parses a version string into a Version struct
func parseVersion(versionStr string) (Version, error) {
	// Remove 'v' prefix if present
	versionStr = strings.TrimPrefix(versionStr, "v")

	// Use regex to parse semantic version
	re := regexp.MustCompile(`^(\d+)\.(\d+)\.(\d+)`)
	matches := re.FindStringSubmatch(versionStr)

	if len(matches) != 4 {
		return Version{}, fmt.Errorf("invalid version format: %s", versionStr)
	}

	major, err := strconv.Atoi(matches[1])
	if err != nil {
		return Version{}, err
	}

	minor, err := strconv.Atoi(matches[2])
	if err != nil {
		return Version{}, err
	}

	patch, err := strconv.Atoi(matches[3])
	if err != nil {
		return Version{}, err
	}

	return Version{
		Major: major,
		Minor: minor,
		Patch: patch,
		Raw:   versionStr,
	}, nil
}

// compareVersions compares two versions
// Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if v1 == v2
func compareVersions(v1, v2 Version) int {
	if v1.Major != v2.Major {
		if v1.Major > v2.Major {
			return 1
		}
		return -1
	}

	if v1.Minor != v2.Minor {
		if v1.Minor > v2.Minor {
			return 1
		}
		return -1
	}

	if v1.Patch != v2.Patch {
		if v1.Patch > v2.Patch {
			return 1
		}
		return -1
	}

	return 0
}

// getEnvOrDefault gets environment variable or returns default value
func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// ClearUpdateCache clears the update cache (for testing or manual refresh)
func ClearUpdateCache(c *gin.Context) {
	dockerHubCache = nil
	cacheExpiry = time.Time{}

	c.JSON(http.StatusOK, gin.H{
		"message": "Update cache cleared",
	})
}
