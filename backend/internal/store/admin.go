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

	if err := s.db.QueryRowContext(ctx, `
		SELECT
			COUNT(*),
			COALESCE(SUM(CASE WHEN case_id IS NOT NULL THEN 1 ELSE 0 END), 0),
			COUNT(DISTINCT CASE WHEN user_id IS NOT NULL THEN user_id END),
			COALESCE(SUM(prompt_tokens), 0),
			COALESCE(SUM(completion_tokens), 0),
			COALESCE(SUM(total_tokens), 0),
			COALESCE(SUM(estimated_cost_usd), 0)
		FROM ai_usage_logs`,
	).Scan(
		&stats.AIUsage.TotalRequests,
		&stats.AIUsage.CaseLinkedRequests,
		&stats.AIUsage.TrackedUsers,
		&stats.AIUsage.PromptTokens,
		&stats.AIUsage.CompletionTokens,
		&stats.AIUsage.TotalTokens,
		&stats.AIUsage.EstimatedCostUSD,
	); err != nil {
		return stats, err
	}
	if stats.AIUsage.TotalRequests > 0 {
		stats.AIUsage.AverageCostPerRequest = stats.AIUsage.EstimatedCostUSD / float64(stats.AIUsage.TotalRequests)
	}

	userRows, err := s.db.QueryContext(ctx, `
		SELECT
			COALESCE(user_id, 0),
			CASE
				WHEN TRIM(COALESCE(user_name, '')) = '' THEN 'Unknown User'
				ELSE user_name
			END,
			CASE
				WHEN TRIM(COALESCE(user_role, '')) = '' THEN 'guest'
				ELSE user_role
			END,
			COUNT(*) AS request_count,
			COALESCE(SUM(prompt_tokens), 0) AS prompt_tokens,
			COALESCE(SUM(completion_tokens), 0) AS completion_tokens,
			COALESCE(SUM(total_tokens), 0) AS total_tokens,
			COALESCE(SUM(estimated_cost_usd), 0) AS estimated_cost_usd,
			MAX(created_at)
		FROM ai_usage_logs
		GROUP BY COALESCE(user_id, 0), user_name, user_role
		ORDER BY estimated_cost_usd DESC, total_tokens DESC, request_count DESC`)
	if err != nil {
		return stats, err
	}
	defer userRows.Close()

	var aiUsageByUser []models.AIUsageByUserStats
	for userRows.Next() {
		var item models.AIUsageByUserStats
		if err := userRows.Scan(
			&item.UserID,
			&item.UserName,
			&item.UserRole,
			&item.RequestCount,
			&item.PromptTokens,
			&item.CompletionTokens,
			&item.TotalTokens,
			&item.EstimatedCostUSD,
			&item.LastUsedAt,
		); err != nil {
			return stats, err
		}
		aiUsageByUser = append(aiUsageByUser, item)
	}
	if err := userRows.Err(); err != nil {
		return stats, err
	}
	if aiUsageByUser == nil {
		aiUsageByUser = []models.AIUsageByUserStats{}
	}
	stats.AIUsageByUser = aiUsageByUser

	caseRows, err := s.db.QueryContext(ctx, `
		SELECT
			log.case_id,
			COALESCE(c.title, 'Deleted Case'),
			COALESCE(c.client_name, ''),
			COALESCE(l.name, ''),
			COUNT(*) AS request_count,
			COALESCE(SUM(log.prompt_tokens), 0) AS prompt_tokens,
			COALESCE(SUM(log.completion_tokens), 0) AS completion_tokens,
			COALESCE(SUM(log.total_tokens), 0) AS total_tokens,
			COALESCE(SUM(log.estimated_cost_usd), 0) AS estimated_cost_usd,
			MAX(log.created_at)
		FROM ai_usage_logs log
		LEFT JOIN cases c ON c.id = log.case_id
		LEFT JOIN lawyers l ON l.id = c.lawyer_id
		WHERE log.case_id IS NOT NULL
		GROUP BY log.case_id, c.title, c.client_name, l.name
		ORDER BY estimated_cost_usd DESC, total_tokens DESC, request_count DESC`)
	if err != nil {
		return stats, err
	}
	defer caseRows.Close()

	var aiUsageByCase []models.AIUsageByCaseStats
	for caseRows.Next() {
		var item models.AIUsageByCaseStats
		if err := caseRows.Scan(
			&item.CaseID,
			&item.CaseTitle,
			&item.ClientName,
			&item.LawyerName,
			&item.RequestCount,
			&item.PromptTokens,
			&item.CompletionTokens,
			&item.TotalTokens,
			&item.EstimatedCostUSD,
			&item.LastUsedAt,
		); err != nil {
			return stats, err
		}
		aiUsageByCase = append(aiUsageByCase, item)
	}
	if err := caseRows.Err(); err != nil {
		return stats, err
	}
	if aiUsageByCase == nil {
		aiUsageByCase = []models.AIUsageByCaseStats{}
	}
	stats.AIUsageByCase = aiUsageByCase

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
