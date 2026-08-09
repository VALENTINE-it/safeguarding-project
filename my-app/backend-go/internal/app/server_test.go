package app

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

func setupTestServer(t *testing.T) *Server {
	t.Helper()
	dir, err := os.MkdirTemp("", "safeguarding-test-*")
	if err != nil {
		t.Fatalf("MkdirTemp() error = %v", err)
	}
	t.Cleanup(func() { os.RemoveAll(dir) })

	dbPath := filepath.Join(dir, "test.db")
	t.Setenv("DB_PATH", dbPath)

	srv, err := NewServer()
	if err != nil {
		t.Fatalf("NewServer() error = %v", err)
	}
	return srv
}

func TestRootAndHealthEndpoints(t *testing.T) {
	srv := setupTestServer(t)

	// Test GET /
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rr := httptest.NewRecorder()
	srv.Router.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("GET / expected status 200, got %d", rr.Code)
	}

	// Test GET /api/health
	req = httptest.NewRequest(http.MethodGet, "/api/health", nil)
	rr = httptest.NewRecorder()
	srv.Router.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("GET /api/health expected status 200, got %d", rr.Code)
	}
}

func TestStaffRoutes(t *testing.T) {
	srv := setupTestServer(t)

	// 1. Create Staff
	body, _ := json.Marshal(map[string]string{
		"name": "Jane Doe",
		"role": "Counselor",
	})
	req := httptest.NewRequest(http.MethodPost, "/api/staff", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	srv.Router.ServeHTTP(rr, req)

	if rr.Code != http.StatusCreated {
		t.Fatalf("POST /api/staff expected status 201, got %d (%s)", rr.Code, rr.Body.String())
	}

	var createResp struct {
		Success bool `json:"success"`
		Staff   struct {
			ID   string `json:"id"`
			Name string `json:"name"`
			Role string `json:"role"`
		} `json:"staff"`
	}
	if err := json.Unmarshal(rr.Body.Bytes(), &createResp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if createResp.Staff.Name != "Jane Doe" || createResp.Staff.ID == "" {
		t.Fatalf("unexpected staff created: %+v", createResp)
	}

	// 2. List Staff
	req = httptest.NewRequest(http.MethodGet, "/api/staff", nil)
	rr = httptest.NewRecorder()
	srv.Router.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("GET /api/staff expected status 200, got %d", rr.Code)
	}

	// 3. Delete Staff
	req = httptest.NewRequest(http.MethodDelete, "/api/staff/"+createResp.Staff.ID, nil)
	rr = httptest.NewRecorder()
	srv.Router.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("DELETE /api/staff/:id expected status 200, got %d (%s)", rr.Code, rr.Body.String())
	}
}

func TestStaffValidation(t *testing.T) {
	srv := setupTestServer(t)

	tests := []struct {
		name       string
		payload    map[string]string
		expectCode int
	}{
		{
			name:       "Empty Name",
			payload:    map[string]string{"name": "", "role": "Teacher"},
			expectCode: http.StatusBadRequest,
		},
		{
			name:       "Valid Staff Without Role",
			payload:    map[string]string{"name": "John Smith"},
			expectCode: http.StatusCreated,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			body, _ := json.Marshal(tc.payload)
			req := httptest.NewRequest(http.MethodPost, "/api/staff", bytes.NewReader(body))
			req.Header.Set("Content-Type", "application/json")
			rr := httptest.NewRecorder()
			srv.Router.ServeHTTP(rr, req)

			if rr.Code != tc.expectCode {
				t.Errorf("%s: expected status %d, got %d (%s)", tc.name, tc.expectCode, rr.Code, rr.Body.String())
			}
		})
	}
}

