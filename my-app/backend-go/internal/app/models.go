package app

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type LoginHistoryEntry struct {
	IP        string    `bson:"ip" json:"ip"`
	UserAgent string    `bson:"userAgent" json:"userAgent"`
	CreatedAt time.Time `bson:"createdAt,omitempty" json:"createdAt,omitempty"`
}

type Admin struct {
	ID           primitive.ObjectID  `bson:"_id,omitempty" json:"id,omitempty"`
	Username     string              `bson:"username" json:"username"`
	Email        string              `bson:"email" json:"email"`
	PasswordHash string              `bson:"passwordHash" json:"-"`
	Salt         string              `bson:"salt" json:"-"`
	StaffID      *string             `bson:"staffId,omitempty" json:"staffId,omitempty"`
	LoginHistory []LoginHistoryEntry `bson:"loginHistory,omitempty" json:"loginHistory,omitempty"`
	CreatedAt    time.Time           `bson:"createdAt,omitempty" json:"createdAt,omitempty"`
	UpdatedAt    time.Time           `bson:"updatedAt,omitempty" json:"updatedAt,omitempty"`
}

func (a Admin) public() map[string]any {
	return map[string]any{
		"id":           a.ID.Hex(),
		"username":     a.Username,
		"email":        a.Email,
		"staffId":      a.StaffID,
		"loginHistory": a.LoginHistory,
		"createdAt":    a.CreatedAt,
		"updatedAt":    a.UpdatedAt,
	}
}

type SuperAdmin struct {
	ID           primitive.ObjectID  `bson:"_id,omitempty" json:"id,omitempty"`
	Username     string              `bson:"username" json:"username"`
	Email        string              `bson:"email" json:"email"`
	PasswordHash string              `bson:"passwordHash" json:"-"`
	Salt         string              `bson:"salt" json:"-"`
	LoginHistory []LoginHistoryEntry `bson:"loginHistory,omitempty" json:"loginHistory,omitempty"`
	CreatedAt    time.Time           `bson:"createdAt,omitempty" json:"createdAt,omitempty"`
	UpdatedAt    time.Time           `bson:"updatedAt,omitempty" json:"updatedAt,omitempty"`
}

func (s SuperAdmin) public() map[string]any {
	return map[string]any{
		"id":           s.ID.Hex(),
		"username":     s.Username,
		"email":        s.Email,
		"loginHistory": s.LoginHistory,
		"createdAt":    s.CreatedAt,
		"updatedAt":    s.UpdatedAt,
	}
}

type Staff struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	Name      string             `bson:"name" json:"name"`
	Role      string             `bson:"role" json:"role"`
	CreatedAt time.Time          `bson:"createdAt,omitempty" json:"createdAt,omitempty"`
	UpdatedAt time.Time          `bson:"updatedAt,omitempty" json:"updatedAt,omitempty"`
}

func (s Staff) public() map[string]any {
	return map[string]any{
		"id":        s.ID.Hex(),
		"name":      s.Name,
		"role":      s.Role,
		"createdAt": s.CreatedAt,
		"updatedAt": s.UpdatedAt,
	}
}

type Message struct {
	ID            primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	Topic         string             `bson:"topic" json:"topic"`
	Message       string             `bson:"message" json:"message"`
	ReportedStaff *string            `bson:"reportedStaff,omitempty" json:"reportedStaff,omitempty"`
	ThreadToken   string             `bson:"threadToken" json:"threadToken"`
	IsRead        bool               `bson:"isRead" json:"isRead"`
	IsDeleted     bool               `bson:"isDeleted" json:"isDeleted"`
	ReadAt        *time.Time         `bson:"readAt,omitempty" json:"readAt,omitempty"`
	CreatedAt     time.Time          `bson:"createdAt,omitempty" json:"createdAt,omitempty"`
}

func (m Message) public() map[string]any {
	return map[string]any{
		"id":            m.ID.Hex(),
		"topic":         m.Topic,
		"message":       m.Message,
		"reportedStaff": m.ReportedStaff,
		"threadToken":   m.ThreadToken,
		"isRead":        m.IsRead,
		"isDeleted":     m.IsDeleted,
		"readAt":        m.ReadAt,
		"createdAt":     m.CreatedAt,
	}
}

type Reply struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	ThreadToken string             `bson:"threadToken" json:"threadToken"`
	Topic       string             `bson:"topic" json:"topic"`
	Message     string             `bson:"message" json:"message"`
	IsDeleted   bool               `bson:"isDeleted" json:"isDeleted"`
	CreatedAt   time.Time          `bson:"createdAt,omitempty" json:"createdAt,omitempty"`
	UpdatedAt   time.Time          `bson:"updatedAt,omitempty" json:"updatedAt,omitempty"`
}
