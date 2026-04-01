package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"path/filepath"
	"strings"
	"time"

	"senior-project/backend/internal/models"
)

func (s *Store) ListFAQSuggestions(ctx context.Context) ([]models.FAQSuggestion, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, question, category, priority
		FROM faq_suggestions
		ORDER BY priority ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []models.FAQSuggestion
	for rows.Next() {
		var item models.FAQSuggestion
		if err := rows.Scan(&item.ID, &item.Question, &item.Category, &item.Priority); err != nil {
			return nil, err
		}
		items = append(items, item)
	}

	return items, rows.Err()
}

func (s *Store) ListLawyers(ctx context.Context) ([]models.Lawyer, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, COALESCE(user_id, 0), name, firm, specialty, city, email, phone, bio
		FROM lawyers
		ORDER BY id ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []models.Lawyer
	for rows.Next() {
		var item models.Lawyer
		if err := rows.Scan(
			&item.ID,
			&item.UserID,
			&item.Name,
			&item.Firm,
			&item.Specialty,
			&item.City,
			&item.Email,
			&item.Phone,
			&item.Bio,
		); err != nil {
			return nil, err
		}
		items = append(items, item)
	}

	return items, rows.Err()
}

func (s *Store) ListCases(ctx context.Context) ([]models.CaseSummary, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT c.id, c.title, c.summary, c.status, c.decision_status, c.decision_note, c.progress_percent,
		       c.client_name, COALESCE(c.client_user_id, 0), c.lawyer_id, l.name, c.created_at, COALESCE(c.responded_at, '')
		FROM cases c
		JOIN lawyers l ON l.id = c.lawyer_id
		ORDER BY datetime(c.created_at) DESC, c.id DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []models.CaseSummary
	for rows.Next() {
		var item models.CaseSummary
		if err := rows.Scan(
			&item.ID,
			&item.Title,
			&item.Summary,
			&item.Status,
			&item.DecisionStatus,
			&item.DecisionNote,
			&item.ProgressPercent,
			&item.ClientName,
			&item.ClientUserID,
			&item.LawyerID,
			&item.LawyerName,
			&item.CreatedAt,
			&item.RespondedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, item)
	}

	return items, rows.Err()
}

func (s *Store) LoadCaseDetails(ctx context.Context, caseID int64) (models.CaseDetails, error) {
	var details models.CaseDetails

	err := s.db.QueryRowContext(ctx, `
		SELECT c.id, c.title, c.summary, c.status, c.decision_status, c.decision_note, c.progress_percent,
		       c.client_name, COALESCE(c.client_user_id, 0), c.lawyer_id, c.created_at, COALESCE(c.responded_at, ''),
		       l.id, COALESCE(l.user_id, 0), l.name, l.firm, l.specialty, l.city, l.email, l.phone, l.bio
		FROM cases c
		JOIN lawyers l ON l.id = c.lawyer_id
		WHERE c.id = ?`, caseID).Scan(
		&details.Case.ID,
		&details.Case.Title,
		&details.Case.Summary,
		&details.Case.Status,
		&details.Case.DecisionStatus,
		&details.Case.DecisionNote,
		&details.Case.ProgressPercent,
		&details.Case.ClientName,
		&details.Case.ClientUserID,
		&details.Case.LawyerID,
		&details.Case.CreatedAt,
		&details.Case.RespondedAt,
		&details.Lawyer.ID,
		&details.Lawyer.UserID,
		&details.Lawyer.Name,
		&details.Lawyer.Firm,
		&details.Lawyer.Specialty,
		&details.Lawyer.City,
		&details.Lawyer.Email,
		&details.Lawyer.Phone,
		&details.Lawyer.Bio,
	)
	if err != nil {
		return models.CaseDetails{}, err
	}
	details.Case.LawyerName = details.Lawyer.Name

	updateRows, err := s.db.QueryContext(ctx, `
		SELECT id, label, state, sort_order, created_at
		FROM case_updates
		WHERE case_id = ?
		ORDER BY sort_order ASC`, caseID)
	if err != nil {
		return models.CaseDetails{}, err
	}
	defer updateRows.Close()

	for updateRows.Next() {
		var update models.CaseUpdate
		if err := updateRows.Scan(&update.ID, &update.Label, &update.State, &update.SortOrder, &update.CreatedAt); err != nil {
			return models.CaseDetails{}, err
		}
		details.Updates = append(details.Updates, update)
	}
	if err := updateRows.Err(); err != nil {
		return models.CaseDetails{}, err
	}

	messageRows, err := s.db.QueryContext(ctx, `
		SELECT id, case_id, sender_type, sender_name, body, attachment_name, attachment_path, created_at
		FROM messages
		WHERE case_id = ?
		ORDER BY datetime(created_at) ASC, id ASC`, caseID)
	if err != nil {
		return models.CaseDetails{}, err
	}
	defer messageRows.Close()

	for messageRows.Next() {
		var msg models.Message
		var attachmentPath string
		if err := messageRows.Scan(
			&msg.ID,
			&msg.CaseID,
			&msg.SenderType,
			&msg.SenderName,
			&msg.Body,
			&msg.AttachmentName,
			&attachmentPath,
			&msg.CreatedAt,
		); err != nil {
			return models.CaseDetails{}, err
		}
		if attachmentPath != "" {
			msg.AttachmentURL = "/uploads/" + filepath.Base(attachmentPath)
		}
		details.Messages = append(details.Messages, msg)
	}

	return details, messageRows.Err()
}

