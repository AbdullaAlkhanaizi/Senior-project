package store

import (
	"context"
	"errors"
	"time"

	"senior-project/backend/internal/models"
)

// CreateReview creates a new review if the user has a completed case with the lawyer.
func (s *Store) CreateReview(ctx context.Context, userID int64, req models.CreateReviewRequest) (models.Review, error) {
	// Check if user has a completed case with this lawyer
	var count int
	err := s.db.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM cases 
		WHERE client_user_id = ? AND lawyer_id = ? AND decision_status = 'completed'`,
		userID, req.LawyerID).Scan(&count)
	if err != nil {
		return models.Review{}, err
	}
	if count == 0 {
		return models.Review{}, errors.New("you can only review a lawyer if you have a completed case with them")
	}

	now := time.Now().UTC().Format(timeLayout)

	res, err := s.db.ExecContext(ctx, `
		INSERT INTO reviews (user_id, lawyer_id, title, body, rating, created_at)
		VALUES (?, ?, ?, ?, ?, ?)`,
		userID, req.LawyerID, req.Title, req.Body, req.Rating, now)
	if err != nil {
		return models.Review{}, err
	}

	id, err := res.LastInsertId()
	if err != nil {
		return models.Review{}, err
	}

	var review models.Review
	err = s.db.QueryRowContext(ctx, `
		SELECT r.id, r.user_id, u.name, r.lawyer_id, l.name, r.title, r.body, r.rating, r.created_at
		FROM reviews r
		JOIN users u ON r.user_id = u.id
		JOIN lawyers l ON r.lawyer_id = l.id
		WHERE r.id = ?`, id).Scan(
		&review.ID, &review.UserID, &review.UserName, &review.LawyerID, &review.LawyerName,
		&review.Title, &review.Body, &review.Rating, &review.CreatedAt,
	)
	return review, err
}

func (s *Store) GetReviews(ctx context.Context) ([]models.Review, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT r.id, r.user_id, u.name, r.lawyer_id, l.name, r.title, r.body, r.rating, r.created_at
		FROM reviews r
		JOIN users u ON r.user_id = u.id
		JOIN lawyers l ON r.lawyer_id = l.id
		ORDER BY r.created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var reviews []models.Review
	for rows.Next() {
		var r models.Review
		if err := rows.Scan(&r.ID, &r.UserID, &r.UserName, &r.LawyerID, &r.LawyerName, &r.Title, &r.Body, &r.Rating, &r.CreatedAt); err != nil {
			return nil, err
		}
		reviews = append(reviews, r)
	}
	
	if reviews == nil {
		reviews = []models.Review{}
	}
	
	return reviews, rows.Err()
}
