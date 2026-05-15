package httpapi

import (
	"net/http"
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
