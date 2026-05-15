package store

import (
	"context"
	"senior-project/backend/internal/models"
)

func (s *Store) GetAdminStats(ctx context.Context) (models.AdminStatsResponse, error) {
	var stats models.AdminStatsResponse

	// Total users
	err := s.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM users").Scan(&stats.TotalUsers)
	if err != nil {
		return stats, err
	}

	// Total lawyers
	err = s.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM lawyers").Scan(&stats.TotalLawyers)
	if err != nil {
		return stats, err
	}

	// Total cases
	err = s.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM cases").Scan(&stats.TotalCases)
	if err != nil {
		return stats, err
	}

	// Active cases (decision_status = 'accepted' or 'pending')
	err = s.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM cases WHERE decision_status IN ('accepted', 'pending')").Scan(&stats.ActiveCases)
	if err != nil {
		return stats, err
	}

	// Completed cases (decision_status = 'completed')
	err = s.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM cases WHERE decision_status = 'completed'").Scan(&stats.CompletedCases)
	if err != nil {
		return stats, err
	}

	// Lawyer stats (completed cases breakdown)
	rows, err := s.db.QueryContext(ctx, `
		SELECT 
			l.id, 
			l.name,
			COUNT(c.id) as total_completed,
			SUM(CASE WHEN LOWER(c.outcome) = 'won' THEN 1 ELSE 0 END) as won,
			SUM(CASE WHEN LOWER(c.outcome) = 'lost' THEN 1 ELSE 0 END) as lost,
			SUM(CASE WHEN LOWER(c.outcome) NOT IN ('won', 'lost') THEN 1 ELSE 0 END) as not_decided
		FROM cases c
		JOIN lawyers l ON c.lawyer_id = l.id
		WHERE c.decision_status = 'completed'
		GROUP BY l.id, l.name
	`)
	if err != nil {
		return stats, err
	}
	defer rows.Close()

	var lawyerStats []models.LawyerCompletedStats
	for rows.Next() {
		var ls models.LawyerCompletedStats
		if err := rows.Scan(&ls.LawyerID, &ls.LawyerName, &ls.TotalCompleted, &ls.Won, &ls.Lost, &ls.NotDecided); err != nil {
			return stats, err
		}
		lawyerStats = append(lawyerStats, ls)
	}
	
	if lawyerStats == nil {
		lawyerStats = []models.LawyerCompletedStats{}
	}
	stats.LawyerStats = lawyerStats

	return stats, nil
}

func (s *Store) GetAdminUsers(ctx context.Context) ([]models.AdminUser, error) {
	rows, err := s.db.QueryContext(ctx, "SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []models.AdminUser
	for rows.Next() {
		var u models.AdminUser
		if err := rows.Scan(&u.ID, &u.Name, &u.Email, &u.Role, &u.CreatedAt); err != nil {
			return nil, err
		}
		users = append(users, u)
	}
	
	if users == nil {
		users = []models.AdminUser{}
	}

	return users, rows.Err()
}
