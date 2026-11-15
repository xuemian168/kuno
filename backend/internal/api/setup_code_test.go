package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"regexp"
	"strings"
	"testing"

	"blog-backend/internal/database"
	"blog-backend/internal/models"

	"github.com/gin-gonic/gin"
)

var setupCodePattern = regexp.MustCompile(`^[A-Z2-7]{4}(-[A-Z2-7]{4}){3}$`)

func TestNewSetupCode_FormatAndRandomness(t *testing.T) {
	first, err := newSetupCode()
	if err != nil {
		t.Fatalf("newSetupCode: %v", err)
	}
	second, err := newSetupCode()
	if err != nil {
		t.Fatalf("newSetupCode: %v", err)
	}
	if !setupCodePattern.MatchString(first) {
		t.Fatalf("unexpected setup code format: %q", first)
	}
	if first == second {
		t.Fatal("two generated setup codes must differ")
	}
}

func TestSetupCodeStore_Verify(t *testing.T) {
	store := &setupCodeStore{}
	if store.verify("") || store.verify("ABCD-EFGH-JKLM-NPQR") {
		t.Fatal("an empty store must reject every code")
	}

	code, err := store.issue()
	if err != nil {
		t.Fatalf("issue: %v", err)
	}
	if !store.verify(code) {
		t.Fatal("the issued code must verify")
	}
	relaxed := strings.ToLower(strings.ReplaceAll(code, "-", " "))
	if !store.verify(relaxed) {
		t.Fatalf("case and separators must not matter, input %q", relaxed)
	}
	if store.verify("AAAA-AAAA-AAAA-AAAA") {
		t.Fatal("a wrong code must be rejected")
	}

	store.clear()
	if store.verify(code) {
		t.Fatal("a cleared code must be rejected")
	}
}

// --- handler tests -------------------------------------------------------

func initSetupTestDB(t *testing.T) {
	t.Helper()
	t.Setenv("DB_PATH", filepath.Join(t.TempDir(), "blog.db"))
	t.Setenv("RECOVERY_MODE", "false")
	database.InitDatabase()
	setupCodes.clear()
	t.Cleanup(setupCodes.clear)
}

func postSetup(t *testing.T, body map[string]string) *httptest.ResponseRecorder {
	t.Helper()
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.POST("/api/setup/initialize", InitializeSetup)

	payload, _ := json.Marshal(body)
	req := httptest.NewRequest(http.MethodPost, "/api/setup/initialize", bytes.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	return rec
}

func setupBody(code string) map[string]string {
	return map[string]string{
		"site_title":       "My Blog",
		"default_language": "en",
		"admin_username":   "alice",
		"admin_password":   "Str0ng-pass",
		"setup_code":       code,
	}
}

func countUsers(t *testing.T) int64 {
	t.Helper()
	var count int64
	database.DB.Model(&models.User{}).Count(&count)
	return count
}

func TestPrepareSetupCode_IssuesCodeOnlyBeforeSetup(t *testing.T) {
	initSetupTestDB(t)

	PrepareSetupCode()
	if setupCodes.current() == "" {
		t.Fatal("a setup code must be issued while setup is not completed")
	}

	if rec := postSetup(t, setupBody(setupCodes.current())); rec.Code != http.StatusOK {
		t.Fatalf("setup with the valid code: status %d body %s", rec.Code, rec.Body.String())
	}

	PrepareSetupCode()
	if setupCodes.current() != "" {
		t.Fatal("no setup code must be issued once setup is completed")
	}
}

func TestInitializeSetup_RejectsWrongCode(t *testing.T) {
	initSetupTestDB(t)
	PrepareSetupCode()

	rec := postSetup(t, setupBody("AAAA-AAAA-AAAA-AAAA"))
	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403 for a wrong setup code, got %d %s", rec.Code, rec.Body.String())
	}
	if got := countUsers(t); got != 0 {
		t.Fatalf("a rejected setup must not create users, got %d", got)
	}
}

func TestInitializeSetup_RejectsMissingCode(t *testing.T) {
	initSetupTestDB(t)
	PrepareSetupCode()

	body := setupBody("")
	delete(body, "setup_code")
	if rec := postSetup(t, body); rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 without a setup code, got %d", rec.Code)
	}
	if got := countUsers(t); got != 0 {
		t.Fatalf("a rejected setup must not create users, got %d", got)
	}
}

func TestInitializeSetup_FailsClosedWithoutIssuedCode(t *testing.T) {
	initSetupTestDB(t) // no PrepareSetupCode call: nothing was issued

	if rec := postSetup(t, setupBody("AAAA-AAAA-AAAA-AAAA")); rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403 when no code was issued, got %d", rec.Code)
	}
}

func TestInitializeSetup_ValidCodeIsSingleUse(t *testing.T) {
	initSetupTestDB(t)
	PrepareSetupCode()
	code := setupCodes.current()

	if rec := postSetup(t, setupBody(code)); rec.Code != http.StatusOK {
		t.Fatalf("setup with the valid code: status %d body %s", rec.Code, rec.Body.String())
	}
	if got := countUsers(t); got != 1 {
		t.Fatalf("expected exactly one admin after setup, got %d", got)
	}
	if setupCodes.current() != "" {
		t.Fatal("the setup code must be cleared after a successful setup")
	}
	if rec := postSetup(t, setupBody(code)); rec.Code != http.StatusBadRequest {
		t.Fatalf("a second setup must be rejected, got %d", rec.Code)
	}
}
