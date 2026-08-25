package app

import (
	"context"
	"crypto/rand"
	"crypto/sha512"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/golang-jwt/jwt/v5"
)

type GoogleClaims struct {
	Sub           string `json:"sub"`
	Email         string `json:"email"`
	EmailVerified any    `json:"email_verified"`
	Name          string `json:"name"`
	Picture       string `json:"picture"`
	Aud           string `json:"aud"`
	Azp           string `json:"azp"`
	Iss           string `json:"iss"`
	Error         string `json:"error"`
	ErrorDesc     string `json:"error_description"`
}

var verifyGoogleTokenFunc = verifyGoogleIDToken

func verifyGoogleIDToken(ctx context.Context, idToken string) (*GoogleClaims, error) {
	token := strings.TrimSpace(idToken)
	if token == "" {
		return nil, errors.New("missing Google credential token")
	}

	reqURL := "https://oauth2.googleapis.com/tokeninfo?id_token=" + url.QueryEscape(token)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL, nil)
	if err != nil {
		return nil, err
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to reach Google verification server: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, errors.New("invalid or expired Google token")
	}

	var claims GoogleClaims
	if err := json.NewDecoder(resp.Body).Decode(&claims); err != nil {
		return nil, fmt.Errorf("invalid response from Google verification: %w", err)
	}

	if claims.Error != "" {
		return nil, fmt.Errorf("google token error: %s", claims.ErrorDesc)
	}

	// Verify issuer
	if claims.Iss != "accounts.google.com" && claims.Iss != "https://accounts.google.com" {
		return nil, errors.New("invalid token issuer: expected accounts.google.com")
	}

	// Verify email is verified by Google
	isVerified := false
	switch v := claims.EmailVerified.(type) {
	case string:
		isVerified = strings.ToLower(v) == "true"
	case bool:
		isVerified = v
	}
	if !isVerified {
		return nil, errors.New("google account email is not verified")
	}

	if claims.Email == "" {
		return nil, errors.New("no email returned by Google account")
	}

	// Optional client ID check if GOOGLE_CLIENT_ID is configured
	expectedClientID := strings.TrimSpace(os.Getenv("GOOGLE_CLIENT_ID"))
	if expectedClientID != "" && claims.Aud != expectedClientID && claims.Azp != expectedClientID {
		return nil, errors.New("google token client ID mismatch")
	}

	return &claims, nil
}