func (s *Store) LoadPrimaryCaseForViewer(ctx context.Context, role string, userID, lawyerID int64) (*models.CaseDetails, error) {
	var caseID int64
	var err error

	switch role {
	case models.RoleAdmin:
		return nil, nil
	case models.RoleLawyer:
		err = s.db.QueryRowContext(ctx, `
			SELECT id
			FROM cases
			WHERE lawyer_id = ?
			ORDER BY datetime(created_at) DESC, id DESC
			LIMIT 1`, lawyerID,
		).Scan(&caseID)
	case models.RoleClient:
		err = s.db.QueryRowContext(ctx, `
			SELECT id
			FROM cases
			WHERE client_user_id = ?
			ORDER BY datetime(created_at) DESC, id DESC
			LIMIT 1`, userID,
		).Scan(&caseID)
	default:
		return nil, nil
	}
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	details, err := s.LoadCaseDetails(ctx, caseID)
	if err != nil {
		return nil, err
	}

	return &details, nil
}

func (s *Store) CanAccessCase(ctx context.Context, caseID int64, role string, userID, lawyerID int64) (bool, error) {
	if role == models.RoleAdmin {
		return false, nil
	}
	if role == models.RoleGuest || role == "" {
		return false, nil
	}

	var count int
	var err error
	switch role {
	case models.RoleLawyer:
		err = s.db.QueryRowContext(ctx, `
			SELECT COUNT(*)
			FROM cases
			WHERE id = ? AND lawyer_id = ?`,
			caseID, lawyerID,
		).Scan(&count)
	default:
		err = s.db.QueryRowContext(ctx, `
			SELECT COUNT(*)
			FROM cases
			WHERE id = ? AND client_user_id = ?`,
			caseID, userID,
		).Scan(&count)
	}
	if err != nil {
		return false, err
	}

	return count > 0, nil
}

func (s *Store) CaseAllowsMessaging(ctx context.Context, caseID int64) (bool, string, error) {
	var decisionStatus string
	err := s.db.QueryRowContext(ctx, `
		SELECT decision_status
		FROM cases
		WHERE id = ?`, caseID).Scan(&decisionStatus)
	if err != nil {
		return false, "", err
	}

	if decisionStatus != "accepted" {
		return false, decisionStatus, nil
	}

	return true, decisionStatus, nil
}

