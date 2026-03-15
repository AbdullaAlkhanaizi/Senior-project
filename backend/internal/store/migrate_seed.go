package store

import (
	"context"
	"os"
	"time"

	"senior-project/backend/internal/models"
)

const timeLayout = time.RFC3339

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
			created_at TEXT NOT NULL
		);`,
		`CREATE TABLE IF NOT EXISTS lawyers (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			firm TEXT NOT NULL,
			specialty TEXT NOT NULL,
			city TEXT NOT NULL,
			email TEXT NOT NULL,
			phone TEXT NOT NULL,
			bio TEXT NOT NULL
		);`,
		`CREATE TABLE IF NOT EXISTS cases (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			title TEXT NOT NULL,
			summary TEXT NOT NULL,
			status TEXT NOT NULL,
			progress_percent INTEGER NOT NULL,
			client_name TEXT NOT NULL,
			lawyer_id INTEGER NOT NULL,
			created_at TEXT NOT NULL,
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

	return nil
}

func (s *Store) Seed(ctx context.Context) error {
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
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO lawyers (name, firm, specialty, city, email, phone, bio)
			VALUES (?, ?, ?, ?, ?, ?, ?)`,
			lawyer.Name, lawyer.Firm, lawyer.Specialty, lawyer.City, lawyer.Email, lawyer.Phone, lawyer.Bio,
		); err != nil {
			return err
		}
	}

	now := time.Now().UTC()
	caseResult, err := tx.ExecContext(ctx, `
		INSERT INTO cases (title, summary, status, progress_percent, client_name, lawyer_id, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)`,
		"Traffic citation review",
		"User asked whether a red-light violation requires court follow-up and uploaded the fine notice.",
		"Review in progress",
		55,
		"Sample Client",
		1,
		now.Format(timeLayout),
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
			SenderName: "Sample Client",
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

	faqSeeds := []models.FAQSuggestion{
		{Question: "Is running a red light illegal?", Category: "Traffic", Priority: 1},
		{Question: "What should I do after getting a store theft accusation?", Category: "Criminal", Priority: 2},
		{Question: "Can my employer cut my salary without notice?", Category: "Employment", Priority: 3},
		{Question: "How do I respond to a landlord dispute notice?", Category: "Housing", Priority: 4},
	}

	for _, faq := range faqSeeds {
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO faq_suggestions (question, category, priority)
			VALUES (?, ?, ?)`,
			faq.Question, faq.Category, faq.Priority,
		); err != nil {
			return err
		}
	}

	return tx.Commit()
}
