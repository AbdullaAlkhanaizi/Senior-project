package store

import (
	"context"
	"database/sql"
	"errors"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"

	"senior-project/backend/internal/models"
)

var (
	ErrUserExists         = errors.New("user already exists")
	ErrInvalidCredentials = errors.New("invalid email or password")
)

type dbRunner interface {
	ExecContext(context.Context, string, ...any) (sql.Result, error)
	QueryRowContext(context.Context, string, ...any) *sql.Row
}

func (s *Store) CreateClient(ctx context.Context, req models.SignupRequest) (models.AuthResponse, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return models.AuthResponse{}, err
	}
	defer tx.Rollback()

	id, err := createUserAccount(ctx, tx, req.Name, req.Email, req.Password, models.RoleClient)
	if err != nil {
		return models.AuthResponse{}, err
	}

	user, err := loadAuthUserByID(ctx, tx, id)
	if err != nil {
		return models.AuthResponse{}, err
	}

	if err := tx.Commit(); err != nil {
		return models.AuthResponse{}, err
	}

	return user, nil
}

func (s *Store) CreateLawyerAccount(ctx context.Context, req models.CreateLawyerAccountRequest) (models.Lawyer, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return models.Lawyer{}, err
	}
	defer tx.Rollback()

	userID, err := createUserAccount(ctx, tx, req.Name, req.Email, req.Password, models.RoleLawyer)
	if err != nil {
		return models.Lawyer{}, err
	}

	now := time.Now().UTC().Format(timeLayout)
	result, err := tx.ExecContext(ctx, `
		INSERT INTO lawyers (user_id, name, firm, specialty, city, email, phone, bio, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		userID,
		strings.TrimSpace(req.Name),
		strings.TrimSpace(req.Firm),
		strings.TrimSpace(req.Specialty),
		strings.TrimSpace(req.City),
		normalizeEmail(req.Email),
		strings.TrimSpace(req.Phone),
		strings.TrimSpace(req.Bio),
		now,
	)
	if err != nil {
		return models.Lawyer{}, err
	}

	lawyerID, err := result.LastInsertId()
	if err != nil {
		return models.Lawyer{}, err
	}

	if err := tx.Commit(); err != nil {
		return models.Lawyer{}, err
	}

	return models.Lawyer{
		ID:        lawyerID,
		UserID:    userID,
		Name:      strings.TrimSpace(req.Name),
		Firm:      strings.TrimSpace(req.Firm),
		Specialty: strings.TrimSpace(req.Specialty),
		City:      strings.TrimSpace(req.City),
		Email:     normalizeEmail(req.Email),
		Phone:     strings.TrimSpace(req.Phone),
		Bio:       strings.TrimSpace(req.Bio),
	}, nil
}

func (s *Store) AuthenticateUser(ctx context.Context, req models.LoginRequest) (models.AuthResponse, error) {
	var user models.AuthResponse
	var passwordHash string

	err := s.db.QueryRowContext(ctx, `
		SELECT u.id, u.name, u.email, u.role, u.password_hash, COALESCE(l.id, 0)
		FROM users u
		LEFT JOIN lawyers l ON l.user_id = u.id
		WHERE u.email = ?`,
		normalizeEmail(req.Email),
	).Scan(&user.ID, &user.Name, &user.Email, &user.Role, &passwordHash, &user.LawyerID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return models.AuthResponse{}, ErrInvalidCredentials
		}
		return models.AuthResponse{}, err
	}

	if err := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(req.Password)); err != nil {
		return models.AuthResponse{}, ErrInvalidCredentials
	}

	user.Mode = user.Role
	return user, nil
}

func (s *Store) CreateGuest(req models.GuestRequest) models.AuthResponse {
	name := defaultString(req.Name, "Guest User")
	return models.AuthResponse{
		ID:    0,
		Name:  name,
		Email: "",
		Role:  models.RoleGuest,
		Mode:  models.RoleGuest,
	}
}

func (s *Store) EnsureUserAccount(ctx context.Context, name, email, password, role string) (models.AuthResponse, error) {
	return ensureUserAccount(ctx, s.db, name, email, password, role)
}

func ensureUserAccount(ctx context.Context, runner dbRunner, name, email, password, role string) (models.AuthResponse, error) {
	email = normalizeEmail(email)
	role = normalizeRole(role)

	var existingID int64
	err := runner.QueryRowContext(ctx, `SELECT id FROM users WHERE email = ?`, email).Scan(&existingID)
	switch {
	case err == nil:
		if _, updateErr := runner.ExecContext(ctx, `
			UPDATE users
			SET name = ?, role = ?
			WHERE id = ?`,
			strings.TrimSpace(name), role, existingID,
		); updateErr != nil {
			return models.AuthResponse{}, updateErr
		}
		return loadAuthUserByID(ctx, runner, existingID)
	case errors.Is(err, sql.ErrNoRows):
		id, createErr := createUserAccount(ctx, runner, name, email, password, role)
		if createErr != nil {
			return models.AuthResponse{}, createErr
		}
		return loadAuthUserByID(ctx, runner, id)
	default:
		return models.AuthResponse{}, err
	}
}

func createUserAccount(ctx context.Context, runner dbRunner, name, email, password, role string) (int64, error) {
	email = normalizeEmail(email)
	role = normalizeRole(role)

	var existing int
	if err := runner.QueryRowContext(ctx, `SELECT COUNT(*) FROM users WHERE email = ?`, email).Scan(&existing); err != nil {
		return 0, err
	}
	if existing > 0 {
		return 0, ErrUserExists
	}

	hash, err := hashPassword(password)
	if err != nil {
		return 0, err
	}

	now := time.Now().UTC().Format(timeLayout)
	result, err := runner.ExecContext(ctx, `
		INSERT INTO users (name, email, password_hash, role, created_at)
		VALUES (?, ?, ?, ?, ?)`,
		strings.TrimSpace(name), email, hash, role, now,
	)
	if err != nil {
		return 0, err
	}

	return result.LastInsertId()
}

func loadAuthUserByID(ctx context.Context, runner dbRunner, userID int64) (models.AuthResponse, error) {
	var user models.AuthResponse
	err := runner.QueryRowContext(ctx, `
		SELECT u.id, u.name, u.email, u.role, COALESCE(l.id, 0)
		FROM users u
		LEFT JOIN lawyers l ON l.user_id = u.id
		WHERE u.id = ?`,
		userID,
	).Scan(&user.ID, &user.Name, &user.Email, &user.Role, &user.LawyerID)
	if err != nil {
		return models.AuthResponse{}, err
	}
	user.Mode = user.Role
	return user, nil
}

func hashPassword(password string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(hash), nil
}

func normalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

func normalizeRole(role string) string {
	switch strings.TrimSpace(role) {
	case models.RoleAdmin:
		return models.RoleAdmin
	case models.RoleLawyer:
		return models.RoleLawyer
	default:
		return models.RoleClient
	}
}

func defaultString(value, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return strings.TrimSpace(value)
}
