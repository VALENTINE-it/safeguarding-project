package app

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"

	_ "github.com/tursodatabase/libsql-client-go/libsql"
	_ "modernc.org/sqlite"
)

// Store wraps the SQLite / libSQL database handle.
type Store struct {
	db *sql.DB
}

func buildTursoURL(rawURL, token string) string {
	rawURL = strings.TrimSpace(rawURL)
	token = strings.TrimSpace(token)
	if token == "" || strings.Contains(rawURL, "authToken=") {
		return rawURL
	}
	if strings.Contains(rawURL, "?") {
		return rawURL + "&authToken=" + token
	}
	return rawURL + "?authToken=" + token
}

// OpenStore opens the Turso / libSQL cloud database (if configured) or local SQLite database.
func OpenStore(path string) (*Store, error) {
	tursoURL := os.Getenv("TURSO_DATABASE_URL")
	if tursoURL == "" {
		tursoURL = os.Getenv("DB_URL")
	}
	tursoToken := os.Getenv("TURSO_AUTH_TOKEN")
	if tursoToken == "" {
		tursoToken = os.Getenv("DB_AUTH_TOKEN")
	}

	if strings.HasPrefix(path, "libsql://") || strings.HasPrefix(path, "https://") || strings.Contains(path, ".turso.io") {
		tursoURL = path
	}

	if tursoURL != "" {
		fullURL := buildTursoURL(tursoURL, tursoToken)
		displayURL := strings.Split(tursoURL, "?")[0]
		log.Printf("connecting to Turso / libSQL cloud database at %s", displayURL)

		db, err := sql.Open("libsql", fullURL)
		if err != nil {
			return nil, fmt.Errorf("failed to open Turso database: %w", err)
		}
		db.SetMaxOpenConns(25)
		db.SetMaxIdleConns(5)
		db.SetConnMaxLifetime(5 * time.Minute)

		if err := db.Ping(); err != nil {
			_ = db.Close()
			return nil, fmt.Errorf("failed to connect to Turso database: %w", err)
		}

		s := &Store{db: db}
		if err := s.migrate(); err != nil {
			_ = db.Close()
			return nil, err
		}

		if err := s.seedDefaults(); err != nil {
			log.Printf("seed defaults warning: %v", err)
		}

		return s, nil
	}

	if path == "" {
		path = "safeguarding.db"
	}
	if dir := filepath.Dir(path); dir != "" && dir != "." {
		if err := os.MkdirAll(dir, 0755); err != nil {
			log.Printf("warning: unable to create database directory %s (%v), falling back to ./safeguarding.db", dir, err)
			path = "safeguarding.db"
		}
	}
	log.Printf("opening SQLite database at %s", path)

	db, err := sql.Open("sqlite", path)
	if err != nil {
		log.Printf("warning: unable to open SQLite database at %s (%v), falling back to ./safeguarding.db", path, err)
		path = "safeguarding.db"
		db, err = sql.Open("sqlite", path)
		if err != nil {
			return nil, fmt.Errorf("failed to open SQLite database: %w", err)
		}
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

	if err := s.seedDefaults(); err != nil {
		log.Printf("seed defaults warning: %v", err)
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

func (s *Store) seedDefaults() error {
	now := time.Now().UTC()

	var superCount int
	if err := s.db.QueryRow("SELECT COUNT(*) FROM superadmins").Scan(&superCount); err == nil && superCount == 0 {
		// Seed real SuperAdmin from dump.sql: Owano
		_, err = s.db.Exec(`
			INSERT INTO superadmins (username, email, passwordHash, salt, createdAt)
			VALUES ('Owano', 'valentineawili@gmail.com',
				'48e2c73bc1ab72cdc8ae38cbd64f793da58cea470dffa3e48dc4aab4dbcee110e251a118f0a1a9bea3570d05c23cb884cba1108e0e709dea299a6e1728094a75',
				'3daeffe9443c49135dab99a2cffc4509', ?);
		`, now)
		if err != nil {
			log.Printf("failed to seed Owano superadmin: %v", err)
		}
	}

	var adminCount int
	if err := s.db.QueryRow("SELECT COUNT(*) FROM admins").Scan(&adminCount); err == nil && adminCount == 0 {
		// Seed staff entries
		_, _ = s.db.Exec("INSERT INTO staff (id, name, role, createdAt, updatedAt) VALUES (1, 'Awili', 'Admin', ?, ?)", now, now)
		_, _ = s.db.Exec("INSERT INTO staff (id, name, role, createdAt, updatedAt) VALUES (2, 'Clay', 'Admin', ?, ?)", now, now)

		// Seed real Admin: Awili
		_, _ = s.db.Exec(`
			INSERT INTO admins (id, username, email, passwordHash, salt, staffId, createdAt, updatedAt)
			VALUES (1, 'Awili', 'awili@gmail.com',
				'062ba80236c34716e3098cffc5b0a1e8d4f694eb9db8c5fd855268309b7838990aa1d4c4549d0eef91e253f38ea7d7b61f4ebf2f0c0692f5c2d84a469eef55c5',
				'3b3b5d42d4a012a5a2eeffc005e40865', '1', ?, ?);
		`, now, now)

		// Seed real Admin: Clay
		_, _ = s.db.Exec(`
			INSERT INTO admins (id, username, email, passwordHash, salt, staffId, createdAt, updatedAt)
			VALUES (2, 'Clay', 'mikewillmakeit@gmail.com',
				'595df3ec203c1d4911bcd0b22830eae0569ebc0f056e15fe508d38701a1c4b9f767f1833ef8082a8c9a07f578cff67d169f0739e0476d79996164129270ff85d',
				'198205748f0e0464bdabe166b01fbb6d', '2', ?, ?);
		`, now, now)
	}

	var msgCount int
	if err := s.db.QueryRow("SELECT COUNT(*) FROM messages").Scan(&msgCount); err == nil && msgCount == 0 {
		_, _ = s.db.Exec("INSERT INTO messages (id, topic, message, reportedStaff, threadToken, isRead, isDeleted, readAt, createdAt) VALUES (1, 'hello', 'hi', NULL, 'f041cfe085391097cfeac461', 1, 0, ?, ?)", now, now)
		_, _ = s.db.Exec("INSERT INTO messages (id, topic, message, reportedStaff, threadToken, isRead, isDeleted, readAt, createdAt) VALUES (2, 'Test', 'Awili', '1', '53a472718e821fac7f59d80d', 1, 0, ?, ?)", now, now)
		_, _ = s.db.Exec("INSERT INTO messages (id, topic, message, reportedStaff, threadToken, isRead, isDeleted, readAt, createdAt) VALUES (3, 'Greetings', 'hi', NULL, '733e00942de3c74b0b215127', 1, 0, ?, ?)", now, now)
		_, _ = s.db.Exec("INSERT INTO messages (id, topic, message, reportedStaff, threadToken, isRead, isDeleted, readAt, createdAt) VALUES (4, 'Greetings', 'hello', NULL, '5bcaeca17fd26090dfef8d64', 1, 0, ?, ?)", now, now)
		_, _ = s.db.Exec("INSERT INTO messages (id, topic, message, reportedStaff, threadToken, isRead, isDeleted, readAt, createdAt) VALUES (5, 'ytguy', 'hy', NULL, '68dd1183a89dfd3b4de1e40c', 1, 0, ?, ?)", now, now)
		_, _ = s.db.Exec("INSERT INTO messages (id, topic, message, reportedStaff, threadToken, isRead, isDeleted, readAt, createdAt) VALUES (6, 'test', 'test', NULL, 'c405efb8afc10480e7f8bab0', 1, 0, ?, ?)", now, now)
		_, _ = s.db.Exec("INSERT INTO messages (id, topic, message, reportedStaff, threadToken, isRead, isDeleted, readAt, createdAt) VALUES (7, 'hg', 'hg', '1', '1ea483a3fd23497f2fe1f37e', 1, 0, ?, ?)", now, now)
	}

	return nil
}

