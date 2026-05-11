package httpapi

import (
	"crypto/hmac"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"senior-project/backend/internal/models"
)

var (
	errUnauthorized = errors.New("authentication required")
	errForbidden    = errors.New("forbidden")
)

type viewer struct {
	ID       int64  `json:"id"`
	Name     string `json:"name"`
	Email    string `json:"email"`
	Role     string `json:"role"`
	LawyerID int64  `json:"lawyerId,omitempty"`
	Exp      int64  `json:"exp"`
}

func (s *Server) issueToken(user models.AuthResponse) (string, error) {
	payload := viewer{
		ID:       user.ID,
		Name:     user.Name,
		Email:    user.Email,
		Role:     user.Role,
		LawyerID: user.LawyerID,
		Exp:      time.Now().Add(7 * 24 * time.Hour).Unix(),
	}

	rawPayload, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}

	encodedPayload := base64.RawURLEncoding.EncodeToString(rawPayload)
	signature := s.sign(encodedPayload)
	return fmt.Sprintf("%s.%s", encodedPayload, signature), nil
}

func (s *Server) viewerFromRequest(r *http.Request) (*viewer, error) {
	header := strings.TrimSpace(r.Header.Get("Authorization"))
	var token string
	if header != "" {
		token = strings.TrimPrefix(header, "Bearer ")
		if token == header {
			return nil, errUnauthorized
		}
	} else {
		token = r.URL.Query().Get("token")
	}

	if token == "" {
		return nil, nil
	}

	return s.parseToken(token)
}

func (s *Server) requireViewer(r *http.Request) (*viewer, error) {
	current, err := s.viewerFromRequest(r)
	if err != nil {
		return nil, err
	}
	if current == nil || current.Role == models.RoleGuest {
		return nil, errUnauthorized
	}
	return current, nil
}

func (s *Server) requireAdmin(r *http.Request) (*viewer, error) {
	current, err := s.requireViewer(r)
	if err != nil {
		return nil, err
	}
	if current.Role != models.RoleAdmin {
		return nil, errForbidden
	}
	return current, nil
}

func (s *Server) parseToken(token string) (*viewer, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 2 {
		return nil, errUnauthorized
	}

	expectedSignature := s.sign(parts[0])
	if subtle.ConstantTimeCompare([]byte(parts[1]), []byte(expectedSignature)) != 1 {
		return nil, errUnauthorized
	}

	rawPayload, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return nil, errUnauthorized
	}

	var payload viewer
	if err := json.Unmarshal(rawPayload, &payload); err != nil {
		return nil, errUnauthorized
	}
	if payload.Exp < time.Now().Unix() {
		return nil, errUnauthorized
	}

	return &payload, nil
}

func (s *Server) sign(payload string) string {
	mac := hmac.New(sha256.New, []byte(s.config.AuthSecret))
	_, _ = mac.Write([]byte(payload))
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}
