package database

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

// databasePath returns the SQLite file path used by InitDatabase.
func databasePath() string {
	return getEnv("DB_PATH", "./data/blog.db")
}

// BackupDir is where database snapshots are written: a "backups" folder next to
// the database file, so it lives on the same persistent volume.
func BackupDir() string {
	return filepath.Join(filepath.Dir(databasePath()), "backups")
}

// CreateBackup writes a consistent snapshot of the live database to
// BackupDir()/<prefix><UTC timestamp>.db and keeps only the newest `keep`
// snapshots with that prefix. It returns the snapshot path.
func CreateBackup(prefix string, keep int) (string, error) {
	if DB == nil {
		return "", fmt.Errorf("database is not initialized")
	}

	dir := BackupDir()
	if err := os.MkdirAll(dir, 0o750); err != nil {
		return "", fmt.Errorf("create backup directory: %w", err)
	}

	path := filepath.Join(dir, prefix+time.Now().UTC().Format("20060102T150405.000Z")+".db")
	// VACUUM INTO produces a transactionally consistent copy while the app keeps running.
	if err := DB.Exec("VACUUM INTO ?", path).Error; err != nil {
		return "", fmt.Errorf("snapshot database: %w", err)
	}

	if err := pruneBackups(dir, prefix, keep); err != nil {
		return path, fmt.Errorf("snapshot written to %s, but pruning old backups failed: %w", path, err)
	}
	return path, nil
}

// pruneBackups deletes all but the newest `keep` files in dir that start with prefix.
func pruneBackups(dir, prefix string, keep int) error {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return err
	}

	type backupFile struct {
		path    string
		modTime time.Time
	}
	var backups []backupFile
	for _, entry := range entries {
		name := entry.Name()
		if entry.IsDir() || !strings.HasPrefix(name, prefix) || !strings.HasSuffix(name, ".db") {
			continue
		}
		info, err := entry.Info()
		if err != nil {
			return err
		}
		backups = append(backups, backupFile{path: filepath.Join(dir, name), modTime: info.ModTime()})
	}

	sort.Slice(backups, func(i, j int) bool {
		if backups[i].modTime.Equal(backups[j].modTime) {
			return backups[i].path > backups[j].path
		}
		return backups[i].modTime.After(backups[j].modTime)
	})

	for i := keep; i < len(backups); i++ {
		if err := os.Remove(backups[i].path); err != nil {
			return err
		}
	}
	return nil
}
