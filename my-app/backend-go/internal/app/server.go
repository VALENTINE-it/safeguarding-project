package app

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const defaultPort = "5000"

// Server wraps the HTTP server and router for the Go backend.
type Server struct {
	http.Server
	Router *chi.Mux
	DB     *mongo.Database
}

// NewServer wires routes and initializes the API server.
func NewServer() (*Server, error) {
	port := os.Getenv("PORT")
	if port == "" {
		port = defaultPort
	}

	db, err := connectDB()
	if err != nil {
		log.Printf("mongo connection unavailable: %v", err)
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

	r.Get("/api/health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]any{
			"status":    "ok",
			"timestamp": time.Now().UTC().Format(time.RFC3339Nano),
		})
	})

	r.Route("/api", func(r chi.Router) {
		r.Mount("/auth", authRoutes(db))
		r.Mount("/super-auth", superAuthRoutes(db))
		r.Mount("/messages", messagesRoutes(db))
		r.Mount("/threads", threadsRoutes(db))
		r.Mount("/staff", staffRoutes(db))
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
		DB:     db,
	}

	return srv, nil
}

func connectDB() (*mongo.Database, error) {
	uri := os.Getenv("MONGO_URI")
	if uri == "" {
		uri = "mongodb://localhost:27017/safeguarding"
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
	if err != nil {
		return nil, err
	}

	if err := client.Ping(ctx, nil); err != nil {
		return nil, err
	}

	log.Printf("connected to MongoDB at %s", strings.TrimPrefix(uri, "mongodb://"))
	return client.Database("safeguarding"), nil
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

func ensureDB(db *mongo.Database) bool {
	return db != nil
}

func requireDB(db *mongo.Database, w http.ResponseWriter) bool {
	if db == nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{"error": "Database unavailable"})
		return false
	}
	return true
}