func (s *Store) CreateCase(ctx context.Context, req models.CreateCaseRequest) (models.CaseDetails, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return models.CaseDetails{}, err
	}
	defer tx.Rollback()

	now := time.Now().UTC().Format(timeLayout)
	title := buildCaseTitle(req.Title, req.Summary)
	summary := strings.TrimSpace(req.Summary)
	if summary == "" {
		return models.CaseDetails{}, errors.New("issue description is required")
	}

	result, err := tx.ExecContext(ctx, `
		INSERT INTO cases (title, summary, status, decision_status, decision_note, progress_percent, client_name, client_user_id, lawyer_id, created_at, responded_at)
		VALUES (?, ?, ?, ?, '', ?, ?, ?, ?, ?, '')`,
		title,
		summary,
		"Pending lawyer review",
		"pending",
		15,
		req.ClientName,
		req.ClientUserID,
		req.LawyerID,
		now,
	)
	if err != nil {
		return models.CaseDetails{}, err
	}

	caseID, err := result.LastInsertId()
	if err != nil {
		return models.CaseDetails{}, err
	}

	if err := seedCaseTimeline(ctx, tx, caseID, "pending", now); err != nil {
		return models.CaseDetails{}, err
	}

	if _, err := tx.ExecContext(ctx, `
		INSERT INTO messages (case_id, sender_type, sender_name, body, attachment_name, attachment_path, created_at)
		VALUES (?, 'system', 'Legal Consultant', ?, '', '', ?)`,
		caseID, "The case request was sent to the selected lawyer and is waiting for a response.", now,
	); err != nil {
		return models.CaseDetails{}, err
	}

	if _, err := tx.ExecContext(ctx, `
		INSERT INTO case_events (case_id, actor_role, actor_name, from_status, to_status, note, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)`,
		caseID, models.RoleClient, req.ClientName, "", "pending", summary, now,
	); err != nil {
		return models.CaseDetails{}, err
	}

	if err := tx.Commit(); err != nil {
		return models.CaseDetails{}, err
	}

	return s.LoadCaseDetails(ctx, caseID)
}

func (s *Store) DecideCase(ctx context.Context, caseID int64, actorName string, req models.CaseDecisionRequest) (models.CaseDetails, error) {
	decision := strings.ToLower(strings.TrimSpace(req.Decision))
	if decision != "accepted" && decision != "declined" {
		return models.CaseDetails{}, errors.New("decision must be accepted or declined")
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return models.CaseDetails{}, err
	}
	defer tx.Rollback()

	var currentDecision string
	var clientName string
	err = tx.QueryRowContext(ctx, `
		SELECT decision_status, client_name
		FROM cases
		WHERE id = ?`, caseID).Scan(&currentDecision, &clientName)
	if err != nil {
		return models.CaseDetails{}, err
	}
	if currentDecision != "pending" {
		return models.CaseDetails{}, fmt.Errorf("case is already %s", currentDecision)
	}

	now := time.Now().UTC().Format(timeLayout)
	status := "Accepted by lawyer"
	progress := 45
	systemBody := fmt.Sprintf("%s accepted the case.", actorName)
	if decision == "declined" {
		status = "Declined by lawyer"
		progress = 70
		systemBody = fmt.Sprintf("%s declined the case.", actorName)
	}
	if note := strings.TrimSpace(req.Note); note != "" {
		systemBody = fmt.Sprintf("%s %s the case. Note: %s", actorName, decision, note)
	}

	if _, err := tx.ExecContext(ctx, `
		UPDATE cases
		SET status = ?, decision_status = ?, decision_note = ?, progress_percent = ?, responded_at = ?
		WHERE id = ?`,
		status, decision, strings.TrimSpace(req.Note), progress, now, caseID,
	); err != nil {
		return models.CaseDetails{}, err
	}

	if err := seedCaseTimeline(ctx, tx, caseID, decision, now); err != nil {
		return models.CaseDetails{}, err
	}

	if _, err := tx.ExecContext(ctx, `
		INSERT INTO messages (case_id, sender_type, sender_name, body, attachment_name, attachment_path, created_at)
		VALUES (?, 'system', ?, ?, '', '', ?)`,
		caseID, actorName, systemBody, now,
	); err != nil {
		return models.CaseDetails{}, err
	}

	if _, err := tx.ExecContext(ctx, `
		INSERT INTO case_events (case_id, actor_role, actor_name, from_status, to_status, note, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)`,
		caseID, models.RoleLawyer, actorName, currentDecision, decision, strings.TrimSpace(req.Note), now,
	); err != nil {
		return models.CaseDetails{}, err
	}

	if err := tx.Commit(); err != nil {
		return models.CaseDetails{}, err
	}

	return s.LoadCaseDetails(ctx, caseID)
}

