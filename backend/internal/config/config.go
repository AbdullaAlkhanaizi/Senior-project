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
	AuthSecret     string
	AdminName      string
	AdminEmail     string
	AdminPassword  string
	GeminiAPIKey   string
	GeminiBaseURL  string
	GeminiModel    string
	AIJurisdiction string
	AILawsDBPath   string
}

func Load() Config {
	port := strings.TrimSpace(os.Getenv("PORT"))
	addr := envOrDefault("ADDR", ":8080")
	if port != "" {
		addr = "0.0.0.0:" + port
	}

	return Config{
		Addr:           addr,
		FrontendOrigin: envOrDefault("FRONTEND_ORIGIN", "http://localhost:3000"),
		DatabasePath:   envOrDefault("DATABASE_PATH", "data/legal_consultant.db"),
		UploadDir:      envOrDefault("UPLOAD_DIR", "uploads"),
		AuthSecret:     envOrDefault("AUTH_SECRET", "local-dev-auth-secret"),
		AdminName:      envOrDefault("ADMIN_NAME", "Developer Admin"),
		AdminEmail:     envOrDefault("ADMIN_EMAIL", "admin@legal-portal.local"),
		AdminPassword:  envOrDefault("ADMIN_PASSWORD", "ChangeMe123!"),
		GeminiAPIKey:   strings.TrimSpace(os.Getenv("GEMINI_API_KEY")),
		GeminiBaseURL:  envOrDefault("GEMINI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta/openai"),
		GeminiModel:    envOrDefault("GEMINI_MODEL", "gemini-2.5-flash"),
		AIJurisdiction: envOrDefault("AI_JURISDICTION", "Bahrain"),
		AILawsDBPath:   envOrDefault("AI_LAWS_DB_PATH", "data/laws_db.json"),
	}
}

func envOrDefault(key, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	return value
}
