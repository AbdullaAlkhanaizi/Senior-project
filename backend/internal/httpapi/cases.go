package httpapi

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"senior-project/backend/internal/models"
)

func (s *Server) handleCases(w http.ResponseWriter, r *http.Request) {
	current, err := s.requireViewer(r)
	if err != nil {
		status := http.StatusUnauthorized
		if errors.Is(err, errForbidden) {
			status = http.StatusForbidden
		}
		writeError(w, status, err.Error())
		return
	}

	switch r.Method {
	case http.MethodGet:
		cases, err := s.store.ListCases(r.Context())
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}

		filtered := make([]models.CaseSummary, 0, len(cases))
		for _, item := range cases {
			if current.Role == models.RoleAdmin {
				filtered = append(filtered, item)
				continue
			}
			if current.Role == models.RoleLawyer && item.LawyerID == current.LawyerID {
				filtered = append(filtered, item)
				continue
			}
			if current.Role == models.RoleClient && item.ClientUserID == current.ID {
				filtered = append(filtered, item)
			}
		}

		writeJSON(w, http.StatusOK, filtered)
	case http.MethodPost:
		if current.Role != models.RoleClient {
			writeError(w, http.StatusForbidden, "only signed-in clients can create case requests")
			return
		}

		var req models.CreateCaseRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid json body")
			return
		}
		if strings.TrimSpace(req.Summary) == "" || req.LawyerID == 0 {
			writeError(w, http.StatusBadRequest, "lawyerId and issue summary are required")
			return
		}

		req.ClientUserID = current.ID
		req.ClientName = defaultString(req.ClientName, current.Name)

		details, err := s.store.CreateCase(r.Context(), req)
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		writeJSON(w, http.StatusCreated, details)
	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func (s *Server) handleCaseRoutes(w http.ResponseWriter, r *http.Request) {
	current, err := s.requireViewer(r)
	if err != nil {
		status := http.StatusUnauthorized
		if errors.Is(err, errForbidden) {
			status = http.StatusForbidden
		}
		writeError(w, status, err.Error())
		return
	}

	path := strings.TrimPrefix(r.URL.Path, "/api/cases/")
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) == 0 || parts[0] == "" {
		writeError(w, http.StatusNotFound, "not found")
		return
	}

	caseID, err := strconv.ParseInt(parts[0], 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid case id")
		return
	}

	if current.Role == models.RoleAdmin {
		writeError(w, http.StatusForbidden, "admins cannot access client-lawyer message threads")
		return
	}

	allowed, err := s.store.CanAccessCase(r.Context(), caseID, current.Role, current.ID, current.LawyerID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if !allowed {
		writeError(w, http.StatusForbidden, "you do not have access to this case")
		return
	}

	if len(parts) == 1 {
		if r.Method != http.MethodGet {
			writeError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		details, err := s.store.LoadCaseDetails(r.Context(), caseID)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				writeError(w, http.StatusNotFound, "case not found")
				return
			}
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}

		writeJSON(w, http.StatusOK, details)
		return
	}

	switch parts[1] {
	case "messages":
		s.handleCaseMessages(w, r, caseID, current)
	case "attachments":
		s.handleCaseAttachments(w, r, caseID, current)
	case "decision":
		s.handleCaseDecision(w, r, caseID, current)
	case "updates":
		s.handleCaseUpdates(w, r, caseID, parts, current)
	default:
		writeError(w, http.StatusNotFound, "not found")
	}
}

func (s *Server) handleCaseMessages(w http.ResponseWriter, r *http.Request, caseID int64, current *viewer) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	allowed, decisionStatus, err := s.store.CaseAllowsMessaging(r.Context(), caseID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if !allowed {
		writeError(w, http.StatusConflict, "messaging is available only after the lawyer accepts the case; current status: "+decisionStatus)
		return
	}

	var req models.CreateMessageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json body")
		return
	}

	req.SenderType, req.SenderName = senderIdentity(current)

	message, err := s.store.CreateMessage(r.Context(), caseID, req)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusCreated, message)
}

