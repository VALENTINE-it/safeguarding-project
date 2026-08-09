package app

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
)

func staffRoutes(store *Store) http.Handler {
	db := store.DB()
	r := chi.NewRouter()

	r.Get("/", func(w http.ResponseWriter, r *http.Request) {
		rows, err := db.QueryContext(r.Context(), "SELECT id, name, role, createdAt, updatedAt FROM staff")
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to load staff list."})
			return
		}
		defer rows.Close()
		var staff []Staff
		for rows.Next() {
			var s Staff
			var createdAt, updatedAt time.Time
			if err := rows.Scan(&s.ID, &s.Name, &s.Role, &createdAt, &updatedAt); err != nil {
				continue
			}
			s.CreatedAt = createdAt.UTC()
			if !updatedAt.IsZero() {
				s.UpdatedAt = updatedAt.UTC()
			}
			staff = append(staff, s)
		}
		if err := rows.Err(); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to load staff list."})
			return
		}
		public := make([]map[string]any, 0, len(staff))
		for _, member := range staff {
			public = append(public, member.public())
		}
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "staff": public})
	})

	r.Post("/", func(w http.ResponseWriter, r *http.Request) {
		var payload struct {
			Name string `json:"name"`
			Role string `json:"role"`
		}
		if err := decodePayload(r, &payload); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid JSON payload"})
			return
		}
		name := strings.TrimSpace(payload.Name)
		if name == "" {
			writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Staff name is required"})
			return
		}
		role := strings.TrimSpace(payload.Role)
		now := time.Now().UTC()
		result, err := db.ExecContext(r.Context(),
			"INSERT INTO staff (name, role, createdAt, updatedAt) VALUES (?, ?, ?, ?)",
			name, role, now, now)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to add staff member."})
			return
		}
		id, _ := result.LastInsertId()
		member := Staff{ID: id, Name: name, Role: role, CreatedAt: now, UpdatedAt: now}
		writeJSON(w, http.StatusCreated, map[string]any{"success": true, "staff": member.public()})
	})

	r.Delete("/{id}", func(w http.ResponseWriter, r *http.Request) {
		id := chi.URLParam(r, "id")
		num, err := strconv.ParseInt(id, 10, 64)
		if err != nil || num == 0 {
			writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid staff id"})
			return
		}
		result, err := db.ExecContext(r.Context(), "DELETE FROM staff WHERE id = ?", num)
		if err != nil {
			writeJSON(w, http.StatusNotFound, map[string]any{"error": "Staff member not found."})
			return
		}
		deleted, _ := result.RowsAffected()
		if deleted == 0 {
			writeJSON(w, http.StatusNotFound, map[string]any{"error": "Staff member not found."})
			return
		}
		_, _ = db.ExecContext(r.Context(), "UPDATE admins SET staffId = NULL WHERE staffId = ?", id)
		writeJSON(w, http.StatusOK, map[string]any{"success": true})
	})

	return r
}
