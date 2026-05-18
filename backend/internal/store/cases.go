package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"math"
	"path/filepath"
	"strings"
	"time"

	"senior-project/backend/internal/models"
)

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
		SELECT c.id, c.title, c.summary, c.status, c.decision_status, c.decision_note,
		       COALESCE(u.completed_tasks, 0), COALESCE(u.total_tasks, 0),
		       c.client_name, COALESCE(c.client_user_id, 0), c.lawyer_id, l.name,
		       COALESCE(c.hidden_by_client, 0), COALESCE(c.hidden_by_lawyer, 0),
		       c.created_at, COALESCE(c.responded_at, '')
		FROM cases c
		JOIN lawyers l ON l.id = c.lawyer_id
		LEFT JOIN (
			SELECT case_id,
			       SUM(CASE WHEN state = 'completed' THEN 1 ELSE 0 END) AS completed_tasks,
			       COUNT(*) AS total_tasks
			FROM case_updates
			GROUP BY case_id
		) u ON u.case_id = c.id
		ORDER BY datetime(c.created_at) DESC, c.id DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []models.CaseSummary
	for rows.Next() {
		var item models.CaseSummary
		var completedTasks int
		var totalTasks int
		var hiddenByClient int
		var hiddenByLawyer int
		if err := rows.Scan(
			&item.ID,
			&item.Title,
			&item.Summary,
			&item.Status,
			&item.DecisionStatus,
			&item.DecisionNote,
			&completedTasks,
			&totalTasks,
			&item.ClientName,
			&item.ClientUserID,
			&item.LawyerID,
			&item.LawyerName,
			&hiddenByClient,
			&hiddenByLawyer,
			&item.CreatedAt,
			&item.RespondedAt,
		); err != nil {
			return nil, err
		}
		item.ProgressPercent = calculateProgressPercent(completedTasks, totalTasks)
		item.HiddenByClient = hiddenByClient == 1
		item.HiddenByLawyer = hiddenByLawyer == 1
		items = append(items, item)
	}

	return items, rows.Err()
}

