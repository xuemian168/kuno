package database

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestCreateBackupKeepsNewestSnapshots(t *testing.T) {
	dir := t.TempDir()
	dbPath := filepath.Join(dir, "blog.db")
	t.Setenv("DB_PATH", dbPath)

	db, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	oldDB := DB
	DB = db
	t.Cleanup(func() {
		DB = oldDB
		if sqlDB, err := db.DB(); err == nil {
			sqlDB.Close()
		}
	})
	if err := db.Exec("CREATE TABLE t (v TEXT)").Error; err != nil {
		t.Fatal(err)
	}

	// An unrelated file in the backups folder must survive pruning.
	backupDir := filepath.Join(dir, "backups")
	if err := os.MkdirAll(backupDir, 0o750); err != nil {
		t.Fatal(err)
	}
	manual := filepath.Join(backupDir, "manual.db")
	if err := os.WriteFile(manual, []byte("keep"), 0o600); err != nil {
		t.Fatal(err)
	}

	var paths []string
	for i := 0; i < 4; i++ {
		path, err := CreateBackup("pre-update-1.4.8-", 2)
		if err != nil {
			t.Fatal(err)
		}
		paths = append(paths, path)
		time.Sleep(5 * time.Millisecond) // distinct timestamps and mtimes
	}

	entries, err := os.ReadDir(backupDir)
	if err != nil {
		t.Fatal(err)
	}
	var kept []string
	for _, e := range entries {
		if strings.HasPrefix(e.Name(), "pre-update-") {
			kept = append(kept, filepath.Join(backupDir, e.Name()))
		}
	}
	if len(kept) != 2 {
		t.Fatalf("kept %v, want the 2 newest", kept)
	}
	for _, newest := range paths[2:] {
		if _, err := os.Stat(newest); err != nil {
			t.Errorf("newest backup %s was removed", newest)
		}
	}
	if _, err := os.Stat(manual); err != nil {
		t.Error("unrelated file in backups/ was removed")
	}
}

func TestCreateBackupWithoutDatabase(t *testing.T) {
	oldDB := DB
	DB = nil
	t.Cleanup(func() { DB = oldDB })
	if _, err := CreateBackup("pre-update-", 5); err == nil {
		t.Fatal("expected error when the database is not initialized")
	}
}
