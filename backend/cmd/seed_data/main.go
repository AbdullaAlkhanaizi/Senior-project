package main

import (
	"context"
	"database/sql"
	"log"
	"math/rand"
	"time"

	"senior-project/backend/internal/config"
	"senior-project/backend/internal/database"
)

var localNames = []string{
	"Ahmed Al-Farsi",
	"Fatima Al-Sayed",
	"Omar Khalid",
	"Sara Al-Najjar",
	"Faisal Abdullah",
	"Noura Salem",
	"Ali Hassan",
	"Reem Al-Dosari",
	"Khalid Youssef",
	"Layla Ibrahim",
}

func randomName() string {
	return localNames[rand.Intn(len(localNames))]
}

func main() {
	ctx := context.Background()
	cfg := config.Load()
	db, err := database.Open(ctx, cfg.DatabasePath)
	if err != nil {
		log.Fatalf("open database: %v", err)
	}
	defer db.Close()

	// Ensure we have at least one client user in the system to attach cases to
	var clientUserID int64
	err = db.QueryRowContext(ctx, `SELECT id FROM users WHERE role = 'client' LIMIT 1`).Scan(&clientUserID)
	if err == sql.ErrNoRows {
		log.Println("No client user found. Creating a generic client user...")
		now := time.Now().UTC().Format(time.RFC3339)
		res, err := db.ExecContext(ctx, `INSERT INTO users (name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)`,
			"Generic Client", "client@example.com", "hash", "client", now)
		if err != nil {
			log.Fatalf("create generic client: %v", err)
		}
		clientUserID, _ = res.LastInsertId()
	} else if err != nil {
		log.Fatalf("query client user: %v", err)
	}

	// Fetch all lawyers
	rows, err := db.QueryContext(ctx, `SELECT id, name FROM lawyers`)
	if err != nil {
		log.Fatalf("query lawyers: %v", err)
	}
	defer rows.Close()

	type Lawyer struct {
		ID   int64
		Name string
	}
	var lawyers []Lawyer
	for rows.Next() {
		var l Lawyer
		if err := rows.Scan(&l.ID, &l.Name); err != nil {
			log.Fatalf("scan lawyer: %v", err)
		}
		lawyers = append(lawyers, l)
	}
	if err := rows.Err(); err != nil {
		log.Fatalf("rows err: %v", err)
	}

	for _, lawyer := range lawyers {
		log.Printf("Seeding data for lawyer: %s", lawyer.Name)

		seedCase(ctx, db, lawyer.ID, clientUserID, "pending")
		seedCase(ctx, db, lawyer.ID, clientUserID, "accepted")
		seedCase(ctx, db, lawyer.ID, clientUserID, "completed")
		seedCase(ctx, db, lawyer.ID, clientUserID, "declined")

		// Also add a couple of reviews if they don't have them
		seedReview(ctx, db, lawyer.ID, clientUserID)
		seedReview(ctx, db, lawyer.ID, clientUserID)
	}

	log.Println("Successfully seeded cases and reviews.")
}

func seedCase(ctx context.Context, db *sql.DB, lawyerID, clientUserID int64, decisionStatus string) {
	now := time.Now().UTC().Format(time.RFC3339)
	clientName := randomName()

	var title, summary, status string
	progressPercent := 0
	
	switch decisionStatus {
	case "pending":
		title = "Legal consultation request"
		summary = "I need advice regarding a commercial contract dispute with a supplier."
		status = "Pending lawyer review"
	case "accepted":
		title = "Property inheritance issue"
		summary = "Seeking representation for an inheritance claim involving multiple properties."
		status = "Accepted by lawyer"
		progressPercent = 50
	case "completed":
		title = "Business incorporation"
		summary = "Looking to register a new LLC and draft the initial shareholder agreements."
		status = "Case completed"
		progressPercent = 100
	case "declined":
		title = "Traffic violation dispute"
		summary = "I need help disputing a minor traffic citation."
		status = "Declined"
	}

	res, err := db.ExecContext(ctx, `
		INSERT INTO cases (
			title, summary, status, decision_status, decision_note, progress_percent, 
			client_name, client_user_id, lawyer_id, created_at, responded_at, outcome
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, title, summary, status, decisionStatus, "Standard system note.", progressPercent, clientName, clientUserID, lawyerID, now, now, "Not decided")
	if err != nil {
		log.Fatalf("insert case: %v", err)
	}

	caseID, _ := res.LastInsertId()

	// Seed timeline
	seedTimeline(ctx, db, caseID, decisionStatus, now)

	// Seed one message
	db.ExecContext(ctx, `
		INSERT INTO messages (case_id, sender_type, sender_name, body, attachment_name, attachment_path, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)`,
		caseID, "client", clientName, "Hello, please review my case details attached.", "", "", now,
	)
}

func seedTimeline(ctx context.Context, db *sql.DB, caseID int64, decisionStatus string, now string) {
	steps := []struct {
		Label string
		State string
		Order int
	}{
		{"Case request submitted", "completed", 1},
		{"Lawyer review", "current", 2},
		{"Private consultation", "upcoming", 3},
		{"Legal action / drafting", "upcoming", 4},
		{"Case resolution", "upcoming", 5},
	}

	if decisionStatus == "accepted" {
		steps[1].State = "completed"
		steps[2].State = "current"
	} else if decisionStatus == "completed" {
		for i := range steps {
			steps[i].State = "completed"
		}
	} else if decisionStatus == "declined" {
		steps[1].State = "completed"
		steps[2].State = "upcoming"
		steps[3].State = "upcoming"
		steps[4].State = "upcoming"
	}

	for _, step := range steps {
		db.ExecContext(ctx, `
			INSERT INTO case_updates (case_id, label, state, sort_order, created_at)
			VALUES (?, ?, ?, ?, ?)`,
			caseID, step.Label, step.State, step.Order, now,
		)
	}
}

func seedReview(ctx context.Context, db *sql.DB, lawyerID, clientUserID int64) {
	now := time.Now().UTC().Format(time.RFC3339)
	
	titles := []string{"Excellent service", "Very professional", "Highly recommended", "Good communication", "Helped me greatly"}
	bodies := []string{
		"The lawyer was very helpful and responsive throughout the entire process.",
		"I appreciated the clear explanations and timely updates on my case.",
		"Great attention to detail and secured a favorable outcome.",
		"Professional approach, though it took slightly longer than expected.",
		"Very knowledgeable in this area of law. Would hire again.",
	}
	
	title := titles[rand.Intn(len(titles))]
	body := bodies[rand.Intn(len(bodies))]
	rating := rand.Intn(2) + 4 // 4 or 5 stars
	
	db.ExecContext(ctx, `
		INSERT INTO reviews (user_id, lawyer_id, title, body, rating, created_at)
		VALUES (?, ?, ?, ?, ?, ?)`,
		clientUserID, lawyerID, title, body, rating, now,
	)
}
