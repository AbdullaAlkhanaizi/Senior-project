package store

import (
	"context"
	"errors"
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
		SELECT id, name, firm, specialty, city, email, phone, bio
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
		SELECT id, title, summary, status, progress_percent, client_name, lawyer_id, created_at
		FROM cases
		ORDER BY id ASC`)
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
			&item.ProgressPercent,
			&item.ClientName,
			&item.LawyerID,
			&item.CreatedAt,
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
		SELECT c.id, c.title, c.summary, c.status, c.progress_percent, c.client_name, c.lawyer_id, c.created_at,
		       l.id, l.name, l.firm, l.specialty, l.city, l.email, l.phone, l.bio
		FROM cases c
		JOIN lawyers l ON l.id = c.lawyer_id
		WHERE c.id = ?`, caseID).Scan(
		&details.Case.ID,
		&details.Case.Title,
		&details.Case.Summary,
		&details.Case.Status,
		&details.Case.ProgressPercent,
		&details.Case.ClientName,
		&details.Case.LawyerID,
		&details.Case.CreatedAt,
		&details.Lawyer.ID,
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

func (s *Store) CreateCase(ctx context.Context, req models.CreateCaseRequest) (models.CaseDetails, error) {
	now := time.Now().UTC().Format(timeLayout)

	result, err := s.db.ExecContext(ctx, `
		INSERT INTO cases (title, summary, status, progress_percent, client_name, lawyer_id, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)`,
		req.Title,
		defaultString(req.Summary, "Created from chatbot referral"),
		"Waiting for lawyer response",
		20,
		req.ClientName,
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

	updateSeeds := []struct {
		Label string
		State string
		Order int
	}{
		{Label: "Referral received", State: "completed", Order: 1},
		{Label: "Lawyer notified", State: "current", Order: 2},
		{Label: "Client documents pending", State: "upcoming", Order: 3},
	}

	for _, update := range updateSeeds {
		if _, err := s.db.ExecContext(ctx, `
			INSERT INTO case_updates (case_id, label, state, sort_order, created_at)
			VALUES (?, ?, ?, ?, ?)`,
			caseID, update.Label, update.State, update.Order, now,
		); err != nil {
			return models.CaseDetails{}, err
		}
	}

	if _, err := s.db.ExecContext(ctx, `
		INSERT INTO messages (case_id, sender_type, sender_name, body, attachment_name, attachment_path, created_at)
		VALUES (?, 'system', 'Legal Consultant', ?, '', '', ?)`,
		caseID, "Conversation escalated from chatbot. Lawyer introduction started.", now,
	); err != nil {
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
