package app

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"

	_ "modernc.org/sqlite"
)

// Store wraps the SQLite database handle.
type Store struct {
	db *sql.DB
}

// OpenStore opens the SQLite database at the given path and ensures the schema exists.
func OpenStore(path string) (*Store, error) {
	if path == "" {
		path = "safeguarding.db"
	}
	log.Printf("opening SQLite database at %s", path)

	db, err := sql.Open("sqlite", path)
	if err != nil {
		return nil, err
	}
	// Reasonable pool settings for a single-file SQLite DB.
	db.SetMaxOpenConns(1)

	if _, err := db.Exec("PRAGMA foreign_keys = ON;"); err != nil {
		_ = db.Close()
		return nil, err
	}

	s := &Store{db: db}
	if err := s.migrate(); err != nil {
		_ = db.Close()
		return nil, err
	}
	return s, nil
}

// DB exposes the underlying SQL handle (used to keep handler signatures friendly).
func (s *Store) DB() *sql.DB {
	return s.db
}

// Close closes the underlying database.
func (s *Store) Close() error {
	return s.db.Close()
}

func (s *Store) migrate() error {
	const schema = `
CREATE TABLE IF NOT EXISTS admins (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	username TEXT NOT NULL,
	email TEXT NOT NULL,
	passwordHash TEXT NOT NULL,
	salt TEXT NOT NULL,
	staffId TEXT,
	loginHistory TEXT,
	createdAt DATETIME NOT NULL,
	updatedAt DATETIME
);

CREATE TABLE IF NOT EXISTS superadmins (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	username TEXT NOT NULL,
	email TEXT NOT NULL,
	passwordHash TEXT NOT NULL,
	salt TEXT NOT NULL,
	loginHistory TEXT,
	createdAt DATETIME NOT NULL,
	updatedAt DATETIME
);

CREATE TABLE IF NOT EXISTS staff (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	name TEXT NOT NULL,
	role TEXT NOT NULL DEFAULT '',
	createdAt DATETIME NOT NULL,
	updatedAt DATETIME
);

CREATE TABLE IF NOT EXISTS messages (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	topic TEXT NOT NULL,
	message TEXT NOT NULL,
	reportedStaff TEXT,
	threadToken TEXT NOT NULL,
	isRead INTEGER NOT NULL DEFAULT 0,
	isDeleted INTEGER NOT NULL DEFAULT 0,
	readAt DATETIME,
	createdAt DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS replies (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	threadToken TEXT NOT NULL,
	topic TEXT NOT NULL,
	message TEXT NOT NULL,
	isDeleted INTEGER NOT NULL DEFAULT 0,
	createdAt DATETIME NOT NULL,
	updatedAt DATETIME
);
`
	if _, err := s.db.Exec(schema); err != nil {
		return fmt.Errorf("migrate: %w", err)
	}
	return nil
}

// helpers for scanning bool values from SQLite INTEGER columns.

func scanBool(v bool) int {
	if v {
		return 1
	}
	return 0
}

func toBool(v any) bool {
	if b, ok := v.(bool); ok {
		return b
	}
	if i, ok := v.(int64); ok {
		return i != 0
	}
	if i, ok := v.(int); ok {
		return i != 0
	}
	return false
}

func marshalLoginHistory(entries []LoginHistoryEntry) (string, error) {
	if len(entries) == 0 {
		return "", nil
	}
	data, err := json.Marshal(entries)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

func unmarshalLoginHistory(data any) []LoginHistoryEntry {
	if data == nil {
		return nil
	}
	var raw string
	switch v := data.(type) {
	case string:
		raw = v
	case []byte:
		raw = string(v)
	default:
		return nil
	}
	if raw == "" {
		return nil
	}
	var entries []LoginHistoryEntry
	if err := json.Unmarshal([]byte(raw), &entries); err != nil {
		return nil
	}
	return entries
}

// scanRowBool is a convenience for scanning nullable/non-null bools.
func scanBoolPtr(v sql.NullInt64) *bool {
	if !v.Valid {
		return nil
	}
	b := v.Int64 != 0
	return &b
}

