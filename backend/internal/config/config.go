package config

import (
	"os"
	"strings"
)

type Config struct {
	Addr            string
	FrontendOrigin  string
	DatabasePath    string
	UploadDir       string
	AuthSecret      string
	AdminName       string
	AdminEmail      string
	AdminPassword   string
	DeepSeekAPIKey  string
	DeepSeekBaseURL string
	DeepSeekModel   string
	AIJurisdiction  string
}

func Load() Config {
	return Config{
		Addr:            envOrDefault("ADDR", ":8080"),
		FrontendOrigin:  envOrDefault("FRONTEND_ORIGIN", "http://localhost:3000"),
		DatabasePath:    envOrDefault("DATABASE_PATH", "data/legal_consultant.db"),
		UploadDir:       envOrDefault("UPLOAD_DIR", "uploads"),
		AuthSecret:      envOrDefault("AUTH_SECRET", "local-dev-auth-secret"),
		AdminName:       envOrDefault("ADMIN_NAME", "Developer Admin"),
		AdminEmail:      envOrDefault("ADMIN_EMAIL", "admin@legal-portal.local"),
		AdminPassword:   envOrDefault("ADMIN_PASSWORD", "ChangeMe123!"),
		DeepSeekAPIKey:  strings.TrimSpace(os.Getenv("DEEPSEEK_API_KEY")),
		DeepSeekBaseURL: envOrDefault("DEEPSEEK_BASE_URL", "https://api.deepseek.com"),
		DeepSeekModel:   envOrDefault("DEEPSEEK_MODEL", "deepseek-v4-flash"),
		AIJurisdiction:  envOrDefault("AI_JURISDICTION", "Bahrain"),
	}
}

func envOrDefault(key, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	return value
}
