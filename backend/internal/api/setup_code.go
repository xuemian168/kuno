package api

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/base32"
	"fmt"
	"log"
	"strings"
	"sync"

	"blog-backend/internal/database"
	"blog-backend/internal/models"
)

// The setup wizard endpoint is public. To stop whoever reaches a fresh
// instance first from claiming it, setup requires a one-time code that is
// printed in the server logs, which only the operator can read.

const (
	setupCodeBytes     = 10 // 80 bits -> 16 base32 characters
	setupCodeGroupSize = 4
)

type setupCodeStore struct {
	mu   sync.Mutex
	code string // normalized (upper-case, no separators); empty = none issued
}

var setupCodes = &setupCodeStore{}

// newSetupCode returns a random code formatted as XXXX-XXXX-XXXX-XXXX.
func newSetupCode() (string, error) {
	buf := make([]byte, setupCodeBytes)
	if _, err := rand.Read(buf); err != nil {
		return "", fmt.Errorf("generate setup code: %w", err)
	}
	raw := base32.StdEncoding.WithPadding(base32.NoPadding).EncodeToString(buf)

	groups := make([]string, 0, len(raw)/setupCodeGroupSize)
	for i := 0; i < len(raw); i += setupCodeGroupSize {
		groups = append(groups, raw[i:i+setupCodeGroupSize])
	}
	return strings.Join(groups, "-"), nil
}

func normalizeSetupCode(code string) string {
	replacer := strings.NewReplacer("-", "", " ", "")
	return strings.ToUpper(replacer.Replace(strings.TrimSpace(code)))
}

// issue replaces the current code with a new one and returns it formatted.
func (s *setupCodeStore) issue() (string, error) {
	code, err := newSetupCode()
	if err != nil {
		return "", err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	s.code = normalizeSetupCode(code)
	return code, nil
}

// verify reports whether input matches the issued code. It fails closed
// when no code has been issued.
func (s *setupCodeStore) verify(input string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.code == "" {
		return false
	}
	return subtle.ConstantTimeCompare([]byte(s.code), []byte(normalizeSetupCode(input))) == 1
}

func (s *setupCodeStore) current() string {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.code
}

func (s *setupCodeStore) clear() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.code = ""
}

func isSetupCompleted() bool {
	var settings models.SiteSettings
	if err := database.DB.First(&settings).Error; err != nil {
		return false
	}
	return settings.SetupCompleted
}

// PrepareSetupCode issues a one-time setup code and logs it when the initial
// setup has not been completed yet. Call it once at startup.
func PrepareSetupCode() {
	if isSetupCompleted() {
		setupCodes.clear()
		return
	}

	code, err := setupCodes.issue()
	if err != nil {
		log.Fatalf("Failed to generate setup code: %v", err)
	}

	log.Println("================================================================")
	log.Println("🔐 KUNO is not set up yet. Open the setup wizard in your browser")
	log.Println("   and enter this one-time setup code:")
	log.Printf("   Setup code: %s", code)
	log.Println("   A new code is generated on every restart until setup is done.")
	log.Println("================================================================")
}
