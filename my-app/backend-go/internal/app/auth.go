package app

import (
	"crypto/rand"
	"crypto/sha512"
	"encoding/hex"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/golang-jwt/jwt/v5"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

func authRoutes(db *mongo.Database) http.Handler {
	r := chi.NewRouter()

	r.Post("/register", func(w http.ResponseWriter, r *http.Request) {
		var payload struct {
			Username string `json:"username"`
			Email    string `json:"email"`
			Password string `json:"password"`
			StaffID  string `json:"staffId"`
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

		var existing Admin
		err := db.Collection("admins").FindOne(r.Context(), bson.M{"$or": []bson.M{{"username": username}, {"email": email}}}).Decode(&existing)
		if err == nil {
			writeJSON(w, http.StatusConflict, map[string]any{"error": "Username or email already exists."})
			return
		} else if err != mongo.ErrNoDocuments {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Unable to register admin account."})
			return
		}

		count, err := db.Collection("admins").CountDocuments(r.Context(), bson.M{})
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Unable to register admin account."})
			return
		}
		if count >= 3 {
			writeJSON(w, http.StatusForbidden, map[string]any{"error": "Admin registration limit reached. Maximum of 3 administrator accounts allowed."})
			return
		}

		var staffID *string
		if payload.StaffID != "" {
			staffObjectID, err := primitive.ObjectIDFromHex(payload.StaffID)
			if err != nil {
				writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Selected staff member could not be found."})
				return
			}
			var staff Staff
			if err := db.Collection("staff").FindOne(r.Context(), bson.M{"_id": staffObjectID}).Decode(&staff); err != nil {
				writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Selected staff member could not be found."})
				return
			}
			var linked Admin
			err = db.Collection("admins").FindOne(r.Context(), bson.M{"staffId": payload.StaffID}).Decode(&linked)
			if err == nil {
				writeJSON(w, http.StatusConflict, map[string]any{"error": "That staff member is already linked to another admin account."})
				return
			} else if err != mongo.ErrNoDocuments {
				writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Unable to register admin account."})
				return
			}
			staffID = &payload.StaffID
		}

		salt := randomHex(16)
		hash := hashPassword(password, salt)
		admin := Admin{
			Username:     username,
			Email:        email,
			PasswordHash: hash,
			Salt:         salt,
			StaffID:      staffID,
		}
		result, err := db.Collection("admins").InsertOne(r.Context(), admin)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Unable to register admin account."})
			return
		}
		admin.ID = objectIDFromInsert(result)
		token := signJWT(admin.ID.Hex(), "")
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
		err := db.Collection("admins").FindOne(r.Context(), bson.M{"$or": []bson.M{{"username": username}, {"email": strings.ToLower(username)}}}).Decode(&admin)
		if err != nil {
			writeJSON(w, http.StatusUnauthorized, map[string]any{"error": "Invalid username/email or password."})
			return
		}
		if !checkPassword(password, admin.Salt, admin.PasswordHash) {
			writeJSON(w, http.StatusUnauthorized, map[string]any{"error": "Invalid username/email or password."})
			return
		}

		admin.LoginHistory = append(admin.LoginHistory, LoginHistoryEntry{IP: r.RemoteAddr, UserAgent: r.UserAgent(), CreatedAt: time.Now().UTC()})
		_, _ = db.Collection("admins").UpdateOne(r.Context(), bson.M{"_id": admin.ID}, bson.M{"$set": bson.M{"loginHistory": admin.LoginHistory}})

		token := signJWT(admin.ID.Hex(), "")
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "token": token, "admin": admin.public()})
	})

	r.Get("/admins", func(w http.ResponseWriter, r *http.Request) {
		var admins []Admin
		cursor, err := db.Collection("admins").Find(r.Context(), bson.M{})
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to fetch admin accounts."})
			return
		}
		defer cursor.Close(r.Context())
		if err := cursor.All(r.Context(), &admins); err != nil {
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
			objectIDs := make([]primitive.ObjectID, 0, len(staffIds))
			for _, id := range staffIds {
				if objID, err := primitive.ObjectIDFromHex(id); err == nil {
					objectIDs = append(objectIDs, objID)
				}
			}
			if len(objectIDs) > 0 {
				staffCursor, err := db.Collection("staff").Find(r.Context(), bson.M{"_id": bson.M{"$in": objectIDs}})
				if err == nil {
					var staffRecords []Staff
					if err := staffCursor.All(r.Context(), &staffRecords); err == nil {
						for _, s := range staffRecords {
							staffByID[s.ID.Hex()] = s
						}
					}
					staffCursor.Close(r.Context())
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

	return r
}

func superAuthRoutes(db *mongo.Database) http.Handler {
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

		var existing SuperAdmin
		err := db.Collection("superadmins").FindOne(r.Context(), bson.M{"$or": []bson.M{{"username": payload.Username}, {"email": strings.ToLower(payload.Email)}}}).Decode(&existing)
		if err == nil {
			writeJSON(w, http.StatusConflict, map[string]any{"error": "Super Admin username or email already exists."})
			return
		} else if err != mongo.ErrNoDocuments {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Unable to register Super Admin account."})
			return
		}
		count, err := db.Collection("superadmins").CountDocuments(r.Context(), bson.M{})
		if err != nil || count >= 2 {
			writeJSON(w, http.StatusForbidden, map[string]any{"error": "Super Admin registration limit reached. Maximum of 2 Super Admin accounts allowed."})
			return
		}
		salt := randomHex(16)
		hash := hashPassword(payload.Password, salt)
		admin := SuperAdmin{Username: strings.TrimSpace(payload.Username), Email: strings.ToLower(strings.TrimSpace(payload.Email)), PasswordHash: hash, Salt: salt}
		result, err := db.Collection("superadmins").InsertOne(r.Context(), admin)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Unable to register Super Admin account."})
			return
		}
		admin.ID = objectIDFromInsert(result)
		writeJSON(w, http.StatusCreated, map[string]any{"success": true, "token": signJWT(admin.ID.Hex(), "superadmin"), "superAdmin": admin.public()})
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
		err := db.Collection("superadmins").FindOne(r.Context(), bson.M{"$or": []bson.M{{"username": payload.Username}, {"email": strings.ToLower(payload.Username)}}}).Decode(&superAdmin)
		if err != nil {
			writeJSON(w, http.StatusUnauthorized, map[string]any{"error": "Invalid Super Admin credentials."})
			return
		}
		if !checkPassword(payload.Password, superAdmin.Salt, superAdmin.PasswordHash) {
			writeJSON(w, http.StatusUnauthorized, map[string]any{"error": "Invalid Super Admin credentials."})
			return
		}
		superAdmin.LoginHistory = append(superAdmin.LoginHistory, LoginHistoryEntry{IP: r.RemoteAddr, UserAgent: r.UserAgent(), CreatedAt: time.Now().UTC()})
		_, _ = db.Collection("superadmins").UpdateOne(r.Context(), bson.M{"_id": superAdmin.ID}, bson.M{"$set": bson.M{"loginHistory": superAdmin.LoginHistory}})
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "token": signJWT(superAdmin.ID.Hex(), "superadmin"), "superAdmin": superAdmin.public()})
	})

	r.Get("/superadmins", func(w http.ResponseWriter, r *http.Request) {
		var superAdmins []SuperAdmin
		cursor, err := db.Collection("superadmins").Find(r.Context(), bson.M{})
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to fetch Super Admin accounts."})
			return
		}
		defer cursor.Close(r.Context())
		if err := cursor.All(r.Context(), &superAdmins); err != nil {
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

func objectIDFromInsert(result *mongo.InsertOneResult) primitive.ObjectID {
	if id, ok := result.InsertedID.(primitive.ObjectID); ok {
		return id
	}
	if id, ok := result.InsertedID.(string); ok {
		if oid, err := primitive.ObjectIDFromHex(id); err == nil {
			return oid
		}
	}
	return primitive.NewObjectID()
}
