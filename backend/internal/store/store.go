package store

import "database/sql"

const timeLayout = "2006-01-02T15:04:05Z07:00"

type Store struct {
	db            *sql.DB
	uploadDir     string
	adminName     string
	adminEmail    string
	adminPassword string
}

func New(db *sql.DB, uploadDir, adminName, adminEmail, adminPassword string) *Store {
	return &Store{
		db:            db,
		uploadDir:     uploadDir,
		adminName:     adminName,
		adminEmail:    adminEmail,
		adminPassword: adminPassword,
	}
}
