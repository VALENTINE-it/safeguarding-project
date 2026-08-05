package app

import (
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

func messagesRoutes(db *mongo.Database) http.Handler {
	r := chi.NewRouter()

	r.Get("/", func(w http.ResponseWriter, r *http.Request) {
		filter := r.URL.Query().Get("filter")
		date := r.URL.Query().Get("date")
		threadToken := r.URL.Query().Get("threadToken")
		excludedStaffID := r.URL.Query().Get("staffId")

		query := bson.M{"isDeleted": false}
		if threadToken != "" {
			query["threadToken"] = threadToken
		}
		if date != "" {
			start, end, err := parseTimeRange(date)
			if err == nil {
				query["createdAt"] = bson.M{"$gte": start, "$lt": end}
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
				query["createdAt"] = bson.M{"$gte": start}
			}
		}
		if excludedStaffID != "" {
			query["$or"] = []bson.M{{"reportedStaff": nil}, {"reportedStaff": bson.M{"$ne": excludedStaffID}}}
		}

		cursor, err := db.Collection("messages").Find(r.Context(), query)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to load messages."})
			return
		}
		defer cursor.Close(r.Context())
		var messages []Message
		if err := cursor.All(r.Context(), &messages); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to load messages."})
			return
		}
		publicMessages := make([]map[string]any, 0, len(messages))
		for _, msg := range messages {
			payload := msg.public()
			publicMessages = append(publicMessages, payload)
		}
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "messages": publicMessages})
	})

	r.Get("/unread", func(w http.ResponseWriter, r *http.Request) {
		query := bson.M{"isRead": false, "isDeleted": false}
		if excludedStaffID := r.URL.Query().Get("staffId"); excludedStaffID != "" {
			query["$or"] = []bson.M{{"reportedStaff": nil}, {"reportedStaff": bson.M{"$ne": excludedStaffID}}}
		}
		cursor, err := db.Collection("messages").Find(r.Context(), query)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to load unread messages."})
			return
		}
		defer cursor.Close(r.Context())
		var messages []Message
		if err := cursor.All(r.Context(), &messages); err != nil {
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
		objID, err := primitive.ObjectIDFromHex(id)
		if err != nil {
			writeJSON(w, http.StatusNotFound, map[string]any{"error": "Message not found."})
			return
		}
		var msg Message
		if err := db.Collection("messages").FindOne(r.Context(), bson.M{"_id": objID, "isDeleted": false}).Decode(&msg); err != nil {
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
		objID, err := primitive.ObjectIDFromHex(id)
		if err != nil {
			writeJSON(w, http.StatusNotFound, map[string]any{"error": "Message not found."})
			return
		}
		var current Message
		if err := db.Collection("messages").FindOne(r.Context(), bson.M{"_id": objID}).Decode(&current); err != nil {
			writeJSON(w, http.StatusNotFound, map[string]any{"error": "Message not found."})
			return
		}
		if excludedStaffID := r.URL.Query().Get("staffId"); excludedStaffID != "" && current.ReportedStaff != nil && *current.ReportedStaff == excludedStaffID {
			writeJSON(w, http.StatusNotFound, map[string]any{"error": "Message not found."})
			return
		}
		if current.IsDeleted {
			writeJSON(w, http.StatusNotFound, map[string]any{"error": "Message not found."})
			return
		}
		update := bson.M{"$set": bson.M{"isRead": true, "readAt": time.Now().UTC()}}
		var updated Message
		if err := db.Collection("messages").FindOneAndUpdate(r.Context(), bson.M{"_id": objID}, update, nil).Decode(&updated); err != nil {
			writeJSON(w, http.StatusNotFound, map[string]any{"error": "Message not found."})
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "message": updated.public()})
	})

	r.Patch("/mark-all-read", func(w http.ResponseWriter, r *http.Request) {
		query := bson.M{"isRead": false, "isDeleted": false}
		if excludedStaffID := r.URL.Query().Get("staffId"); excludedStaffID != "" {
			query["$or"] = []bson.M{{"reportedStaff": nil}, {"reportedStaff": bson.M{"$ne": excludedStaffID}}}
		}
		result, err := db.Collection("messages").UpdateMany(r.Context(), query, bson.M{"$set": bson.M{"isRead": true, "readAt": time.Now().UTC()}})
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to mark messages as read."})
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "modifiedCount": result.ModifiedCount})
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
		msg := Message{Topic: topic, Message: message, ThreadToken: primitive.NewObjectID().Hex(), IsRead: false, IsDeleted: false, CreatedAt: time.Now().UTC()}
		if payload.ReportedStaff != "" {
			msg.ReportedStaff = &payload.ReportedStaff
		}
		result, err := db.Collection("messages").InsertOne(r.Context(), msg)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to send message."})
			return
		}
		msg.ID = result.InsertedID.(primitive.ObjectID)
		writeJSON(w, http.StatusCreated, map[string]any{"success": true, "threadToken": msg.ThreadToken})
	})

	return r
}
