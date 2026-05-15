package store

import (
	"context"

	"senior-project/backend/internal/models"
)

func (s *Store) CreateAIUsageLog(ctx context.Context, entry models.AIUsageLog) error {
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO ai_usage_logs (
			user_id,
			user_name,
			user_role,
			case_id,
			model,
			mode,
			category,
			prompt_tokens,
			completion_tokens,
			total_tokens,
			estimated_cost_usd,
			created_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		nullableInt64(entry.UserID),
		entry.UserName,
		entry.UserRole,
		nullableInt64(entry.CaseID),
		entry.Model,
		entry.Mode,
		entry.Category,
		entry.PromptTokens,
		entry.CompletionTokens,
		entry.TotalTokens,
		entry.EstimatedCostUSD,
		entry.CreatedAt,
	)
	return err
}

func nullableInt64(value int64) any {
	if value == 0 {
		return nil
	}
	return value
}
