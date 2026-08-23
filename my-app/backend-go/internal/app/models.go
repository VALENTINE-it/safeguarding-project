package app

import (
	"strconv"
	"time"
)

type LoginHistoryEntry struct {
	IP        string    `json:"ip"`
	UserAgent string    `json:"userAgent"`
	CreatedAt time.Time `json:"createdAt,omitempty"`
}

type Admin struct {
	ID           int64               `json:"id,omitempty"`
	Username     string              `json:"username"`
	Email        string              `json:"email"`
	PasswordHash string              `json:"-"`
	Salt         string              `json:"-"`
	StaffID      *string             `json:"staffId,omitempty"`
	LoginHistory []LoginHistoryEntry `json:"loginHistory,omitempty"`
	CreatedAt    time.Time           `json:"createdAt,omitempty"`
	UpdatedAt    time.Time           `json:"updatedAt,omitempty"`
}

func (a Admin) public() map[string]any {
	id := ""
	if a.ID != 0 {
		id = strconv.FormatInt(a.ID, 10)
	}
	return map[string]any{
		"id":           id,
		"username":     a.Username,
		"email":        a.Email,
		"staffId":      a.StaffID,
		"loginHistory": a.LoginHistory,
		"createdAt":    a.CreatedAt,
		"updatedAt":    a.UpdatedAt,
	}
}

type SuperAdmin struct {
	ID           int64               `json:"id,omitempty"`
	Username     string              `json:"username"`
	Email        string              `json:"email"`
	PasswordHash string              `json:"-"`
	Salt         string              `json:"-"`
	LoginHistory []LoginHistoryEntry `json:"loginHistory,omitempty"`
	CreatedAt    time.Time           `json:"createdAt,omitempty"`
	UpdatedAt    time.Time           `json:"updatedAt,omitempty"`
}

func (s SuperAdmin) public() map[string]any {
	id := ""
	if s.ID != 0 {
		id = strconv.FormatInt(s.ID, 10)
	}
	return map[string]any{
		"id":           id,
		"username":     s.Username,
		"email":        s.Email,
		"loginHistory": s.LoginHistory,
		"createdAt":    s.CreatedAt,
		"updatedAt":    s.UpdatedAt,
	}
}

type Staff struct {
	ID        int64     `json:"id,omitempty"`
	Name      string    `json:"name"`
	Role      string    `json:"role"`
	CreatedAt time.Time `json:"createdAt,omitempty"`
	UpdatedAt time.Time `json:"updatedAt,omitempty"`
}

func (s Staff) public() map[string]any {
	id := ""
	if s.ID != 0 {
		id = strconv.FormatInt(s.ID, 10)
	}
	return map[string]any{
		"id":        id,
		"name":      s.Name,
		"role":      s.Role,
		"createdAt": s.CreatedAt,
		"updatedAt": s.UpdatedAt,
	}
}

type Message struct {
	ID            int64      `json:"id,omitempty"`
	Topic         string     `json:"topic"`
	Message       string     `json:"message"`
	ReportedStaff *string    `json:"reportedStaff,omitempty"`
	ThreadToken   string     `json:"threadToken"`
	IsRead        bool       `json:"isRead"`
	IsDeleted     bool       `json:"isDeleted"`
	ReadAt        *time.Time `json:"readAt,omitempty"`
	CreatedAt     time.Time  `json:"createdAt,omitempty"`
}

func (m Message) public() map[string]any {
	id := ""
	if m.ID != 0 {
		id = strconv.FormatInt(m.ID, 10)
	}
	return map[string]any{
		"id":            id,
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
	ID          int64     `json:"id,omitempty"`
	ThreadToken string    `json:"threadToken"`
	Topic       string    `json:"topic"`
	Message     string    `json:"message"`
	IsDeleted   bool      `json:"isDeleted"`
	CreatedAt   time.Time `json:"createdAt,omitempty"`
	UpdatedAt   time.Time `json:"updatedAt,omitempty"`
}

