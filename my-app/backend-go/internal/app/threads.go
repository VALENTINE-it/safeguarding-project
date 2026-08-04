package app

import (
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

func threadsRoutes(db *mongo.Database) http.Handler {
	r := chi.NewRouter()

	r.Get("/{threadToken}", func(w http.ResponseWriter, r *http.Request) {
		threadToken := chi.URLParam(r, "threadToken")
		if strings.TrimSpace(threadToken) == "" {
			writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid thread token format"})
			return
		}
		var thread Message
		if err := db.Collection("messages").FindOne(r.Context(), bson.M{"threadToken": threadToken}).Decode(&thread); err != nil {
			writeJSON(w, http.StatusNotFound, map[string]any{"error": "Thread not found. Check your token."})
			return
		}
		if !thread.IsRead {
			_, _ = db.Collection("messages").UpdateOne(r.Context(), bson.M{"_id": thread.ID}, bson.M{"$set": bson.M{"isRead": true, "readAt": time.Now().UTC()}})
		}
		var replies []Reply
		cursor, err := db.Collection("replies").Find(r.Context(), bson.M{"threadToken": threadToken})
		if err == nil {
			defer cursor.Close(r.Context())
			_ = cursor.All(r.Context(), &replies)
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
		var thread Message
		if err := db.Collection("messages").FindOne(r.Context(), bson.M{"threadToken": threadToken}).Decode(&thread); err != nil {
			writeJSON(w, http.StatusNotFound, map[string]any{"error": "Thread not found. Check your token."})
			return
		}
		if thread.IsDeleted {
			writeJSON(w, http.StatusGone, map[string]any{"error": "This thread has been deleted."})
			return
		}
		reply := Reply{ThreadToken: threadToken, Topic: strings.TrimSpace(payload.Topic), Message: strings.TrimSpace(payload.Message), CreatedAt: time.Now().UTC()}
		_, err := db.Collection("replies").InsertOne(r.Context(), reply)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to send follow-up. Please try again."})
			return
		}
		writeJSON(w, http.StatusCreated, map[string]any{"success": true, "message": "Your follow-up has been sent securely.", "reply": map[string]any{"topic": reply.Topic, "createdAt": reply.CreatedAt}})
	})

	return r
}
