package config

import (
	"os"
	"strings"
)

type Config struct {
	Addr           string
	FrontendOrigin string
	DatabasePath   string
	UploadDir      string
}

func Load() Config {
	return Config{
		Addr:           envOrDefault("ADDR", ":8080"),
		FrontendOrigin: envOrDefault("FRONTEND_ORIGIN", "http://localhost:3000"),
		DatabasePath:   envOrDefault("DATABASE_PATH", "data/legal_consultant.db"),
		UploadDir:      envOrDefault("UPLOAD_DIR", "uploads"),
	}
}

func envOrDefault(key, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	return value
}