func (s *Store) LoadCaseDetails(ctx context.Context, caseID int64) (models.CaseDetails, error) {
	var details models.CaseDetails
	var hiddenByClient int
	var hiddenByLawyer int

	err := s.db.QueryRowContext(ctx, `
		SELECT c.id, c.title, c.summary, c.status, c.decision_status, c.decision_note,
		       c.client_name, COALESCE(c.client_user_id, 0), c.lawyer_id,
		       COALESCE(c.hidden_by_client, 0), COALESCE(c.hidden_by_lawyer, 0),
		       c.created_at, COALESCE(c.responded_at, ''),
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
		&details.Case.ClientName,
		&details.Case.ClientUserID,
		&details.Case.LawyerID,
		&hiddenByClient,
		&hiddenByLawyer,
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
	details.Case.HiddenByClient = hiddenByClient == 1
	details.Case.HiddenByLawyer = hiddenByLawyer == 1
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
	details.Case.ProgressPercent = calculateProgressFromCaseUpdates(details.Updates)

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

func (s *Store) UpdateCaseVisibility(ctx context.Context, caseID int64, role string, userID, lawyerID int64, hidden bool) (models.CaseDetails, error) {
	if role != models.RoleClient && role != models.RoleLawyer {
		return models.CaseDetails{}, errors.New("only clients and lawyers can update case visibility")
	}

	var decisionStatus string
	var canAccess int
	query := `
		SELECT decision_status, COUNT(*)
		FROM cases
		WHERE id = ?`
	args := []any{caseID}

	if role == models.RoleLawyer {
		query += ` AND lawyer_id = ?`
		args = append(args, lawyerID)
	} else {
		query += ` AND client_user_id = ?`
		args = append(args, userID)
	}

	if err := s.db.QueryRowContext(ctx, query, args...).Scan(&decisionStatus, &canAccess); err != nil {
		return models.CaseDetails{}, err
	}
	if canAccess == 0 {
		return models.CaseDetails{}, sql.ErrNoRows
	}
	if decisionStatus != "completed" && decisionStatus != "declined" {
		return models.CaseDetails{}, errors.New("only completed or declined cases can be hidden")
	}

	column := "hidden_by_client"
	if role == models.RoleLawyer {
		column = "hidden_by_lawyer"
	}

	if _, err := s.db.ExecContext(ctx, `
		UPDATE cases
		SET `+column+` = ?
		WHERE id = ?`,
		boolToInt(hidden), caseID,
	); err != nil {
		return models.CaseDetails{}, err
	}

	return s.LoadCaseDetails(ctx, caseID)
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
	title := strings.TrimSpace(req.Title)
	summary := strings.TrimSpace(req.Summary)
	if title == "" {
		return models.CaseDetails{}, errors.New("case title is required")
	}
	if summary == "" {
		return models.CaseDetails{}, errors.New("issue description is required")
	}
	progressPercent := calculateProgressFromTimelineSteps(buildCaseTimeline("pending"))

	result, err := tx.ExecContext(ctx, `
		INSERT INTO cases (title, summary, status, decision_status, decision_note, progress_percent, client_name, client_user_id, lawyer_id, created_at, responded_at)
		VALUES (?, ?, ?, ?, '', ?, ?, ?, ?, ?, '')`,
		title,
		summary,
		"Pending lawyer review",
		"pending",
		progressPercent,
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
	if decision != "accepted" && decision != "declined" && decision != "completed" {
		return models.CaseDetails{}, errors.New("decision must be accepted, declined, or completed")
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

	if decision != "completed" && currentDecision != "pending" {
		return models.CaseDetails{}, fmt.Errorf("case is already %s", currentDecision)
	}
	if decision == "completed" && currentDecision != "accepted" {
		return models.CaseDetails{}, errors.New("only accepted cases can be completed")
	}

	now := time.Now().UTC().Format(timeLayout)
	status := "Accepted by lawyer"
	systemBody := fmt.Sprintf("%s accepted the case.", actorName)
	outcome := "Not decided"
	if decision == "declined" {
		status = "Declined"
		systemBody = fmt.Sprintf("%s declined the case.", actorName)
	} else if decision == "completed" {
		status = "Case completed"
		systemBody = fmt.Sprintf("%s ended the case.", actorName)
		if strings.TrimSpace(req.Outcome) != "" {
			outcome = strings.TrimSpace(req.Outcome)
		}
	}

	if note := strings.TrimSpace(req.Note); note != "" {
		systemBody = fmt.Sprintf("%s %s the case. Note: %s", actorName, decision, note)
	}
	progressPercent := calculateProgressFromTimelineSteps(buildCaseTimeline(decision))

	if _, err := tx.ExecContext(ctx, `
		UPDATE cases
		SET status = ?, decision_status = ?, decision_note = ?, progress_percent = ?, responded_at = ?, outcome = ?
		WHERE id = ?`,
		status, decision, strings.TrimSpace(req.Note), progressPercent, now, outcome, caseID,
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

func (s *Store) CreateCaseUpdate(ctx context.Context, caseID int64, req models.UpsertCaseUpdateRequest) (models.CaseDetails, error) {
	label := strings.TrimSpace(req.Label)
	if label == "" {
		return models.CaseDetails{}, errors.New("step label is required")
	}
	if !isValidCaseUpdateState(req.State) {
		return models.CaseDetails{}, errors.New("invalid state; use completed, current, or upcoming")
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return models.CaseDetails{}, err
	}
	defer tx.Rollback()

	var nextSortOrder int
	if err := tx.QueryRowContext(ctx, `
		SELECT COALESCE(MAX(sort_order), 0) + 1
		FROM case_updates
		WHERE case_id = ?`, caseID).Scan(&nextSortOrder); err != nil {
		return models.CaseDetails{}, err
	}

	if _, err := tx.ExecContext(ctx, `
		INSERT INTO case_updates (case_id, label, state, sort_order, created_at)
		VALUES (?, ?, ?, ?, ?)`,
		caseID, label, normalizeCaseUpdateState(req.State), nextSortOrder, time.Now().UTC().Format(timeLayout),
	); err != nil {
		return models.CaseDetails{}, err
	}

	if err := syncCaseProgress(ctx, tx, caseID); err != nil {
		return models.CaseDetails{}, err
	}

	if err := tx.Commit(); err != nil {
		return models.CaseDetails{}, err
	}

	return s.LoadCaseDetails(ctx, caseID)
}

func (s *Store) UpdateCaseUpdate(ctx context.Context, caseID, updateID int64, req models.UpsertCaseUpdateRequest) (models.CaseDetails, error) {
	label := strings.TrimSpace(req.Label)
	if label == "" {
		return models.CaseDetails{}, errors.New("step label is required")
	}
	if !isValidCaseUpdateState(req.State) {
		return models.CaseDetails{}, errors.New("invalid state; use completed, current, or upcoming")
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return models.CaseDetails{}, err
	}
	defer tx.Rollback()

	result, err := tx.ExecContext(ctx, `
		UPDATE case_updates
		SET label = ?, state = ?
		WHERE id = ? AND case_id = ?`,
		label, normalizeCaseUpdateState(req.State), updateID, caseID,
	)
	if err != nil {
		return models.CaseDetails{}, err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return models.CaseDetails{}, err
	}
	if rowsAffected == 0 {
		return models.CaseDetails{}, sql.ErrNoRows
	}

	if err := syncCaseProgress(ctx, tx, caseID); err != nil {
		return models.CaseDetails{}, err
	}

	if err := tx.Commit(); err != nil {
		return models.CaseDetails{}, err
	}

	return s.LoadCaseDetails(ctx, caseID)
}

func (s *Store) DeleteCaseUpdate(ctx context.Context, caseID, updateID int64) (models.CaseDetails, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return models.CaseDetails{}, err
	}
	defer tx.Rollback()

	var count int
	if err := tx.QueryRowContext(ctx, `SELECT COUNT(*) FROM case_updates WHERE case_id = ?`, caseID).Scan(&count); err != nil {
		return models.CaseDetails{}, err
	}
	if count <= 1 {
		return models.CaseDetails{}, errors.New("cannot remove the last case step")
	}

	result, err := tx.ExecContext(ctx, `
		DELETE FROM case_updates
		WHERE id = ? AND case_id = ?`,
		updateID, caseID,
	)
	if err != nil {
		return models.CaseDetails{}, err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return models.CaseDetails{}, err
	}
	if rowsAffected == 0 {
		return models.CaseDetails{}, sql.ErrNoRows
	}

	if err := resequenceCaseUpdates(ctx, tx, caseID); err != nil {
		return models.CaseDetails{}, err
	}
	if err := syncCaseProgress(ctx, tx, caseID); err != nil {
		return models.CaseDetails{}, err
	}

	if err := tx.Commit(); err != nil {
		return models.CaseDetails{}, err
	}

	return s.LoadCaseDetails(ctx, caseID)
}

func (s *Store) ReorderCaseUpdates(ctx context.Context, caseID int64, updateIDs []int64) (models.CaseDetails, error) {
	if len(updateIDs) == 0 {
		return models.CaseDetails{}, errors.New("update ids are required")
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return models.CaseDetails{}, err
	}
	defer tx.Rollback()

	rows, err := tx.QueryContext(ctx, `
		SELECT id
		FROM case_updates
		WHERE case_id = ?
		ORDER BY sort_order ASC, id ASC`, caseID)
	if err != nil {
		return models.CaseDetails{}, err
	}

	var existingIDs []int64
	for rows.Next() {
		var updateID int64
		if err := rows.Scan(&updateID); err != nil {
			rows.Close()
			return models.CaseDetails{}, err
		}
		existingIDs = append(existingIDs, updateID)
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return models.CaseDetails{}, err
	}
	rows.Close()

	if len(existingIDs) == 0 {
		return models.CaseDetails{}, sql.ErrNoRows
	}
	if len(existingIDs) != len(updateIDs) {
		return models.CaseDetails{}, errors.New("update ids must match the full set of case steps")
	}

	existingSet := make(map[int64]struct{}, len(existingIDs))
	for _, updateID := range existingIDs {
		existingSet[updateID] = struct{}{}
	}
	for _, updateID := range updateIDs {
		if _, ok := existingSet[updateID]; !ok {
			return models.CaseDetails{}, errors.New("update ids must match the full set of case steps")
		}
		delete(existingSet, updateID)
	}
	if len(existingSet) > 0 {
		return models.CaseDetails{}, errors.New("update ids must match the full set of case steps")
	}

	for index, updateID := range updateIDs {
		if _, err := tx.ExecContext(ctx, `
			UPDATE case_updates
			SET sort_order = ?
			WHERE id = ? AND case_id = ?`,
			index+1, updateID, caseID,
		); err != nil {
			return models.CaseDetails{}, err
		}
	}

	if err := tx.Commit(); err != nil {
		return models.CaseDetails{}, err
	}

	return s.LoadCaseDetails(ctx, caseID)
}

func seedCaseTimeline(ctx context.Context, runner dbRunner, caseID int64, decisionStatus, createdAt string) error {
	if _, err := runner.ExecContext(ctx, `DELETE FROM case_updates WHERE case_id = ?`, caseID); err != nil {
		return err
	}

	for _, item := range buildCaseTimeline(decisionStatus) {
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

type caseTimelineStep struct {
	Label string
	State string
	Order int
}

func buildCaseTimeline(decisionStatus string) []caseTimelineStep {
	switch decisionStatus {
	case "accepted":
		return []caseTimelineStep{
			{Label: "Case request submitted", State: "completed", Order: 1},
			{Label: "Lawyer accepted", State: "completed", Order: 2},
			{Label: "Client-lawyer messaging open", State: "current", Order: 3},
		}
	case "declined":
		return []caseTimelineStep{
			{Label: "Case request submitted", State: "completed", Order: 1},
			{Label: "Lawyer declined", State: "completed", Order: 2},
			{Label: "Case closed", State: "completed", Order: 3},
		}
	default:
		return []caseTimelineStep{
			{Label: "Case request submitted", State: "completed", Order: 1},
			{Label: "Awaiting lawyer decision", State: "current", Order: 2},
			{Label: "Messaging opens after acceptance", State: "upcoming", Order: 3},
		}
	}
}

func calculateProgressFromTimelineSteps(steps []caseTimelineStep) int {
	completedTasks := 0
	for _, step := range steps {
		if step.State == "completed" {
			completedTasks++
		}
	}

	return calculateProgressPercent(completedTasks, len(steps))
}

func calculateProgressFromCaseUpdates(updates []models.CaseUpdate) int {
	completedTasks := 0
	for _, update := range updates {
		if update.State == "completed" {
			completedTasks++
		}
	}

	return calculateProgressPercent(completedTasks, len(updates))
}

func calculateProgressPercent(completedTasks, totalTasks int) int {
	if totalTasks <= 0 {
		return 0
	}
	if completedTasks < 0 {
		completedTasks = 0
	}
	if completedTasks > totalTasks {
		completedTasks = totalTasks
	}

	return int(math.Round((float64(completedTasks) / float64(totalTasks)) * 100))
}

func syncCaseProgress(ctx context.Context, runner dbRunner, caseID int64) error {
	var completedTasks int
	var totalTasks int
	if err := runner.QueryRowContext(ctx, `
		SELECT
			COALESCE(SUM(CASE WHEN state = 'completed' THEN 1 ELSE 0 END), 0),
			COUNT(*)
		FROM case_updates
		WHERE case_id = ?`, caseID).Scan(&completedTasks, &totalTasks); err != nil {
		return err
	}

	_, err := runner.ExecContext(ctx, `
		UPDATE cases
		SET progress_percent = ?
		WHERE id = ?`,
		calculateProgressPercent(completedTasks, totalTasks), caseID,
	)
	return err
}

func resequenceCaseUpdates(ctx context.Context, runner dbRunner, caseID int64) error {
	rows, err := runner.QueryContext(ctx, `
		SELECT id
		FROM case_updates
		WHERE case_id = ?
		ORDER BY sort_order ASC, id ASC`, caseID)
	if err != nil {
		return err
	}
	defer rows.Close()

	var updateIDs []int64
	for rows.Next() {
		var updateID int64
		if err := rows.Scan(&updateID); err != nil {
			return err
		}
		updateIDs = append(updateIDs, updateID)
	}
	if err := rows.Err(); err != nil {
		return err
	}

	for index, updateID := range updateIDs {
		if _, err := runner.ExecContext(ctx, `
			UPDATE case_updates
			SET sort_order = ?
			WHERE id = ? AND case_id = ?`,
			index+1, updateID, caseID,
		); err != nil {
			return err
		}
	}

	return nil
}

func normalizeCaseUpdateState(state string) string {
	return strings.ToLower(strings.TrimSpace(state))
}

func isValidCaseUpdateState(state string) bool {
	switch normalizeCaseUpdateState(state) {
	case "completed", "current", "upcoming":
		return true
	default:
		return false
	}
}

func boolToInt(value bool) int {
	if value {
		return 1
	}
	return 0
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
