package api

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"blog-backend/internal/database"

	"github.com/gin-gonic/gin"
)

// Self-update is delegated to a Watchtower sidecar (github.com/nicholas-fedor/watchtower).
// KUNO never gets the Docker socket: it only asks Watchtower, over its token-protected
// HTTP API, to pull the image and recreate the KUNO container.

const (
	selfUpdateBackupPrefix = "pre-update-"
	selfUpdateBackupsKept  = 5
	// After a successful trigger, further triggers are refused for this long.
	// Normally the container is replaced well before it expires.
	selfUpdateCooldown = 10 * time.Minute

	selfUpdateReasonNotConfigured = "not_configured"
	selfUpdateReasonInProgress    = "in_progress"
)

var watchtowerHTTPClient = &http.Client{Timeout: 15 * time.Second}

// SelfUpdateStatus tells the admin UI whether "Update now" can be offered.
type SelfUpdateStatus struct {
	Available bool   `json:"available"`
	Reason    string `json:"reason,omitempty"`
}

type watchtowerConfig struct {
	URL   string
	Token string
	Image string
}

// loadWatchtowerConfig reads WATCHTOWER_URL, WATCHTOWER_TOKEN and the optional
// WATCHTOWER_IMAGE (defaults to the official image). ok is false unless both URL and token are set.
func loadWatchtowerConfig() (cfg watchtowerConfig, ok bool) {
	cfg = watchtowerConfig{
		URL:   strings.TrimRight(strings.TrimSpace(os.Getenv("WATCHTOWER_URL")), "/"),
		Token: strings.TrimSpace(os.Getenv("WATCHTOWER_TOKEN")),
		Image: getEnvOrDefault("WATCHTOWER_IMAGE", dockerImageName),
	}
	return cfg, cfg.URL != "" && cfg.Token != ""
}

// selfUpdateGuard allows one trigger per cooldown window.
type selfUpdateGuard struct {
	mu          sync.Mutex
	triggeredAt time.Time
}

var selfUpdates = &selfUpdateGuard{}

// coolingDown must be called with g.mu held.
func (g *selfUpdateGuard) coolingDown(now time.Time) bool {
	return !g.triggeredAt.IsZero() && now.Sub(g.triggeredAt) < selfUpdateCooldown
}

func (g *selfUpdateGuard) busy(now time.Time) bool {
	g.mu.Lock()
	defer g.mu.Unlock()
	return g.coolingDown(now)
}

// begin claims the trigger slot; it returns false while another trigger is in its cooldown.
func (g *selfUpdateGuard) begin(now time.Time) bool {
	g.mu.Lock()
	defer g.mu.Unlock()
	if g.coolingDown(now) {
		return false
	}
	g.triggeredAt = now
	return true
}

// release frees the slot after a failed attempt so the admin can retry.
func (g *selfUpdateGuard) release() {
	g.mu.Lock()
	defer g.mu.Unlock()
	g.triggeredAt = time.Time{}
}

func currentSelfUpdateStatus() SelfUpdateStatus {
	if _, ok := loadWatchtowerConfig(); !ok {
		return SelfUpdateStatus{Reason: selfUpdateReasonNotConfigured}
	}
	if selfUpdates.busy(time.Now()) {
		return SelfUpdateStatus{Reason: selfUpdateReasonInProgress}
	}
	return SelfUpdateStatus{Available: true}
}

// TriggerSelfUpdate backs up the database and asks Watchtower to update KUNO.
// The container is restarted by Watchtower shortly after this returns 202.
func TriggerSelfUpdate(c *gin.Context) {
	cfg, ok := loadWatchtowerConfig()
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Self-update is not configured: set WATCHTOWER_URL and WATCHTOWER_TOKEN",
			"code":  selfUpdateReasonNotConfigured,
		})
		return
	}

	info, err := updates.Get(currentAppVersion())
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": fmt.Sprintf("Failed to check updates: %v", err)})
		return
	}
	if !info.HasUpdate {
		c.JSON(http.StatusConflict, gin.H{"error": "Already running the latest version", "code": "up_to_date"})
		return
	}

	if !selfUpdates.begin(time.Now()) {
		c.JSON(http.StatusConflict, gin.H{"error": "An update was already triggered recently", "code": selfUpdateReasonInProgress})
		return
	}

	backupPath, err := database.CreateBackup(selfUpdateBackupPrefix+info.CurrentVersion+"-", selfUpdateBackupsKept)
	if err != nil && backupPath == "" {
		selfUpdates.release()
		log.Printf("❌ Self-update aborted: database backup failed: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Database backup failed, update not started: %v", err)})
		return
	}
	if err != nil {
		log.Printf("⚠️ Self-update: %v", err)
	}

	if err := requestWatchtowerUpdate(cfg); err != nil {
		selfUpdates.release()
		log.Printf("❌ Self-update failed: %v", err)
		c.JSON(http.StatusBadGateway, gin.H{"error": err.Error()})
		return
	}

	log.Printf("🔄 Self-update to %s triggered by admin user %v (from %s); database backup: %s",
		info.LatestVersion, c.Value("userID"), info.CurrentVersion, backupPath)

	c.JSON(http.StatusAccepted, gin.H{
		"status":       "triggered",
		"from_version": info.CurrentVersion,
		"to_version":   info.LatestVersion,
		"backup_file":  filepath.Base(backupPath),
	})
}

// requestWatchtowerUpdate sends an asynchronous, image-filtered update request.
// Async matters: Watchtower stops this very container while updating, so a
// synchronous request would never get its response.
func requestWatchtowerUpdate(cfg watchtowerConfig) error {
	endpoint, err := url.Parse(cfg.URL + "/v1/update")
	if err != nil || (endpoint.Scheme != "http" && endpoint.Scheme != "https") || endpoint.Host == "" {
		return fmt.Errorf("WATCHTOWER_URL must be an http(s) URL such as http://watchtower:8080")
	}
	endpoint.RawQuery = url.Values{"image": {cfg.Image}, "async": {"true"}}.Encode()

	req, err := http.NewRequest(http.MethodPost, endpoint.String(), nil)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+cfg.Token)
	req.Header.Set("User-Agent", "kuno-self-update")

	resp, err := watchtowerHTTPClient.Do(req)
	if err != nil {
		return fmt.Errorf("cannot reach Watchtower at %s: %v", cfg.URL, err)
	}
	defer resp.Body.Close()

	switch resp.StatusCode {
	case http.StatusAccepted, http.StatusOK:
		return nil
	case http.StatusUnauthorized:
		return fmt.Errorf("Watchtower rejected the token (401): WATCHTOWER_TOKEN must match WATCHTOWER_HTTP_API_TOKEN")
	case http.StatusNotFound:
		return fmt.Errorf("Watchtower update API is not enabled (404): set WATCHTOWER_HTTP_API_ENDPOINTS=update")
	case http.StatusTooManyRequests:
		return fmt.Errorf("Watchtower is busy or rate limited (429); try again shortly")
	default:
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
		return fmt.Errorf("Watchtower returned HTTP %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}
}
