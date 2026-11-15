package database

import (
	"path/filepath"
	"testing"

	"blog-backend/internal/models"

	"golang.org/x/crypto/bcrypt"
)

// initTestDB points InitDatabase at a fresh SQLite file in a temp dir.
func initTestDB(t *testing.T) string {
	t.Helper()
	dbPath := filepath.Join(t.TempDir(), "blog.db")
	t.Setenv("DB_PATH", dbPath)
	t.Setenv("RECOVERY_MODE", "false")
	return dbPath
}

func createUser(t *testing.T, username, password string, isAdmin bool) {
	t.Helper()
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.MinCost)
	if err != nil {
		t.Fatalf("hash password: %v", err)
	}
	user := models.User{Username: username, Password: string(hash), IsAdmin: isAdmin}
	if err := DB.Create(&user).Error; err != nil {
		t.Fatalf("create user %s: %v", username, err)
	}
}

func passwordMatches(t *testing.T, username, password string) bool {
	t.Helper()
	var user models.User
	if err := DB.Where("username = ?", username).First(&user).Error; err != nil {
		t.Fatalf("load user %s: %v", username, err)
	}
	return bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password)) == nil
}

func userCount(t *testing.T) int64 {
	t.Helper()
	var count int64
	DB.Model(&models.User{}).Count(&count)
	return count
}

func setupCompleted(t *testing.T) bool {
	t.Helper()
	var settings models.SiteSettings
	if err := DB.First(&settings).Error; err != nil {
		t.Fatalf("load settings: %v", err)
	}
	return settings.SetupCompleted
}

func TestInitDatabase_FreshInstallCreatesNoUsers(t *testing.T) {
	initTestDB(t)
	InitDatabase()

	if got := userCount(t); got != 0 {
		t.Fatalf("fresh install must not create any user, got %d", got)
	}
	if setupCompleted(t) {
		t.Fatal("fresh install must leave setup incomplete so the wizard runs")
	}
}

func TestInitDatabase_RestartBeforeSetupKeepsWizard(t *testing.T) {
	initTestDB(t)
	InitDatabase()
	InitDatabase() // simulate a container restart before the wizard was used

	if got := userCount(t); got != 0 {
		t.Fatalf("restart must not create any user, got %d", got)
	}
	if setupCompleted(t) {
		t.Fatal("restart before setup must not mark setup as completed")
	}
}

func TestInitDatabase_RotatesLegacyAdminWhenAnotherAdminExists(t *testing.T) {
	initTestDB(t)
	InitDatabase()
	createUser(t, legacyAdminUsername, legacyAdminPassword, true)
	createUser(t, "alice", "alice-own-password", true)

	InitDatabase()

	if passwordMatches(t, legacyAdminUsername, legacyAdminPassword) {
		t.Fatal("legacy default password must no longer work for admin")
	}
	if !passwordMatches(t, "alice", "alice-own-password") {
		t.Fatal("other admin accounts must be left untouched")
	}
}

func TestInitDatabase_RotatesLegacyAdminWhenItIsTheOnlyAdmin(t *testing.T) {
	initTestDB(t)
	InitDatabase()
	createUser(t, legacyAdminUsername, legacyAdminPassword, true)

	InitDatabase()

	if passwordMatches(t, legacyAdminUsername, legacyAdminPassword) {
		t.Fatal("legacy default password must no longer work for admin")
	}
	if !setupCompleted(t) {
		t.Fatal("an installation with an existing admin must stay marked as set up")
	}
}

func TestInitDatabase_LeavesChangedAdminPasswordAlone(t *testing.T) {
	initTestDB(t)
	InitDatabase()
	createUser(t, legacyAdminUsername, "operator-chosen-password", true)

	InitDatabase()

	if !passwordMatches(t, legacyAdminUsername, "operator-chosen-password") {
		t.Fatal("an admin password the operator already changed must not be rotated")
	}
}

func TestRotateLegacyAdminPassword_ReturnsWorkingRandomPassword(t *testing.T) {
	initTestDB(t)
	InitDatabase()
	createUser(t, legacyAdminUsername, legacyAdminPassword, true)

	newPassword, rotated, err := rotateLegacyAdminPassword()
	if err != nil {
		t.Fatalf("rotate: %v", err)
	}
	if !rotated {
		t.Fatal("expected the legacy admin to be rotated")
	}
	if len(newPassword) < 16 || newPassword == legacyAdminPassword {
		t.Fatalf("expected a long random password, got %q", newPassword)
	}
	if !passwordMatches(t, legacyAdminUsername, newPassword) {
		t.Fatal("the returned password must be the one stored")
	}

	_, rotatedAgain, err := rotateLegacyAdminPassword()
	if err != nil || rotatedAgain {
		t.Fatalf("second run must be a no-op, rotated=%v err=%v", rotatedAgain, err)
	}
}

func TestResetAdminPasswordForRecovery_UsesRandomPassword(t *testing.T) {
	initTestDB(t)
	InitDatabase()
	createUser(t, "alice", "forgotten-password", true)

	username, newPassword, err := resetAdminPasswordForRecovery()
	if err != nil {
		t.Fatalf("recovery reset: %v", err)
	}
	if username != "alice" {
		t.Fatalf("expected the existing admin to be reset, got %q", username)
	}
	if newPassword == legacyAdminPassword || len(newPassword) < 16 {
		t.Fatalf("recovery must not fall back to a hard-coded password, got %q", newPassword)
	}
	if !passwordMatches(t, "alice", newPassword) {
		t.Fatal("the returned recovery password must be the one stored")
	}
}

func TestResetAdminPasswordForRecovery_FailsWithoutAdmin(t *testing.T) {
	initTestDB(t)
	InitDatabase()

	if _, _, err := resetAdminPasswordForRecovery(); err == nil {
		t.Fatal("recovery without any admin account must fail")
	}
}