func TestMessagesAndThreads(t *testing.T) {
	srv := setupTestServer(t)

	// 1. Post Message
	msgPayload, _ := json.Marshal(map[string]string{
		"topic":   "Safety Concern",
		"message": "This is an urgent test message.",
	})
	req := httptest.NewRequest(http.MethodPost, "/api/messages", bytes.NewReader(msgPayload))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	srv.Router.ServeHTTP(rr, req)

	if rr.Code != http.StatusCreated {
		t.Fatalf("POST /api/messages expected status 201, got %d (%s)", rr.Code, rr.Body.String())
	}

	var msgResp struct {
		Success     bool   `json:"success"`
		ThreadToken string `json:"threadToken"`
	}
	_ = json.Unmarshal(rr.Body.Bytes(), &msgResp)
	if msgResp.ThreadToken == "" {
		t.Fatalf("expected threadToken, got empty response")
	}

	// 2. Get Messages
	req = httptest.NewRequest(http.MethodGet, "/api/messages", nil)
	rr = httptest.NewRecorder()
	srv.Router.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("GET /api/messages expected status 200, got %d", rr.Code)
	}

	// 3. Get Thread
	req = httptest.NewRequest(http.MethodGet, "/api/threads/"+msgResp.ThreadToken, nil)
	rr = httptest.NewRecorder()
	srv.Router.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("GET /api/threads/:token expected status 200, got %d (%s)", rr.Code, rr.Body.String())
	}

	// 4. Post Reply to Thread
	replyPayload, _ := json.Marshal(map[string]string{
		"topic":   "Follow-up",
		"message": "Thank you for looking into this.",
	})
	req = httptest.NewRequest(http.MethodPost, "/api/threads/"+msgResp.ThreadToken+"/reply", bytes.NewReader(replyPayload))
	req.Header.Set("Content-Type", "application/json")
	rr = httptest.NewRecorder()
	srv.Router.ServeHTTP(rr, req)

	if rr.Code != http.StatusCreated {
		t.Fatalf("POST /api/threads/:token/reply expected status 201, got %d (%s)", rr.Code, rr.Body.String())
	}
}

func TestAuthRoutes(t *testing.T) {
	srv := setupTestServer(t)

	// 1. Register Admin
	regPayload, _ := json.Marshal(map[string]string{
		"username": "admin1",
		"email":    "admin1@example.com",
		"password": "password123",
	})
	req := httptest.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewReader(regPayload))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	srv.Router.ServeHTTP(rr, req)

	if rr.Code != http.StatusCreated {
		t.Fatalf("POST /api/auth/register expected status 201, got %d (%s)", rr.Code, rr.Body.String())
	}

	// 2. Login Admin
	loginPayload, _ := json.Marshal(map[string]string{
		"username": "admin1",
		"password": "password123",
	})
	req = httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewReader(loginPayload))
	req.Header.Set("Content-Type", "application/json")
	rr = httptest.NewRecorder()
	srv.Router.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("POST /api/auth/login expected status 200, got %d (%s)", rr.Code, rr.Body.String())
	}

	// 3. List Admins
	req = httptest.NewRequest(http.MethodGet, "/api/auth/admins", nil)
	rr = httptest.NewRecorder()
	srv.Router.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("GET /api/auth/admins expected status 200, got %d (%s)", rr.Code, rr.Body.String())
	}
}

func TestAuthFailures(t *testing.T) {
	srv := setupTestServer(t)

	// 1. Invalid login on empty database
	loginPayload, _ := json.Marshal(map[string]string{
		"username": "nonexistent",
		"password": "wrongpassword",
	})
	req := httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewReader(loginPayload))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	srv.Router.ServeHTTP(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 Unauthorized for invalid login, got %d", rr.Code)
	}

	// 2. Duplicate registration
	regPayload, _ := json.Marshal(map[string]string{
		"username": "uniqueadmin",
		"email":    "unique@example.com",
		"password": "password123",
	})
	req = httptest.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewReader(regPayload))
	req.Header.Set("Content-Type", "application/json")
	rr = httptest.NewRecorder()
	srv.Router.ServeHTTP(rr, req)

	if rr.Code != http.StatusCreated {
		t.Fatalf("first registration expected 201 Created, got %d", rr.Code)
	}

	// Duplicate request
	req = httptest.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewReader(regPayload))
	req.Header.Set("Content-Type", "application/json")
	rr = httptest.NewRecorder()
	srv.Router.ServeHTTP(rr, req)

	if rr.Code != http.StatusConflict && rr.Code != http.StatusBadRequest {
		t.Errorf("duplicate registration expected status 409 or 400, got %d", rr.Code)
	}
}

func TestThreadTokenErrors(t *testing.T) {
	srv := setupTestServer(t)

	// Fetch non-existent thread
	req := httptest.NewRequest(http.MethodGet, "/api/threads/nonexistenttoken1234567890", nil)
	rr := httptest.NewRecorder()
	srv.Router.ServeHTTP(rr, req)

	if rr.Code != http.StatusNotFound {
		t.Errorf("expected 404 Not Found for missing thread, got %d", rr.Code)
	}

	// Empty reply payload
	replyPayload, _ := json.Marshal(map[string]string{"message": ""})
	req = httptest.NewRequest(http.MethodPost, "/api/threads/nonexistenttoken1234567890/reply", bytes.NewReader(replyPayload))
	req.Header.Set("Content-Type", "application/json")
	rr = httptest.NewRecorder()
	srv.Router.ServeHTTP(rr, req)

	if rr.Code != http.StatusBadRequest && rr.Code != http.StatusNotFound {
		t.Errorf("expected 400 Bad Request or 404 for invalid thread reply, got %d", rr.Code)
	}
}
