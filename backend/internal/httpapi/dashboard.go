package httpapi

import (
	"net/http"

	"senior-project/backend/internal/models"
)

func (s *Server) handleDashboard(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
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

	activeCase, err := s.store.LoadCaseDetails(r.Context(), 1)
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
