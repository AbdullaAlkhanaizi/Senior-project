package httpapi

import (
	"encoding/json"
	"net/http"

	"senior-project/backend/internal/models"
)

func (s *Server) handleReviews(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		s.handleGetReviews(w, r)
	case http.MethodPost:
		s.handleCreateReview(w, r)
	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func (s *Server) handleGetReviews(w http.ResponseWriter, r *http.Request) {
	reviews, err := s.store.GetReviews(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, reviews)
}

func (s *Server) handleCreateReview(w http.ResponseWriter, r *http.Request) {
	current, err := s.requireViewer(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req models.CreateReviewRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request")
		return
	}

	if req.LawyerID <= 0 || req.Title == "" || req.Body == "" || req.Rating < 1 || req.Rating > 5 {
		writeError(w, http.StatusBadRequest, "missing or invalid required fields")
		return
	}

	review, err := s.store.CreateReview(r.Context(), current.ID, req)
	if err != nil {
		if err.Error() == "you can only review a lawyer if you have a completed case with them" {
			writeError(w, http.StatusForbidden, err.Error())
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusCreated, review)
}
