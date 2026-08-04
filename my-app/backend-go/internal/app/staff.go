package app

import (
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

func staffRoutes(db *mongo.Database) http.Handler {
	r := chi.NewRouter()

	r.Get("/", func(w http.ResponseWriter, r *http.Request) {
		var staff []Staff
		cursor, err := db.Collection("staff").Find(r.Context(), bson.M{})
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to load staff list."})
			return
		}
		defer cursor.Close(r.Context())
		if err := cursor.All(r.Context(), &staff); err != nil {
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
		member := Staff{Name: name, Role: strings.TrimSpace(payload.Role)}
		result, err := db.Collection("staff").InsertOne(r.Context(), member)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to add staff member."})
			return
		}
		member.ID = result.InsertedID.(primitive.ObjectID)
		writeJSON(w, http.StatusCreated, map[string]any{"success": true, "staff": member.public()})
	})

	r.Delete("/{id}", func(w http.ResponseWriter, r *http.Request) {
		id := chi.URLParam(r, "id")
		objID, err := primitive.ObjectIDFromHex(id)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid staff id"})
			return
		}
		result, err := db.Collection("staff").DeleteOne(r.Context(), bson.M{"_id": objID})
		if err != nil || result.DeletedCount == 0 {
			writeJSON(w, http.StatusNotFound, map[string]any{"error": "Staff member not found."})
			return
		}
		_, _ = db.Collection("admins").UpdateMany(r.Context(), bson.M{"staffId": id}, bson.M{"$set": bson.M{"staffId": nil}})
		writeJSON(w, http.StatusOK, map[string]any{"success": true})
	})

	return r
}