func (s *Server) handleCaseAttachments(w http.ResponseWriter, r *http.Request, caseID int64, current *viewer) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	allowed, decisionStatus, err := s.store.CaseAllowsMessaging(r.Context(), caseID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if !allowed {
		writeError(w, http.StatusConflict, "file uploads are available only after the lawyer accepts the case; current status: "+decisionStatus)
		return
	}

	if err := r.ParseMultipartForm(20 << 20); err != nil {
		writeError(w, http.StatusBadRequest, "invalid multipart form")
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "file is required")
		return
	}
	defer file.Close()

	senderType, senderName := senderIdentity(current)
	message, err := s.store.CreateAttachmentMessage(
		r.Context(),
		caseID,
		senderType,
		senderName,
		r.FormValue("message"),
		header,
		file,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusCreated, message)
}

func (s *Server) handleCaseDecision(w http.ResponseWriter, r *http.Request, caseID int64, current *viewer) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	if current.Role != models.RoleLawyer {
		writeError(w, http.StatusForbidden, "only lawyers can accept or decline cases")
		return
	}

	var req models.CaseDecisionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json body")
		return
	}

	details, err := s.store.DecideCase(r.Context(), caseID, current.Name, req)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			writeError(w, http.StatusNotFound, "case not found")
			return
		}
		if strings.Contains(err.Error(), "already") || strings.Contains(err.Error(), "decision must") {
			writeError(w, http.StatusConflict, err.Error())
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, details)
}

func (s *Server) handleCaseUpdates(w http.ResponseWriter, r *http.Request, caseID int64, parts []string, current *viewer) {
	if current.Role != models.RoleLawyer {
		writeError(w, http.StatusForbidden, "only lawyers can manage case steps")
		return
	}

	if len(parts) == 2 {
		if r.Method != http.MethodPost {
			writeError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		var req models.UpsertCaseUpdateRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid json body")
			return
		}

		details, err := s.store.CreateCaseUpdate(r.Context(), caseID, req)
		if err != nil {
			if strings.Contains(err.Error(), "required") || strings.Contains(err.Error(), "invalid state") {
				writeError(w, http.StatusBadRequest, err.Error())
				return
			}
			if errors.Is(err, sql.ErrNoRows) {
				writeError(w, http.StatusNotFound, "case not found")
				return
			}
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}

		writeJSON(w, http.StatusCreated, details)
		return
	}

	if len(parts) != 3 {
		writeError(w, http.StatusNotFound, "not found")
		return
	}

	updateID, err := strconv.ParseInt(parts[2], 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid update id")
		return
	}

	switch r.Method {
	case http.MethodPut:
		var req models.UpsertCaseUpdateRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid json body")
			return
		}

		details, err := s.store.UpdateCaseUpdate(r.Context(), caseID, updateID, req)
		if err != nil {
			if strings.Contains(err.Error(), "required") || strings.Contains(err.Error(), "invalid state") {
				writeError(w, http.StatusBadRequest, err.Error())
				return
			}
			if errors.Is(err, sql.ErrNoRows) {
				writeError(w, http.StatusNotFound, "step not found")
				return
			}
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}

		writeJSON(w, http.StatusOK, details)
	case http.MethodDelete:
		details, err := s.store.DeleteCaseUpdate(r.Context(), caseID, updateID)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				writeError(w, http.StatusNotFound, "step not found")
				return
			}
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}

		writeJSON(w, http.StatusOK, details)
	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func senderIdentity(current *viewer) (string, string) {
	if current == nil {
		return "client", "Client"
	}
	if current.Role == models.RoleLawyer {
		return "lawyer", current.Name
	}
	return "client", current.Name
}

func defaultString(value, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return strings.TrimSpace(value)
}
