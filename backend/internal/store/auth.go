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

func (s *Store) CreateUser(ctx context.Context, req models.SignupRequest) (models.AuthResponse, error) {
	var existing int
	if err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM users WHERE email = ?`, req.Email).Scan(&existing); err != nil {
		return models.AuthResponse{}, err
	}
	if existing > 0 {
		return models.AuthResponse{}, ErrUserExists
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return models.AuthResponse{}, err
	}

	now := time.Now().UTC().Format(timeLayout)
	result, err := s.db.ExecContext(ctx, `
		INSERT INTO users (name, email, password_hash, created_at)
		VALUES (?, ?, ?, ?)`,
		req.Name, req.Email, string(hash), now,
	)
	if err != nil {
		return models.AuthResponse{}, err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return models.AuthResponse{}, err
	}

	return models.AuthResponse{
		ID:    id,
		Name:  req.Name,
		Email: req.Email,
		Mode:  "member",
	}, nil
}

func (s *Store) AuthenticateUser(ctx context.Context, req models.LoginRequest) (models.AuthResponse, error) {
	var id int64
	var name string
	var email string
	var passwordHash string

	err := s.db.QueryRowContext(ctx, `
		SELECT id, name, email, password_hash
		FROM users
		WHERE email = ?`, req.Email).Scan(&id, &name, &email, &passwordHash)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return models.AuthResponse{}, ErrInvalidCredentials
		}
		return models.AuthResponse{}, err
	}

	if err := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(req.Password)); err != nil {
		return models.AuthResponse{}, ErrInvalidCredentials
	}

	return models.AuthResponse{
		ID:    id,
		Name:  name,
		Email: email,
		Mode:  "member",
	}, nil
}

func (s *Store) CreateGuest(req models.GuestRequest) models.AuthResponse {
	name := defaultString(req.Name, "Guest User")
	return models.AuthResponse{
		ID:    0,
		Name:  name,
		Email: "",
		Mode:  "guest",
	}
}

func defaultString(value, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return value
}
