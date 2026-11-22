package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"blog-backend/internal/database"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

type watchtowerCall struct {
	method, auth, image, async string
}

// fakeWatchtower records the request and answers with status.
func fakeWatchtower(t *testing.T, status int, calls *[]watchtowerCall) *httptest.Server {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/update" {
			http.NotFound(w, r)
			return
		}
		*calls = append(*calls, watchtowerCall{
			method: r.Method,
			auth:   r.Header.Get("Authorization"),
			image:  r.URL.Query().Get("image"),
			async:  r.URL.Query().Get("async"),
		})
		w.WriteHeader(status)
	}))
	t.Cleanup(srv.Close)
	return srv
}

// setupSelfUpdateTest wires a temp database, a stubbed update check and a fresh guard.
func setupSelfUpdateTest(t *testing.T, info UpdateInfo) string {
	t.Helper()
	gin.SetMode(gin.TestMode)

	dir := t.TempDir()
	dbPath := filepath.Join(dir, "blog.db")
	t.Setenv("DB_PATH", dbPath)
	db, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	if err := db.Exec("CREATE TABLE notes (id INTEGER PRIMARY KEY, body TEXT); INSERT INTO notes (body) VALUES ('hello')").Error; err != nil {
		t.Fatal(err)
	}

	oldDB, oldUpdates, oldGuard := database.DB, updates, selfUpdates
	database.DB = db
	updates = &updateChecker{ttl: time.Hour, fetch: func(string) (*UpdateInfo, error) { copied := info; return &copied, nil }}
	selfUpdates = &selfUpdateGuard{}
	t.Cleanup(func() {
		database.DB, updates, selfUpdates = oldDB, oldUpdates, oldGuard
		if sqlDB, err := db.DB(); err == nil {
			sqlDB.Close()
		}
	})
	return dir
}

func callTriggerSelfUpdate(t *testing.T) (int, map[string]any) {
	t.Helper()
	rec := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(rec)
	ctx.Request = httptest.NewRequest(http.MethodPost, "/api/system/self-update", nil)
	ctx.Set("userID", uint(1))
	TriggerSelfUpdate(ctx)

	var body map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("bad JSON %q: %v", rec.Body.String(), err)
	}
	return rec.Code, body
}

var availableUpdate = UpdateInfo{HasUpdate: true, CurrentVersion: "1.4.8", LatestVersion: "1.5.0"}

func TestTriggerSelfUpdateRequiresConfiguration(t *testing.T) {
	setupSelfUpdateTest(t, availableUpdate)
	t.Setenv("WATCHTOWER_URL", "")
	t.Setenv("WATCHTOWER_TOKEN", "")

	code, body := callTriggerSelfUpdate(t)
	if code != http.StatusBadRequest || body["code"] != selfUpdateReasonNotConfigured {
		t.Fatalf("got %d %v", code, body)
	}
	if status := currentSelfUpdateStatus(); status.Available || status.Reason != selfUpdateReasonNotConfigured {
		t.Fatalf("status = %+v", status)
	}
}

func TestTriggerSelfUpdateRefusesWhenUpToDate(t *testing.T) {
	setupSelfUpdateTest(t, UpdateInfo{CurrentVersion: "1.5.0", LatestVersion: "1.5.0"})
	var calls []watchtowerCall
	t.Setenv("WATCHTOWER_URL", fakeWatchtower(t, http.StatusAccepted, &calls).URL)
	t.Setenv("WATCHTOWER_TOKEN", "secret-token")

	code, body := callTriggerSelfUpdate(t)
	if code != http.StatusConflict || body["code"] != "up_to_date" || len(calls) != 0 {
		t.Fatalf("got %d %v, watchtower calls %d", code, body, len(calls))
	}
}