func authRoutes(store *Store) http.Handler {
	db := store.DB()
	r := chi.NewRouter()

	r.Post("/register", func(w http.ResponseWriter, r *http.Request) {
		var payload struct {
			Username string `json:"username"`
			Email    string `json:"email"`
			Password string `json:"password"`
			StaffID  string `json:"staffId"`
			IsStaff  any    `json:"isStaff"`
		}
		if err := decodePayload(r, &payload); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid JSON payload"})
			return
		}

		username := strings.TrimSpace(payload.Username)
		email := strings.ToLower(strings.TrimSpace(payload.Email))
		password := payload.Password
		if username == "" || email == "" || password == "" {
			writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Username, email, and password are required"})
			return
		}
		if len(password) < 8 {
			writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Password must be at least 8 characters long"})
			return
		}

		// Check for existing username or email.
		var existingID int64
		err := db.QueryRowContext(r.Context(), "SELECT id FROM admins WHERE username = ? OR email = ?", username, email).Scan(&existingID)
		if err == nil {
			writeJSON(w, http.StatusConflict, map[string]any{"error": "Username or email already exists."})
			return
		} else if err != sql.ErrNoRows {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Unable to register admin account."})
			return
		}

		var count int
		if err := db.QueryRowContext(r.Context(), "SELECT COUNT(*) FROM admins").Scan(&count); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Unable to register admin account."})
			return
		}
		if count >= 3 {
			writeJSON(w, http.StatusForbidden, map[string]any{"error": "Admin registration limit reached. Maximum of 3 administrator accounts allowed."})
			return
		}

		isStaffYes := false
		switch v := payload.IsStaff.(type) {
		case string:
			s := strings.ToUpper(strings.TrimSpace(v))
			if s == "YES" || s == "TRUE" || s == "1" {
				isStaffYes = true
			}
		case bool:
			isStaffYes = v
		}

		var staffID *string
		if isStaffYes {
			now := time.Now().UTC()
			res, err := db.ExecContext(r.Context(),
				"INSERT INTO staff (name, role, createdAt, updatedAt) VALUES (?, ?, ?, ?)",
				username, "Admin", now, now)
			if err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Unable to register admin account."})
				return
			}
			newID, _ := res.LastInsertId()
			sID := strconv.FormatInt(newID, 10)
			staffID = &sID
		} else if payload.StaffID != "" {
			var staffIDNum int64
			if parsed, err := strconv.ParseInt(payload.StaffID, 10, 64); err == nil {
				staffIDNum = parsed
			}
			if staffIDNum == 0 {
				writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Selected staff member could not be found."})
				return
			}
			var staff Staff
			err := db.QueryRowContext(r.Context(), "SELECT id, name, role FROM staff WHERE id = ?", staffIDNum).Scan(&staff.ID, &staff.Name, &staff.Role)
			if err != nil {
				writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Selected staff member could not be found."})
				return
			}
			var linkedID int64
			err = db.QueryRowContext(r.Context(), "SELECT id FROM admins WHERE staffId = ?", payload.StaffID).Scan(&linkedID)
			if err == nil {
				writeJSON(w, http.StatusConflict, map[string]any{"error": "That staff member is already linked to another admin account."})
				return
			} else if err != sql.ErrNoRows {
				writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Unable to register admin account."})
				return
			}
			staffID = &payload.StaffID
		}

		salt := randomHex(16)
		hash := hashPassword(password, salt)
		now := time.Now().UTC()
		result, err := db.ExecContext(r.Context(),
			"INSERT INTO admins (username, email, passwordHash, salt, staffId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
			username, email, hash, salt, staffID, now, now)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Unable to register admin account."})
			return
		}
		id, _ := result.LastInsertId()
		admin := Admin{ID: id, Username: username, Email: email, StaffID: staffID, CreatedAt: now, UpdatedAt: now}
		token := signJWT(strconv.FormatInt(admin.ID, 10), "")
		writeJSON(w, http.StatusCreated, map[string]any{"success": true, "token": token, "admin": admin.public()})
	})

	r.Post("/login", func(w http.ResponseWriter, r *http.Request) {
		var payload struct {
			Username string `json:"username"`
			Password string `json:"password"`
		}
		if err := decodePayload(r, &payload); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid JSON payload"})
			return
		}

		username := strings.TrimSpace(payload.Username)
		password := payload.Password
		if username == "" || password == "" {
			writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Username or email is required"})
			return
		}

		var admin Admin
		var loginHistoryRaw sql.NullString
		var staffIDRaw sql.NullString
		var updatedAtRaw sql.NullTime
		err := db.QueryRowContext(r.Context(),
			"SELECT id, username, email, passwordHash, salt, staffId, loginHistory, createdAt, updatedAt FROM admins WHERE username = ? OR email = ?",
			username, strings.ToLower(username)).Scan(
			&admin.ID, &admin.Username, &admin.Email, &admin.PasswordHash, &admin.Salt, &staffIDRaw, &loginHistoryRaw, &admin.CreatedAt, &updatedAtRaw)
		if err != nil {
			writeJSON(w, http.StatusUnauthorized, map[string]any{"error": "Invalid username/email or password."})
			return
		}
		if staffIDRaw.Valid {
			admin.StaffID = &staffIDRaw.String
		}
		if updatedAtRaw.Valid {
			admin.UpdatedAt = updatedAtRaw.Time.UTC()
		}
		admin.CreatedAt = admin.CreatedAt.UTC()
		if !checkPassword(password, admin.Salt, admin.PasswordHash) {
			writeJSON(w, http.StatusUnauthorized, map[string]any{"error": "Invalid username/email or password."})
			return
		}

		if loginHistoryRaw.Valid {
			admin.LoginHistory = unmarshalLoginHistory(loginHistoryRaw.String)
		}
		admin.LoginHistory = append(admin.LoginHistory, LoginHistoryEntry{IP: r.RemoteAddr, UserAgent: r.UserAgent(), CreatedAt: time.Now().UTC()})
		if data, err := marshalLoginHistory(admin.LoginHistory); err == nil {
			_, _ = db.ExecContext(r.Context(), "UPDATE admins SET loginHistory = ? WHERE id = ?", data, admin.ID)
		}

		token := signJWT(strconv.FormatInt(admin.ID, 10), "")
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "token": token, "admin": admin.public()})
	})

	r.Post("/google", func(w http.ResponseWriter, r *http.Request) {
		var payload struct {
			Credential string `json:"credential"`
			StaffID    string `json:"staffId"`
			IsStaff    any    `json:"isStaff"`
		}
		if err := decodePayload(r, &payload); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid JSON payload"})
			return
		}

		claims, err := verifyGoogleTokenFunc(r.Context(), payload.Credential)
		if err != nil {
			writeJSON(w, http.StatusUnauthorized, map[string]any{"error": "Google authentication failed: " + err.Error()})
			return
		}

		email := strings.ToLower(strings.TrimSpace(claims.Email))
		if email == "" {
			writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Verified Google email is required."})
			return
		}

		// Check if admin already exists by email
		var admin Admin
		var loginHistoryRaw sql.NullString
		var staffIDRaw sql.NullString
		var updatedAtRaw sql.NullTime
		err = db.QueryRowContext(r.Context(),
			"SELECT id, username, email, passwordHash, salt, staffId, loginHistory, createdAt, updatedAt FROM admins WHERE email = ?",
			email).Scan(
			&admin.ID, &admin.Username, &admin.Email, &admin.PasswordHash, &admin.Salt, &staffIDRaw, &loginHistoryRaw, &admin.CreatedAt, &updatedAtRaw)

		if err == nil {
			// Existing Admin: Log in
			if staffIDRaw.Valid {
				admin.StaffID = &staffIDRaw.String
			}
			if updatedAtRaw.Valid {
				admin.UpdatedAt = updatedAtRaw.Time.UTC()
			}
			admin.CreatedAt = admin.CreatedAt.UTC()

			if loginHistoryRaw.Valid {
				admin.LoginHistory = unmarshalLoginHistory(loginHistoryRaw.String)
			}
			admin.LoginHistory = append(admin.LoginHistory, LoginHistoryEntry{IP: r.RemoteAddr, UserAgent: r.UserAgent(), CreatedAt: time.Now().UTC()})
			if data, err := marshalLoginHistory(admin.LoginHistory); err == nil {
				_, _ = db.ExecContext(r.Context(), "UPDATE admins SET loginHistory = ? WHERE id = ?", data, admin.ID)
			}

			token := signJWT(strconv.FormatInt(admin.ID, 10), "")
			writeJSON(w, http.StatusOK, map[string]any{"success": true, "token": token, "admin": admin.public()})
			return
		} else if err != sql.ErrNoRows {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Database error while verifying admin account."})
			return
		}

		// New Admin: Register
		var count int
		if err := db.QueryRowContext(r.Context(), "SELECT COUNT(*) FROM admins").Scan(&count); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Unable to register admin account."})
			return
		}
		if count >= 3 {
			writeJSON(w, http.StatusForbidden, map[string]any{"error": "Admin registration limit reached. Maximum of 3 administrator accounts allowed."})
			return
		}

		username := strings.TrimSpace(claims.Name)
		if username == "" {
			parts := strings.Split(email, "@")
			username = parts[0]
		}
		// Ensure unique username if another user has the same display name
		var existingID int64
		if err := db.QueryRowContext(r.Context(), "SELECT id FROM admins WHERE username = ?", username).Scan(&existingID); err == nil {
			username = username + "_" + randomHex(2)
		}

		isStaffYes := false
		switch v := payload.IsStaff.(type) {
		case string:
			s := strings.ToUpper(strings.TrimSpace(v))
			if s == "YES" || s == "TRUE" || s == "1" {
				isStaffYes = true
			}
		case bool:
			isStaffYes = v
		}

		var staffID *string
		if isStaffYes {
			now := time.Now().UTC()
			res, err := db.ExecContext(r.Context(),
				"INSERT INTO staff (name, role, createdAt, updatedAt) VALUES (?, ?, ?, ?)",
				username, "Admin", now, now)
			if err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Unable to register admin account."})
				return
			}
			newID, _ := res.LastInsertId()
			sID := strconv.FormatInt(newID, 10)
			staffID = &sID
		} else if payload.StaffID != "" {
			var staffIDNum int64
			if parsed, err := strconv.ParseInt(payload.StaffID, 10, 64); err == nil {
				staffIDNum = parsed
			}
			if staffIDNum == 0 {
				writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Selected staff member could not be found."})
				return
			}
			var staff Staff
			err := db.QueryRowContext(r.Context(), "SELECT id, name, role FROM staff WHERE id = ?", staffIDNum).Scan(&staff.ID, &staff.Name, &staff.Role)
			if err != nil {
				writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Selected staff member could not be found."})
				return
			}
			var linkedID int64
			err = db.QueryRowContext(r.Context(), "SELECT id FROM admins WHERE staffId = ?", payload.StaffID).Scan(&linkedID)
			if err == nil {
				writeJSON(w, http.StatusConflict, map[string]any{"error": "That staff member is already linked to another admin account."})
				return
			} else if err != sql.ErrNoRows {
				writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Unable to register admin account."})
				return
			}
			staffID = &payload.StaffID
		}

		salt := randomHex(16)
		randomPwd := randomHex(32)
		hash := hashPassword(randomPwd, salt)
		now := time.Now().UTC()
		result, err := db.ExecContext(r.Context(),
			"INSERT INTO admins (username, email, passwordHash, salt, staffId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
			username, email, hash, salt, staffID, now, now)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Unable to register admin account."})
			return
		}
		id, _ := result.LastInsertId()
		admin = Admin{ID: id, Username: username, Email: email, StaffID: staffID, CreatedAt: now, UpdatedAt: now}
		token := signJWT(strconv.FormatInt(admin.ID, 10), "")
		writeJSON(w, http.StatusCreated, map[string]any{"success": true, "token": token, "admin": admin.public()})
	})

	r.Get("/admins", func(w http.ResponseWriter, r *http.Request) {
		rows, err := db.QueryContext(r.Context(), "SELECT id, username, email, staffId, loginHistory, createdAt, updatedAt FROM admins")
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to fetch admin accounts."})
			return
		}
		defer rows.Close()

		var admins []Admin
		for rows.Next() {
			var a Admin
			var loginHistoryRaw sql.NullString
			var staffIDRaw sql.NullString
			var createdAt time.Time
			var updatedAtRaw sql.NullTime
			if err := rows.Scan(&a.ID, &a.Username, &a.Email, &staffIDRaw, &loginHistoryRaw, &createdAt, &updatedAtRaw); err != nil {
				continue
			}
			if staffIDRaw.Valid {
				a.StaffID = &staffIDRaw.String
			}
			a.CreatedAt = createdAt.UTC()
			if updatedAtRaw.Valid {
				a.UpdatedAt = updatedAtRaw.Time.UTC()
			}
			if loginHistoryRaw.Valid {
				a.LoginHistory = unmarshalLoginHistory(loginHistoryRaw.String)
			}
			admins = append(admins, a)
		}
		if err := rows.Err(); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to fetch admin accounts."})
			return
		}

		staffIds := make([]string, 0, len(admins))
		for _, admin := range admins {
			if admin.StaffID != nil {
				staffIds = append(staffIds, *admin.StaffID)
			}
		}

		staffByID := map[string]Staff{}
		if len(staffIds) > 0 {
			for _, id := range staffIds {
				if num, err := strconv.ParseInt(id, 10, 64); err == nil {
					var s Staff
					if err := db.QueryRowContext(r.Context(), "SELECT id, name, role FROM staff WHERE id = ?", num).Scan(&s.ID, &s.Name, &s.Role); err == nil {
						staffByID[id] = s
					}
				}
			}
		}

		public := make([]map[string]any, 0, len(admins))
		for _, admin := range admins {
			payload := admin.public()
			if admin.StaffID != nil {
				if staffRec, ok := staffByID[*admin.StaffID]; ok {
					payload["staffId"] = staffRec.public()
				}
			}
			public = append(public, payload)
		}
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "count": len(public), "limit": 3, "limitReached": len(public) >= 3, "admins": public})
	})

	r.Delete("/admins/{id}", func(w http.ResponseWriter, r *http.Request) {
		handleDeleteAdmin(w, r, db)
	})

	r.Delete("/admins/{id}/", func(w http.ResponseWriter, r *http.Request) {
		handleDeleteAdmin(w, r, db)
	})

	return r
}

