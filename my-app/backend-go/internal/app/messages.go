package app

import (
	"database/sql"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
)

func messagesRoutes(store *Store) http.Handler {
	db := store.DB()
	r := chi.NewRouter()

	r.Get("/", func(w http.ResponseWriter, r *http.Request) {
		filter := r.URL.Query().Get("filter")
		date := r.URL.Query().Get("date")
		threadToken := r.URL.Query().Get("threadToken")
		excludedStaffID := r.URL.Query().Get("staffId")

		query := "SELECT id, topic, message, reportedStaff, threadToken, isRead, isDeleted, readAt, createdAt FROM messages WHERE isDeleted = 0"
		args := []any{}
		if threadToken != "" {
			query += " AND threadToken = ?"
			args = append(args, threadToken)
		}
		if date != "" {
			start, end, err := parseTimeRange(date)
			if err == nil {
				query += " AND createdAt >= ? AND createdAt < ?"
				args = append(args, start, end)
			}
		}
		if filter != "" {
			now := time.Now().UTC()
			var start time.Time
			switch filter {
			case "today":
				start = time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
			case "last7":
				start = now.AddDate(0, 0, -7)
			case "last30":
				start = now.AddDate(0, 0, -30)
			}
			if !start.IsZero() {
				query += " AND createdAt >= ?"
				args = append(args, start)
			}
		}
		if excludedStaffID != "" {
			query += " AND (reportedStaff IS NULL OR reportedStaff <> ?)"
			args = append(args, excludedStaffID)
		}

		rows, err := db.QueryContext(r.Context(), query, args...)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to load messages."})
			return
		}
		defer rows.Close()
		var messages []Message
		for rows.Next() {
			m, ok := scanMessage(rows)
			if !ok {
				continue
			}
			messages = append(messages, m)
		}
		if err := rows.Err(); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to load messages."})
			return
		}
		publicMessages := make([]map[string]any, 0, len(messages))
		for _, msg := range messages {
			publicMessages = append(publicMessages, msg.public())
		}
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "messages": publicMessages})
	})

	r.Get("/unread", func(w http.ResponseWriter, r *http.Request) {
		query := "SELECT id, topic, message, reportedStaff, threadToken, isRead, isDeleted, readAt, createdAt FROM messages WHERE isRead = 0 AND isDeleted = 0"
		args := []any{}
		if excludedStaffID := r.URL.Query().Get("staffId"); excludedStaffID != "" {
			query += " AND (reportedStaff IS NULL OR reportedStaff <> ?)"
			args = append(args, excludedStaffID)
		}
		rows, err := db.QueryContext(r.Context(), query, args...)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to load unread messages."})
			return
		}
		defer rows.Close()
		var messages []Message
		for rows.Next() {
			m, ok := scanMessage(rows)
			if !ok {
				continue
			}
			messages = append(messages, m)
		}
		if err := rows.Err(); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to load unread messages."})
			return
		}
		publicMessages := make([]map[string]any, 0, len(messages))
		for _, msg := range messages {
			publicMessages = append(publicMessages, msg.public())
		}
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "messages": publicMessages})
	})

	r.Get("/{id}", func(w http.ResponseWriter, r *http.Request) {
		id := chi.URLParam(r, "id")
		num, err := strconv.ParseInt(id, 10, 64)
		if err != nil || num == 0 {
			writeJSON(w, http.StatusNotFound, map[string]any{"error": "Message not found."})
			return
		}
		row := db.QueryRowContext(r.Context(), "SELECT id, topic, message, reportedStaff, threadToken, isRead, isDeleted, readAt, createdAt FROM messages WHERE id = ? AND isDeleted = 0", num)
		msg, ok := scanMessage(row)
		if !ok {
			writeJSON(w, http.StatusNotFound, map[string]any{"error": "Message not found."})
			return
		}
		if excludedStaffID := r.URL.Query().Get("staffId"); excludedStaffID != "" && msg.ReportedStaff != nil && *msg.ReportedStaff == excludedStaffID {
			writeJSON(w, http.StatusNotFound, map[string]any{"error": "Message not found."})
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "message": msg.public()})
	})

	r.Patch("/{id}/read", func(w http.ResponseWriter, r *http.Request) {
		id := chi.URLParam(r, "id")
		num, err := strconv.ParseInt(id, 10, 64)
		if err != nil || num == 0 {
			writeJSON(w, http.StatusNotFound, map[string]any{"error": "Message not found."})
			return
		}
		var current Message
		var reportedStaff sql.NullString
		var readAt sql.NullTime
		var isDeleted, isRead int
		err = db.QueryRowContext(r.Context(), "SELECT id, reportedStaff, isRead, isDeleted, readAt FROM messages WHERE id = ?", num).Scan(&current.ID, &reportedStaff, &isRead, &isDeleted, &readAt)
		if err != nil {
			writeJSON(w, http.StatusNotFound, map[string]any{"error": "Message not found."})
			return
		}
		if reportedStaff.Valid {
			current.ReportedStaff = &reportedStaff.String
		}
		if excludedStaffID := r.URL.Query().Get("staffId"); excludedStaffID != "" && current.ReportedStaff != nil && *current.ReportedStaff == excludedStaffID {
			writeJSON(w, http.StatusNotFound, map[string]any{"error": "Message not found."})
			return
		}
		if isDeleted != 0 {
			writeJSON(w, http.StatusNotFound, map[string]any{"error": "Message not found."})
			return
		}
		now := time.Now().UTC()
		if _, err := db.ExecContext(r.Context(), "UPDATE messages SET isRead = 1, readAt = ? WHERE id = ?", now, num); err != nil {
			writeJSON(w, http.StatusNotFound, map[string]any{"error": "Message not found."})
			return
		}
		current.IsRead = true
		current.IsDeleted = isDeleted != 0
		current.ReadAt = &now
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "message": current.public()})
	})

	r.Patch("/mark-all-read", func(w http.ResponseWriter, r *http.Request) {
		query := "UPDATE messages SET isRead = 1, readAt = ? WHERE isRead = 0 AND isDeleted = 0"
		args := []any{time.Now().UTC()}
		if excludedStaffID := r.URL.Query().Get("staffId"); excludedStaffID != "" {
			query += " AND (reportedStaff IS NULL OR reportedStaff <> ?)"
			args = append(args, excludedStaffID)
		}
		result, err := db.ExecContext(r.Context(), query, args...)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to mark messages as read."})
			return
		}
		modified, _ := result.RowsAffected()
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "modifiedCount": modified})
	})

	r.Post("/", func(w http.ResponseWriter, r *http.Request) {
		var payload struct {
			Topic         string `json:"topic"`
			Message       string `json:"message"`
			ReportedStaff string `json:"reportedStaff"`
		}
		if err := decodePayload(r, &payload); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid JSON payload"})
			return
		}
		topic := strings.TrimSpace(payload.Topic)
		message := strings.TrimSpace(payload.Message)
		if topic == "" || message == "" {
			writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Topic and message are required"})
			return
		}
		threadToken := randomHex(12)
		now := time.Now().UTC()
		var reportedStaff any
		if payload.ReportedStaff != "" {
			reportedStaff = payload.ReportedStaff
		}
		result, err := db.ExecContext(r.Context(),
			"INSERT INTO messages (topic, message, reportedStaff, threadToken, isRead, isDeleted, createdAt) VALUES (?, ?, ?, ?, 0, 0, ?)",
			topic, message, reportedStaff, threadToken, now)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to send message."})
			return
		}
		id, _ := result.LastInsertId()
		msg := Message{ID: id, Topic: topic, Message: message, ThreadToken: threadToken, IsRead: false, IsDeleted: false, CreatedAt: now}
		if payload.ReportedStaff != "" {
			msg.ReportedStaff = &payload.ReportedStaff
		}
		writeJSON(w, http.StatusCreated, map[string]any{"success": true, "threadToken": msg.ThreadToken})
	})

	return r
}

// scanner abstracts *sql.Row and *sql.Rows for scanning a message row.
type scanner interface {
	Scan(dest ...any) error
}

func scanMessage(s scanner) (Message, bool) {
	var m Message
	var reportedStaff sql.NullString
	var readAt sql.NullTime
	var isRead, isDeleted int
	if err := s.Scan(&m.ID, &m.Topic, &m.Message, &reportedStaff, &m.ThreadToken, &isRead, &isDeleted, &readAt, &m.CreatedAt); err != nil {
		if err == sql.ErrNoRows {
			return m, false
		}
		return m, false
	}
	if reportedStaff.Valid {
		m.ReportedStaff = &reportedStaff.String
	}
	m.IsRead = isRead != 0
	m.IsDeleted = isDeleted != 0
	if readAt.Valid {
		t := readAt.Time.UTC()
		m.ReadAt = &t
	}
	m.CreatedAt = m.CreatedAt.UTC()
	return m, true
}
