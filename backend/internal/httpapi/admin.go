package httpapi

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
)

func (s *Server) handleAdminStats(w http.ResponseWriter, r *http.Request) {
	current, err := s.requireViewer(r)
	if err != nil || current.Role != "admin" {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	stats, err := s.store.GetAdminStats(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, stats)
}

func (s *Server) handleAdminUsers(w http.ResponseWriter, r *http.Request) {
	current, err := s.requireViewer(r)
	if err != nil || current.Role != "admin" {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	users, err := s.store.GetAdminUsers(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, users)
}

func (s *Server) handleAdminUserByID(w http.ResponseWriter, r *http.Request) {
	current, err := s.requireViewer(r)
	if err != nil || current.Role != "admin" {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	parts := strings.Split(strings.TrimPrefix(r.URL.Path, "/api/admin/users/"), "/")
	if len(parts) == 0 || parts[0] == "" {
		writeError(w, http.StatusBadRequest, "missing user id")
		return
	}
	id, convErr := strconv.ParseInt(parts[0], 10, 64)
	if convErr != nil {
		writeError(w, http.StatusBadRequest, "invalid user id")
		return
	}

	switch r.Method {
	case http.MethodPut:
		var req struct {
			Name  string `json:"name"`
			Email string `json:"email"`
			Role  string `json:"role"`
		}
		if decErr := json.NewDecoder(r.Body).Decode(&req); decErr != nil {
			writeError(w, http.StatusBadRequest, "invalid json body")
			return
		}
		if strings.TrimSpace(req.Name) == "" || strings.TrimSpace(req.Email) == "" {
			writeError(w, http.StatusBadRequest, "name and email are required")
			return
		}
		validRoles := map[string]bool{"client": true, "lawyer": true, "admin": true}
		if !validRoles[req.Role] {
			writeError(w, http.StatusBadRequest, "role must be client, lawyer, or admin")
			return
		}
		updated, storeErr := s.store.UpdateAdminUser(r.Context(), id, req.Name, req.Email, req.Role)
		if storeErr != nil {
			writeError(w, http.StatusInternalServerError, storeErr.Error())
			return
		}
		writeJSON(w, http.StatusOK, updated)

	case http.MethodDelete:
		if delErr := s.store.DeleteAdminUser(r.Context(), id); delErr != nil {
			writeError(w, http.StatusInternalServerError, delErr.Error())
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"message": "user deleted"})

	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}
