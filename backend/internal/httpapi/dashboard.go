package httpapi

import (
	"errors"
	"net/http"

	"senior-project/backend/internal/models"
)

func (s *Server) handleDashboard(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	current, err := s.viewerFromRequest(r)
	if err != nil {
		status := http.StatusUnauthorized
		if errors.Is(err, errForbidden) {
			status = http.StatusForbidden
		}
		writeError(w, status, err.Error())
		return
	}

	faqs, err := s.store.ListFAQSuggestions(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	lawyers, err := s.store.ListLawyers(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	role := models.RoleGuest
	var userID int64
	var lawyerID int64
	if current != nil {
		role = current.Role
		userID = current.ID
		lawyerID = current.LawyerID
	}

	activeCase, err := s.store.LoadPrimaryCaseForViewer(r.Context(), role, userID, lawyerID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, models.DashboardResponse{
		FAQSuggestions: faqs,
		Lawyers:        lawyers,
		ActiveCase:     activeCase,
	})
}