func TestTriggerSelfUpdateBacksUpThenCallsWatchtowerOnce(t *testing.T) {
	dir := setupSelfUpdateTest(t, availableUpdate)
	var calls []watchtowerCall
	t.Setenv("WATCHTOWER_URL", fakeWatchtower(t, http.StatusAccepted, &calls).URL+"/")
	t.Setenv("WATCHTOWER_TOKEN", "secret-token")
	t.Setenv("WATCHTOWER_IMAGE", "")

	code, body := callTriggerSelfUpdate(t)
	if code != http.StatusAccepted || body["to_version"] != "1.5.0" || body["from_version"] != "1.4.8" {
		t.Fatalf("got %d %v", code, body)
	}
	want := watchtowerCall{method: http.MethodPost, auth: "Bearer secret-token", image: "ictrun/kuno", async: "true"}
	if len(calls) != 1 || calls[0] != want {
		t.Fatalf("watchtower calls = %+v, want [%+v]", calls, want)
	}

	backup := filepath.Join(dir, "backups", body["backup_file"].(string))
	if !strings.HasPrefix(filepath.Base(backup), "pre-update-1.4.8-") {
		t.Errorf("backup name %q", backup)
	}
	snapshot, err := gorm.Open(sqlite.Open(backup), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	var note string
	if err := snapshot.Raw("SELECT body FROM notes").Scan(&note).Error; err != nil || note != "hello" {
		t.Fatalf("backup does not contain the data: %q %v", note, err)
	}
	if sqlDB, err := snapshot.DB(); err == nil {
		sqlDB.Close()
	}

	// A second click while the first update is still running must not trigger again.
	if code, body := callTriggerSelfUpdate(t); code != http.StatusConflict || body["code"] != selfUpdateReasonInProgress {
		t.Fatalf("second trigger: %d %v", code, body)
	}
	if status := currentSelfUpdateStatus(); status.Available || status.Reason != selfUpdateReasonInProgress {
		t.Fatalf("status = %+v", status)
	}
	if len(calls) != 1 {
		t.Fatalf("watchtower called %d times", len(calls))
	}
}

func TestTriggerSelfUpdateReportsWatchtowerErrorsAndAllowsRetry(t *testing.T) {
	setupSelfUpdateTest(t, availableUpdate)
	var calls []watchtowerCall
	t.Setenv("WATCHTOWER_URL", fakeWatchtower(t, http.StatusUnauthorized, &calls).URL)
	t.Setenv("WATCHTOWER_TOKEN", "wrong-token")

	code, body := callTriggerSelfUpdate(t)
	if code != http.StatusBadGateway || !strings.Contains(body["error"].(string), "WATCHTOWER_TOKEN") {
		t.Fatalf("got %d %v", code, body)
	}
	if strings.Contains(body["error"].(string), "wrong-token") {
		t.Fatal("token leaked into the error message")
	}
	if !selfUpdates.begin(time.Now()) {
		t.Fatal("a failed trigger must release the guard so the admin can retry")
	}
}

func TestTriggerSelfUpdateAbortsWhenBackupFails(t *testing.T) {
	dir := setupSelfUpdateTest(t, availableUpdate)
	var calls []watchtowerCall
	t.Setenv("WATCHTOWER_URL", fakeWatchtower(t, http.StatusAccepted, &calls).URL)
	t.Setenv("WATCHTOWER_TOKEN", "secret-token")
	// A regular file where the backups directory should go makes the backup fail.
	if err := os.WriteFile(filepath.Join(dir, "backups"), []byte("x"), 0o600); err != nil {
		t.Fatal(err)
	}

	code, body := callTriggerSelfUpdate(t)
	if code != http.StatusInternalServerError || len(calls) != 0 {
		t.Fatalf("got %d %v, watchtower calls %d; must not update without a backup", code, body, len(calls))
	}
}

func TestRequestWatchtowerUpdateRejectsBadURL(t *testing.T) {
	for _, raw := range []string{"watchtower:8080", "ftp://watchtower", "http://"} {
		if err := requestWatchtowerUpdate(watchtowerConfig{URL: raw, Token: "t", Image: "ictrun/kuno"}); err == nil {
			t.Errorf("URL %q should be rejected", raw)
		}
	}
}
