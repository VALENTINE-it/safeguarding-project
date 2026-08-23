package app

import (
	"database/sql"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
)

func threadsRoutes(store *Store) http.Handler {
	db := store.DB()
	r := chi.NewRouter()

	r.Get("/{threadToken}", func(w http.ResponseWriter, r *http.Request) {
		threadToken := chi.URLParam(r, "threadToken")
		if strings.TrimSpace(threadToken) == "" {
			writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid thread token format"})
			return
		}
		var thread Message
		var reportedStaff sql.NullString
		var readAt sql.NullTime
		var isRead, isDeleted int
		err := db.QueryRowContext(r.Context(),
			"SELECT id, topic, message, reportedStaff, threadToken, isRead, isDeleted, readAt, createdAt FROM messages WHERE threadToken = ?",
			threadToken).Scan(&thread.ID, &thread.Topic, &thread.Message, &reportedStaff, &thread.ThreadToken, &isRead, &isDeleted, &readAt, &thread.CreatedAt)
		if err != nil {
			writeJSON(w, http.StatusNotFound, map[string]any{"error": "Thread not found. Check your token."})
			return
		}
		if reportedStaff.Valid {
			thread.ReportedStaff = &reportedStaff.String
		}
		thread.IsRead = isRead != 0
		thread.IsDeleted = isDeleted != 0
		if readAt.Valid {
			t := readAt.Time.UTC()
			thread.ReadAt = &t
		}
		thread.CreatedAt = thread.CreatedAt.UTC()

		if !thread.IsRead {
			_, _ = db.ExecContext(r.Context(), "UPDATE messages SET isRead = 1, readAt = ? WHERE id = ?", time.Now().UTC(), thread.ID)
			thread.IsRead = true
		}

		var replies []Reply
		rows, err := db.QueryContext(r.Context(), "SELECT id, threadToken, topic, message, isDeleted, createdAt, updatedAt FROM replies WHERE threadToken = ?", threadToken)
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var rp Reply
				var createdAt, updatedAt time.Time
				var isDeletedFlag int
				if err := rows.Scan(&rp.ID, &rp.ThreadToken, &rp.Topic, &rp.Message, &isDeletedFlag, &createdAt, &updatedAt); err != nil {
					continue
				}
				rp.IsDeleted = isDeletedFlag != 0
				rp.CreatedAt = createdAt.UTC()
				if !updatedAt.IsZero() {
					rp.UpdatedAt = updatedAt.UTC()
				}
				replies = append(replies, rp)
			}
			_ = rows.Err()
		}

		writeJSON(w, http.StatusOK, map[string]any{"success": true, "thread": map[string]any{"threadToken": thread.ThreadToken, "topic": thread.Topic, "message": thread.Message, "isDeleted": thread.IsDeleted, "isRead": thread.IsRead, "readAt": thread.ReadAt, "createdAt": thread.CreatedAt, "replies": replies}})
	})

	r.Post("/{threadToken}/reply", func(w http.ResponseWriter, r *http.Request) {
		threadToken := chi.URLParam(r, "threadToken")
		if strings.TrimSpace(threadToken) == "" {
			writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid thread token format"})
			return
		}
		var payload struct {
			Topic   string `json:"topic"`
			Message string `json:"message"`
		}
		if err := decodePayload(r, &payload); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid JSON payload"})
			return
		}
		if strings.TrimSpace(payload.Topic) == "" || strings.TrimSpace(payload.Message) == "" {
			writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Topic and message are required"})
			return
		}

		var threadID int64
		var isDeleted int
		err := db.QueryRowContext(r.Context(), "SELECT id, isDeleted FROM messages WHERE threadToken = ?", threadToken).Scan(&threadID, &isDeleted)
		if err != nil {
			writeJSON(w, http.StatusNotFound, map[string]any{"error": "Thread not found. Check your token."})
			return
		}
		if isDeleted != 0 {
			writeJSON(w, http.StatusGone, map[string]any{"error": "This thread has been deleted."})
			return
		}
		now := time.Now().UTC()
		reply := Reply{ThreadToken: threadToken, Topic: strings.TrimSpace(payload.Topic), Message: strings.TrimSpace(payload.Message), CreatedAt: now}
		_, err = db.ExecContext(r.Context(),
			"INSERT INTO replies (threadToken, topic, message, isDeleted, createdAt, updatedAt) VALUES (?, ?, ?, 0, ?, ?)",
			threadToken, reply.Topic, reply.Message, now, now)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to send follow-up. Please try again."})
			return
		}
		writeJSON(w, http.StatusCreated, map[string]any{"success": true, "message": "Your follow-up has been sent securely.", "reply": map[string]any{"topic": reply.Topic, "createdAt": reply.CreatedAt}})
	})

	return r
}
