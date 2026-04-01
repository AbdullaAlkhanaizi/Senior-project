package store

import (
	"context"
	"fmt"
	"os"
	"time"

	"senior-project/backend/internal/models"
)

const seededLawyerPassword = "Lawyer123!"
const seededClientEmail = "client@legal-portal.local"
const seededClientPassword = "Client123!"

func (s *Store) Migrate(ctx context.Context) error {
	if err := os.MkdirAll(s.uploadDir, 0o755); err != nil {
		return err
	}

	statements := []string{
		`CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			email TEXT NOT NULL UNIQUE,
			password_hash TEXT NOT NULL,
			role TEXT NOT NULL DEFAULT 'client',
			created_at TEXT NOT NULL
		);`,
		`CREATE TABLE IF NOT EXISTS lawyers (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER UNIQUE,
			name TEXT NOT NULL,
			firm TEXT NOT NULL,
			specialty TEXT NOT NULL,
			city TEXT NOT NULL,
			email TEXT NOT NULL,
			phone TEXT NOT NULL,
			bio TEXT NOT NULL,
			created_at TEXT NOT NULL,
			FOREIGN KEY (user_id) REFERENCES users(id)
		);`,
		`CREATE TABLE IF NOT EXISTS cases (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			title TEXT NOT NULL,
			summary TEXT NOT NULL,
			status TEXT NOT NULL,
			decision_status TEXT NOT NULL DEFAULT 'pending',
			decision_note TEXT NOT NULL DEFAULT '',
			progress_percent INTEGER NOT NULL,
			client_name TEXT NOT NULL,
			client_user_id INTEGER,
			lawyer_id INTEGER NOT NULL,
			created_at TEXT NOT NULL,
			responded_at TEXT NOT NULL DEFAULT '',
			FOREIGN KEY (client_user_id) REFERENCES users(id),
			FOREIGN KEY (lawyer_id) REFERENCES lawyers(id)
		);`,
		`CREATE TABLE IF NOT EXISTS case_updates (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			case_id INTEGER NOT NULL,
			label TEXT NOT NULL,
			state TEXT NOT NULL,
			sort_order INTEGER NOT NULL,
			created_at TEXT NOT NULL,
			FOREIGN KEY (case_id) REFERENCES cases(id)
		);`,
		`CREATE TABLE IF NOT EXISTS messages (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			case_id INTEGER NOT NULL,
			sender_type TEXT NOT NULL,
			sender_name TEXT NOT NULL,
			body TEXT NOT NULL,
			attachment_name TEXT NOT NULL DEFAULT '',
			attachment_path TEXT NOT NULL DEFAULT '',
			created_at TEXT NOT NULL,
			FOREIGN KEY (case_id) REFERENCES cases(id)
		);`,
		`CREATE TABLE IF NOT EXISTS case_events (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			case_id INTEGER NOT NULL,
			actor_role TEXT NOT NULL,
			actor_name TEXT NOT NULL,
			from_status TEXT NOT NULL,
			to_status TEXT NOT NULL,
			note TEXT NOT NULL DEFAULT '',
			created_at TEXT NOT NULL,
			FOREIGN KEY (case_id) REFERENCES cases(id)
		);`,
		`CREATE TABLE IF NOT EXISTS faq_suggestions (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			question TEXT NOT NULL,
			category TEXT NOT NULL,
			priority INTEGER NOT NULL
		);`,
	}

	for _, statement := range statements {
		if _, err := s.db.ExecContext(ctx, statement); err != nil {
			return err
		}
	}

	if err := s.ensureColumn(ctx, "users", "role", "TEXT NOT NULL DEFAULT 'client'"); err != nil {
		return err
	}
	if err := s.ensureColumn(ctx, "lawyers", "user_id", "INTEGER"); err != nil {
		return err
	}
	if err := s.ensureColumn(ctx, "lawyers", "created_at", "TEXT NOT NULL DEFAULT ''"); err != nil {
		return err
	}
	if err := s.ensureColumn(ctx, "cases", "client_user_id", "INTEGER"); err != nil {
		return err
	}
	if err := s.ensureColumn(ctx, "cases", "decision_status", "TEXT NOT NULL DEFAULT 'pending'"); err != nil {
		return err
	}
	if err := s.ensureColumn(ctx, "cases", "decision_note", "TEXT NOT NULL DEFAULT ''"); err != nil {
		return err
	}
	if err := s.ensureColumn(ctx, "cases", "responded_at", "TEXT NOT NULL DEFAULT ''"); err != nil {
		return err
	}

	if _, err := s.db.ExecContext(ctx, `
		UPDATE cases
		SET decision_status = CASE
			WHEN LOWER(status) LIKE '%declin%' THEN 'declined'
			WHEN LOWER(status) LIKE '%waiting%' OR LOWER(status) LIKE '%pending%' THEN 'pending'
			ELSE 'accepted'
		END
		WHERE TRIM(COALESCE(decision_status, '')) = ''`); err != nil {
		return err
	}
	if _, err := s.db.ExecContext(ctx, `
		UPDATE cases
		SET responded_at = created_at
		WHERE decision_status IN ('accepted', 'declined') AND TRIM(COALESCE(responded_at, '')) = ''`); err != nil {
		return err
	}

	indexStatements := []string{
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_lawyers_user_id ON lawyers(user_id) WHERE user_id IS NOT NULL;`,
		`CREATE INDEX IF NOT EXISTS idx_cases_client_user_id ON cases(client_user_id);`,
		`CREATE INDEX IF NOT EXISTS idx_case_events_case_id ON case_events(case_id);`,
	}

	for _, statement := range indexStatements {
		if _, err := s.db.ExecContext(ctx, statement); err != nil {
			return err
		}
	}

	return nil
}

func (s *Store) Seed(ctx context.Context) error {
	if _, err := s.EnsureUserAccount(ctx, s.adminName, s.adminEmail, s.adminPassword, models.RoleAdmin); err != nil {
		return err
	}

	sampleClient, err := s.EnsureUserAccount(ctx, "Sample Client", seededClientEmail, seededClientPassword, models.RoleClient)
	if err != nil {
		return err
	}

	if err := s.seedLawyers(ctx); err != nil {
		return err
	}
	if err := s.seedSampleCase(ctx, sampleClient); err != nil {
		return err
	}
	if err := s.seedFAQs(ctx); err != nil {
		return err
	}

	return nil
}

func (s *Store) seedLawyers(ctx context.Context) error {
	existingRows, err := s.db.QueryContext(ctx, `
		SELECT id, name, email, COALESCE(user_id, 0), firm, specialty, city, phone, bio
		FROM lawyers
		ORDER BY id ASC`)
	if err != nil {
		return err
	}
	defer existingRows.Close()

	type existingLawyer struct {
		ID        int64
		Name      string
		Email     string
		UserID    int64
		Firm      string
		Specialty string
		City      string
		Phone     string
		Bio       string
	}

	var existing []existingLawyer
	for existingRows.Next() {
		var row existingLawyer
		if err := existingRows.Scan(&row.ID, &row.Name, &row.Email, &row.UserID, &row.Firm, &row.Specialty, &row.City, &row.Phone, &row.Bio); err != nil {
			return err
		}
		existing = append(existing, row)
	}
	if err := existingRows.Err(); err != nil {
		return err
	}

	for _, row := range existing {
		if row.UserID != 0 {
			continue
		}

		account, err := s.EnsureUserAccount(ctx, row.Name, row.Email, seededLawyerPassword, models.RoleLawyer)
		if err != nil {
			return err
		}

		if _, err := s.db.ExecContext(ctx, `
			UPDATE lawyers
			SET user_id = ?
			WHERE id = ?`,
			account.ID, row.ID,
		); err != nil {
			return err
		}
	}

	var lawyerCount int
	if err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM lawyers`).Scan(&lawyerCount); err != nil {
		return err
	}
	if lawyerCount > 0 {
		return nil
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	lawyerSeeds := []models.Lawyer{
		{
			Name:      "Noor Al-Sayed",
			Firm:      "Justice Gate Law",
			Specialty: "Traffic and Municipal Violations",
			City:      "Manama",
			Email:     "noor@justicegate.example",
			Phone:     "+973 1700 4401",
			Bio:       "Handles day-to-day public violations, fines, and early-stage administrative disputes.",
		},
		{
			Name:      "Khalid Rahman",
			Firm:      "Rahman & Partners",
			Specialty: "Civil Litigation",
			City:      "Muharraq",
			Email:     "khalid@rahmanpartners.example",
			Phone:     "+973 1700 5522",
			Bio:       "Focuses on property conflicts, contract issues, and lawsuit preparation for individuals.",
		},
		{
			Name:      "Sara Haddad",
			Firm:      "Haddad Legal Group",
			Specialty: "Commercial and Employment Law",
			City:      "Riffa",
			Email:     "sara@haddadlegal.example",
			Phone:     "+973 1700 6633",
			Bio:       "Supports SMEs with commercial reviews, employment disputes, and formal legal notices.",
		},
	}

	for _, lawyer := range lawyerSeeds {
		account, err := ensureUserAccount(ctx, tx, lawyer.Name, lawyer.Email, seededLawyerPassword, models.RoleLawyer)
		if err != nil {
			return err
		}
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO lawyers (user_id, name, firm, specialty, city, email, phone, bio, created_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			account.ID, lawyer.Name, lawyer.Firm, lawyer.Specialty, lawyer.City, lawyer.Email, lawyer.Phone, lawyer.Bio, time.Now().UTC().Format(timeLayout),
		); err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (s *Store) seedSampleCase(ctx context.Context, sampleClient models.AuthResponse) error {
	var caseCount int
	if err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM cases`).Scan(&caseCount); err != nil {
		return err
	}
	if caseCount > 0 {
		return nil
	}

	var lawyerID int64
	if err := s.db.QueryRowContext(ctx, `SELECT id FROM lawyers ORDER BY id ASC LIMIT 1`).Scan(&lawyerID); err != nil {
		return err
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	now := time.Now().UTC()
	caseResult, err := tx.ExecContext(ctx, `
		INSERT INTO cases (title, summary, status, decision_status, decision_note, progress_percent, client_name, client_user_id, lawyer_id, created_at, responded_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		"Traffic citation review",
		"User asked whether a red-light violation requires court follow-up and uploaded the fine notice.",
		"Review in progress",
		"accepted",
		"Documents received. Initial review started.",
		55,
		sampleClient.Name,
		sampleClient.ID,
		lawyerID,
		now.Format(timeLayout),
		now.Add(30*time.Minute).Format(timeLayout),
	)
	if err != nil {
		return err
	}

	caseID, err := caseResult.LastInsertId()
	if err != nil {
		return err
	}

	updateSeeds := []struct {
		Label string
		State string
		Order int
	}{
		{Label: "Initial intake", State: "completed", Order: 1},
		{Label: "Lawyer assigned", State: "completed", Order: 2},
		{Label: "Document review", State: "current", Order: 3},
		{Label: "Next action", State: "upcoming", Order: 4},
	}

	for _, update := range updateSeeds {
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO case_updates (case_id, label, state, sort_order, created_at)
			VALUES (?, ?, ?, ?, ?)`,
			caseID, update.Label, update.State, update.Order, now.Add(time.Duration(update.Order)*time.Hour).Format(timeLayout),
		); err != nil {
			return err
		}
	}

	messageSeeds := []models.Message{
		{
			CaseID:     caseID,
			SenderType: "client",
			SenderName: sampleClient.Name,
			Body:       "I received this traffic ticket and want to know whether I need to attend court.",
			CreatedAt:  now.Format(timeLayout),
		},
		{
			CaseID:     caseID,
			SenderType: "system",
			SenderName: "Legal Consultant",
			Body:       "The chatbot escalated this conversation because it may require case-specific legal review.",
			CreatedAt:  now.Add(10 * time.Minute).Format(timeLayout),
		},
		{
			CaseID:     caseID,
			SenderType: "lawyer",
			SenderName: "Noor Al-Sayed",
			Body:       "Please upload the notice and any car registration documents so I can confirm the next step.",
			CreatedAt:  now.Add(45 * time.Minute).Format(timeLayout),
		},
	}

	for _, msg := range messageSeeds {
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO messages (case_id, sender_type, sender_name, body, attachment_name, attachment_path, created_at)
			VALUES (?, ?, ?, ?, '', '', ?)`,
			msg.CaseID, msg.SenderType, msg.SenderName, msg.Body, msg.CreatedAt,
		); err != nil {
			return err
		}
	}

	if _, err := tx.ExecContext(ctx, `
		INSERT INTO case_events (case_id, actor_role, actor_name, from_status, to_status, note, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)`,
		caseID,
		models.RoleLawyer,
		"Noor Al-Sayed",
		"pending",
		"accepted",
		"Documents received. Initial review started.",
		now.Add(30*time.Minute).Format(timeLayout),
	); err != nil {
		return err
	}

	return tx.Commit()
}

func (s *Store) seedFAQs(ctx context.Context) error {
	var faqCount int
	if err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM faq_suggestions`).Scan(&faqCount); err != nil {
		return err
	}
	if faqCount > 0 {
		return nil
	}

	faqSeeds := []models.FAQSuggestion{
		{Question: "Is running a red light illegal?", Category: "Traffic", Priority: 1},
		{Question: "What should I do after getting a store theft accusation?", Category: "Criminal", Priority: 2},
		{Question: "Can my employer cut my salary without notice?", Category: "Employment", Priority: 3},
		{Question: "How do I respond to a landlord dispute notice?", Category: "Housing", Priority: 4},
	}

	for _, faq := range faqSeeds {
		if _, err := s.db.ExecContext(ctx, `
			INSERT INTO faq_suggestions (question, category, priority)
			VALUES (?, ?, ?)`,
			faq.Question, faq.Category, faq.Priority,
		); err != nil {
			return err
		}
	}

	return nil
}

func (s *Store) ensureColumn(ctx context.Context, tableName, columnName, definition string) error {
	rows, err := s.db.QueryContext(ctx, fmt.Sprintf("PRAGMA table_info(%s)", tableName))
	if err != nil {
		return err
	}
	defer rows.Close()

	for rows.Next() {
		var cid int
		var name string
		var columnType string
		var notNull int
		var defaultValue any
		var pk int
		if err := rows.Scan(&cid, &name, &columnType, &notNull, &defaultValue, &pk); err != nil {
			return err
		}
		if name == columnName {
			return nil
		}
	}
	if err := rows.Err(); err != nil {
		return err
	}

	_, err = s.db.ExecContext(ctx, fmt.Sprintf("ALTER TABLE %s ADD COLUMN %s %s", tableName, columnName, definition))
	return err
}
