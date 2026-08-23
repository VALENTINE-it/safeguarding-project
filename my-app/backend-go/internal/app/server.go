package app

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

const defaultPort = "5000"

// Server wraps the HTTP server and router for the Go backend.
type Server struct {
	http.Server
	Router *chi.Mux
	Store  *Store
}

// NewServer wires routes and initializes the API server.
func NewServer() (*Server, error) {
	port := os.Getenv("PORT")
	if port == "" {
		port = defaultPort
	}

	store, err := OpenStore(os.Getenv("DB_PATH"))
	if err != nil {
		log.Printf("database connection unavailable: %v", err)
	}

	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(30 * time.Second))
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Access-Control-Allow-Origin", "*")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Accept, Authorization, Content-Type, X-CSRF-Token")
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}
			next.ServeHTTP(w, r)
		})
	})

	r.Get("/", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]any{
			"message": "Safeguarding API is running",
		})
	})

	r.Get("/api/health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]any{
			"status":    "ok",
			"timestamp": time.Now().UTC().Format(time.RFC3339Nano),
		})
	})

r.Route("/api", func(r chi.Router) {
		r.Mount("/auth", authRoutes(store))
		r.Mount("/super-auth", superAuthRoutes(store))
		r.Mount("/messages", messagesRoutes(store))
		r.Mount("/threads", threadsRoutes(store))
		r.Mount("/staff", staffRoutes(store))
	})

	r.NotFound(func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusNotFound, map[string]any{"error": "Route not found"})
	})

	srv := &Server{
		Server: http.Server{
			Addr:              ":" + port,
			Handler:           r,
			ReadHeaderTimeout: 5 * time.Second,
			WriteTimeout:      15 * time.Second,
			IdleTimeout:       30 * time.Second,
		},
		Router: r,
		Store:  store,
	}

	return srv, nil
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func decodePayload(r *http.Request, dst any) error {
	defer r.Body.Close()
	return json.NewDecoder(r.Body).Decode(dst)
}

func parseTimeRange(date string) (time.Time, time.Time, error) {
	start, err := time.Parse("2006-01-02", date)
	if err != nil {
		return time.Time{}, time.Time{}, err
	}
	end := start.Add(24 * time.Hour)
	return start.UTC(), end.UTC(), nil
}

func mustEnv(key string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return "safeguarding_secret_key_2026"
}

func ensureDB(store *Store) bool {
	return store != nil && store.DB() != nil
}

func requireDB(store *Store, w http.ResponseWriter) bool {
	if store == nil || store.DB() == nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{"error": "Database unavailable"})
		return false
	}
	return true
}