func handleDeleteAdmin(w http.ResponseWriter, r *http.Request, db *sql.DB) {
	id := chi.URLParam(r, "id")
	num, err := strconv.ParseInt(id, 10, 64)
	if err != nil || num == 0 {
		writeJSON(w, http.StatusNotFound, map[string]any{"error": "Admin account not found."})
		return
	}

	result, err := db.ExecContext(r.Context(), "DELETE FROM admins WHERE id = ?", num)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to delete admin account."})
		return
	}
	deleted, _ := result.RowsAffected()
	if deleted == 0 {
		writeJSON(w, http.StatusNotFound, map[string]any{"error": "Admin account not found."})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"success": true, "deletedCount": deleted})
}

func superAuthRoutes(store *Store) http.Handler {
	db := store.DB()
	r := chi.NewRouter()

	r.Post("/register", func(w http.ResponseWriter, r *http.Request) {
		var payload struct {
			Username string `json:"username"`
			Email    string `json:"email"`
			Password string `json:"password"`
		}
		if err := decodePayload(r, &payload); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid JSON payload"})
			return
		}
		if strings.TrimSpace(payload.Username) == "" || strings.TrimSpace(payload.Email) == "" || payload.Password == "" {
			writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Username, email, and password are required"})
			return
		}
		if len(payload.Password) < 8 {
			writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Password must be at least 8 characters long"})
			return
		}

		var existingID int64
		err := db.QueryRowContext(r.Context(), "SELECT id FROM superadmins WHERE username = ? OR email = ?", payload.Username, strings.ToLower(payload.Email)).Scan(&existingID)
		if err == nil {
			writeJSON(w, http.StatusConflict, map[string]any{"error": "Super Admin username or email already exists."})
			return
		} else if err != sql.ErrNoRows {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Unable to register Super Admin account."})
			return
		}
		var count int
		if err := db.QueryRowContext(r.Context(), "SELECT COUNT(*) FROM superadmins").Scan(&count); err != nil || count >= 2 {
			writeJSON(w, http.StatusForbidden, map[string]any{"error": "Super Admin registration limit reached. Maximum of 2 Super Admin accounts allowed."})
			return
		}
		salt := randomHex(16)
		hash := hashPassword(payload.Password, salt)
		now := time.Now().UTC()
		result, err := db.ExecContext(r.Context(),
			"INSERT INTO superadmins (username, email, passwordHash, salt, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)",
			strings.TrimSpace(payload.Username), strings.ToLower(strings.TrimSpace(payload.Email)), hash, salt, now, now)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Unable to register Super Admin account."})
			return
		}
		id, _ := result.LastInsertId()
		admin := SuperAdmin{ID: id, Username: strings.TrimSpace(payload.Username), Email: strings.ToLower(strings.TrimSpace(payload.Email)), CreatedAt: now, UpdatedAt: now}
		writeJSON(w, http.StatusCreated, map[string]any{"success": true, "token": signJWT(strconv.FormatInt(admin.ID, 10), "superadmin"), "superAdmin": admin.public()})
	})

	r.Post("/login", func(w http.ResponseWriter, r *http.Request) {
		var payload struct {
			Username string `json:"username"`
			Password string `json:"password"`
		}
		if err := decodePayload(r, &payload); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid JSON payload"})
			return
		}
		superAdmin := SuperAdmin{}
		var loginHistoryRaw sql.NullString
		var updatedAtRaw sql.NullTime
		err := db.QueryRowContext(r.Context(),
			"SELECT id, username, email, passwordHash, salt, loginHistory, createdAt, updatedAt FROM superadmins WHERE username = ? OR email = ?",
			payload.Username, strings.ToLower(payload.Username)).Scan(
			&superAdmin.ID, &superAdmin.Username, &superAdmin.Email, &superAdmin.PasswordHash, &superAdmin.Salt, &loginHistoryRaw, &superAdmin.CreatedAt, &updatedAtRaw)
		if err != nil {
			writeJSON(w, http.StatusUnauthorized, map[string]any{"error": "Invalid Super Admin credentials."})
			return
		}
		if updatedAtRaw.Valid {
			superAdmin.UpdatedAt = updatedAtRaw.Time.UTC()
		}
		superAdmin.CreatedAt = superAdmin.CreatedAt.UTC()
		if !checkPassword(payload.Password, superAdmin.Salt, superAdmin.PasswordHash) {
			writeJSON(w, http.StatusUnauthorized, map[string]any{"error": "Invalid Super Admin credentials."})
			return
		}
		if loginHistoryRaw.Valid {
			superAdmin.LoginHistory = unmarshalLoginHistory(loginHistoryRaw.String)
		}
		superAdmin.LoginHistory = append(superAdmin.LoginHistory, LoginHistoryEntry{IP: r.RemoteAddr, UserAgent: r.UserAgent(), CreatedAt: time.Now().UTC()})
		if data, err := marshalLoginHistory(superAdmin.LoginHistory); err == nil {
			_, _ = db.ExecContext(r.Context(), "UPDATE superadmins SET loginHistory = ? WHERE id = ?", data, superAdmin.ID)
		}
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "token": signJWT(strconv.FormatInt(superAdmin.ID, 10), "superadmin"), "superAdmin": superAdmin.public()})
	})

	r.Post("/google", func(w http.ResponseWriter, r *http.Request) {
		var payload struct {
			Credential string `json:"credential"`
		}
		if err := decodePayload(r, &payload); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid JSON payload"})
			return
		}

		claims, err := verifyGoogleTokenFunc(r.Context(), payload.Credential)
		if err != nil {
			writeJSON(w, http.StatusUnauthorized, map[string]any{"error": "Google authentication failed: " + err.Error()})
			return
		}

		email := strings.ToLower(strings.TrimSpace(claims.Email))
		if email == "" {
			writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Verified Google email is required."})
			return
		}

		var superAdmin SuperAdmin
		var loginHistoryRaw sql.NullString
		var updatedAtRaw sql.NullTime
		err = db.QueryRowContext(r.Context(),
			"SELECT id, username, email, passwordHash, salt, loginHistory, createdAt, updatedAt FROM superadmins WHERE email = ?",
			email).Scan(
			&superAdmin.ID, &superAdmin.Username, &superAdmin.Email, &superAdmin.PasswordHash, &superAdmin.Salt, &loginHistoryRaw, &superAdmin.CreatedAt, &updatedAtRaw)

		if err == nil {
			// Existing Super Admin: Log in
			if updatedAtRaw.Valid {
				superAdmin.UpdatedAt = updatedAtRaw.Time.UTC()
			}
			superAdmin.CreatedAt = superAdmin.CreatedAt.UTC()

			if loginHistoryRaw.Valid {
				superAdmin.LoginHistory = unmarshalLoginHistory(loginHistoryRaw.String)
			}
			superAdmin.LoginHistory = append(superAdmin.LoginHistory, LoginHistoryEntry{IP: r.RemoteAddr, UserAgent: r.UserAgent(), CreatedAt: time.Now().UTC()})
			if data, err := marshalLoginHistory(superAdmin.LoginHistory); err == nil {
				_, _ = db.ExecContext(r.Context(), "UPDATE superadmins SET loginHistory = ? WHERE id = ?", data, superAdmin.ID)
			}

			token := signJWT(strconv.FormatInt(superAdmin.ID, 10), "superadmin")
			writeJSON(w, http.StatusOK, map[string]any{"success": true, "token": token, "superAdmin": superAdmin.public()})
			return
		} else if err != sql.ErrNoRows {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Database error while verifying Super Admin account."})
			return
		}

		// New Super Admin: Register
		var count int
		if err := db.QueryRowContext(r.Context(), "SELECT COUNT(*) FROM superadmins").Scan(&count); err != nil || count >= 2 {
			writeJSON(w, http.StatusForbidden, map[string]any{"error": "Super Admin registration limit reached. Maximum of 2 Super Admin accounts allowed."})
			return
		}

		username := strings.TrimSpace(claims.Name)
		if username == "" {
			parts := strings.Split(email, "@")
			username = parts[0]
		}
		var existingID int64
		if err := db.QueryRowContext(r.Context(), "SELECT id FROM superadmins WHERE username = ?", username).Scan(&existingID); err == nil {
			username = username + "_" + randomHex(2)
		}

		salt := randomHex(16)
		randomPwd := randomHex(32)
		hash := hashPassword(randomPwd, salt)
		now := time.Now().UTC()
		result, err := db.ExecContext(r.Context(),
			"INSERT INTO superadmins (username, email, passwordHash, salt, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)",
			username, email, hash, salt, now, now)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Unable to register Super Admin account."})
			return
		}
		id, _ := result.LastInsertId()
		superAdmin = SuperAdmin{ID: id, Username: username, Email: email, CreatedAt: now, UpdatedAt: now}
		writeJSON(w, http.StatusCreated, map[string]any{"success": true, "token": signJWT(strconv.FormatInt(superAdmin.ID, 10), "superadmin"), "superAdmin": superAdmin.public()})
	})

	r.Get("/superadmins", func(w http.ResponseWriter, r *http.Request) {
		rows, err := db.QueryContext(r.Context(), "SELECT id, username, email, loginHistory, createdAt, updatedAt FROM superadmins")
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to fetch Super Admin accounts."})
			return
		}
		defer rows.Close()
		var superAdmins []SuperAdmin
		for rows.Next() {
			var s SuperAdmin
			var loginHistoryRaw sql.NullString
			var createdAt time.Time
			var updatedAtRaw sql.NullTime
			if err := rows.Scan(&s.ID, &s.Username, &s.Email, &loginHistoryRaw, &createdAt, &updatedAtRaw); err != nil {
				continue
			}
			s.CreatedAt = createdAt.UTC()
			if updatedAtRaw.Valid {
				s.UpdatedAt = updatedAtRaw.Time.UTC()
			}
			if loginHistoryRaw.Valid {
				s.LoginHistory = unmarshalLoginHistory(loginHistoryRaw.String)
			}
			superAdmins = append(superAdmins, s)
		}
		if err := rows.Err(); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to fetch Super Admin accounts."})
			return
		}
		public := make([]map[string]any, 0, len(superAdmins))
		for _, admin := range superAdmins {
			public = append(public, admin.public())
		}
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "count": len(public), "limit": 2, "limitReached": len(public) >= 2, "superAdmins": public})
	})

	return r
}

func signJWT(id string, role string) string {
	claims := jwt.MapClaims{"id": id, "role": role, "exp": time.Now().Add(24 * time.Hour).Unix()}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString([]byte(mustEnv("JWT_SECRET")))
	if err != nil {
		return ""
	}
	return signed
}

func hashPassword(password, salt string) string {
	hash := sha512.New()
	_, _ = hash.Write([]byte(password))
	_, _ = hash.Write([]byte(salt))
	return hex.EncodeToString(hash.Sum(nil))
}

func checkPassword(candidate, salt, stored string) bool {
	return hashPassword(candidate, salt) == stored
}

func randomHex(n int) string {
	buf := make([]byte, n)
	_, _ = rand.Read(buf)
	return hex.EncodeToString(buf)
}
