package database

import (
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"log"

	"blog-backend/internal/models"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// Older releases (<= 1.4.6) created an "admin" account with this publicly
// documented password on first start (GHSA-p345-9r45-3529). The values are
// kept only to detect and neutralize that account on existing installations.
const (
	legacyAdminUsername = "admin"
	legacyAdminPassword = "xuemian168"
)

const generatedPasswordBytes = 18 // 24 base64url characters

// generateRandomPassword returns a URL-safe random password from crypto/rand.
func generateRandomPassword() (string, error) {
	buf := make([]byte, generatedPasswordBytes)
	if _, err := rand.Read(buf); err != nil {
		return "", fmt.Errorf("generate random password: %w", err)
	}
	return base64.RawURLEncoding.EncodeToString(buf), nil
}

func setUserPassword(user *models.User, password string) error {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("hash password: %w", err)
	}
	return DB.Model(user).Update("password", string(hash)).Error
}

// rotateLegacyAdminPassword replaces the legacy default password of the
// "admin" account with a random one. It reports whether a rotation happened;
// accounts whose password the operator already changed are left alone.
func rotateLegacyAdminPassword() (string, bool, error) {
	var admin models.User
	err := DB.Where("username = ?", legacyAdminUsername).First(&admin).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return "", false, nil
	}
	if err != nil {
		return "", false, fmt.Errorf("load legacy admin: %w", err)
	}
	if bcrypt.CompareHashAndPassword([]byte(admin.Password), []byte(legacyAdminPassword)) != nil {
		return "", false, nil
	}

	newPassword, err := generateRandomPassword()
	if err != nil {
		return "", false, err
	}
	if err := setUserPassword(&admin, newPassword); err != nil {
		return "", false, fmt.Errorf("rotate legacy admin password: %w", err)
	}
	return newPassword, true, nil
}

// secureLegacyAdminAccount runs on every start. If the legacy "admin" account
// still uses the default password, the password is replaced. When it is the
// only administrator, the new password is logged once so the operator (who
// can read the server logs) keeps access; otherwise it is discarded.
func secureLegacyAdminAccount() {
	newPassword, rotated, err := rotateLegacyAdminPassword()
	if err != nil {
		log.Fatalf("Failed to secure legacy admin account: %v", err)
	}
	if !rotated {
		return
	}

	var otherAdmins int64
	DB.Model(&models.User{}).
		Where("is_admin = ? AND username <> ?", true, legacyAdminUsername).
		Count(&otherAdmins)

	log.Println("⚠️  SECURITY: the 'admin' account still used the old default password (GHSA-p345-9r45-3529).")
	if otherAdmins > 0 {
		log.Println("🔒 Its password has been replaced with a random value. Use your own administrator account to sign in.")
		return
	}
	log.Println("🔒 Its password has been replaced. Sign in with the credentials below and change the password:")
	log.Printf("📋 Username: %s", legacyAdminUsername)
	log.Printf("🔑 Password: %s", newPassword)
}

// resetAdminPasswordForRecovery sets a new random password on the first
// administrator account and returns its username and the new password.
func resetAdminPasswordForRecovery() (string, string, error) {
	var admin models.User
	if err := DB.Where("is_admin = ?", true).Order("id ASC").First(&admin).Error; err != nil {
		return "", "", fmt.Errorf("no administrator account found: %w", err)
	}

	newPassword, err := generateRandomPassword()
	if err != nil {
		return "", "", err
	}
	if err := setUserPassword(&admin, newPassword); err != nil {
		return "", "", fmt.Errorf("reset administrator password: %w", err)
	}
	return admin.Username, newPassword, nil
}