func (s *Store) CreateMessage(ctx context.Context, caseID int64, req models.CreateMessageRequest) (models.Message, error) {
	if strings.TrimSpace(req.Body) == "" {
		return models.Message{}, errors.New("message body is required")
	}

	if strings.TrimSpace(req.SenderType) == "" {
		req.SenderType = "client"
	}
	if strings.TrimSpace(req.SenderName) == "" {
		req.SenderName = "Client"
	}

	now := time.Now().UTC().Format(timeLayout)
	result, err := s.db.ExecContext(ctx, `
		INSERT INTO messages (case_id, sender_type, sender_name, body, attachment_name, attachment_path, created_at)
		VALUES (?, ?, ?, ?, '', '', ?)`,
		caseID, req.SenderType, req.SenderName, req.Body, now,
	)
	if err != nil {
		return models.Message{}, err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return models.Message{}, err
	}

	return models.Message{
		ID:         id,
		CaseID:     caseID,
		SenderType: req.SenderType,
		SenderName: req.SenderName,
		Body:       req.Body,
		CreatedAt:  now,
	}, nil
}

func seedCaseTimeline(ctx context.Context, runner dbRunner, caseID int64, decisionStatus, createdAt string) error {
	if _, err := runner.ExecContext(ctx, `DELETE FROM case_updates WHERE case_id = ?`, caseID); err != nil {
		return err
	}

	type step struct {
		Label string
		State string
		Order int
	}

	var steps []step
	switch decisionStatus {
	case "accepted":
		steps = []step{
			{Label: "Case request submitted", State: "completed", Order: 1},
			{Label: "Lawyer accepted", State: "completed", Order: 2},
			{Label: "Client-lawyer messaging open", State: "current", Order: 3},
		}
	case "declined":
		steps = []step{
			{Label: "Case request submitted", State: "completed", Order: 1},
			{Label: "Lawyer declined", State: "completed", Order: 2},
			{Label: "Choose another lawyer", State: "current", Order: 3},
		}
	default:
		steps = []step{
			{Label: "Case request submitted", State: "completed", Order: 1},
			{Label: "Awaiting lawyer decision", State: "current", Order: 2},
			{Label: "Messaging opens after acceptance", State: "upcoming", Order: 3},
		}
	}

	for _, item := range steps {
		if _, err := runner.ExecContext(ctx, `
			INSERT INTO case_updates (case_id, label, state, sort_order, created_at)
			VALUES (?, ?, ?, ?, ?)`,
			caseID, item.Label, item.State, item.Order, createdAt,
		); err != nil {
			return err
		}
	}

	return nil
}

func buildCaseTitle(title, summary string) string {
	title = strings.TrimSpace(title)
	if title != "" {
		return title
	}

	summary = strings.TrimSpace(summary)
	if summary == "" {
		return "New legal issue"
	}
	if len(summary) <= 48 {
		return summary
	}
	return strings.TrimSpace(summary[:48]) + "..."
}
