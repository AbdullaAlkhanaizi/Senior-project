package store

import "database/sql"

type Store struct {
	db        *sql.DB
	uploadDir string
}

func New(db *sql.DB, uploadDir string) *Store {
	return &Store{db: db, uploadDir: uploadDir}
}
