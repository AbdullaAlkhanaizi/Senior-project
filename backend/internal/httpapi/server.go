package httpapi

import (
	"net/http"

	"senior-project/backend/internal/config"
	"senior-project/backend/internal/store"
)

type Server struct {
	store  *store.Store
	config config.Config
}

func NewServer(dataStore *store.Store, cfg config.Config) *Server {
	return &Server{store: dataStore, config: cfg}
}

func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("/api/health", s.handleHealth)
	mux.HandleFunc("/api/auth/login", s.handleLogin)
	mux.HandleFunc("/api/auth/signup", s.handleSignup)
	mux.HandleFunc("/api/auth/guest", s.handleGuest)
	mux.HandleFunc("/api/admin/lawyers", s.handleAdminLawyers)
	mux.HandleFunc("/api/dashboard", s.handleDashboard)
	mux.HandleFunc("/api/cases", s.handleCases)
	mux.HandleFunc("/api/cases/", s.handleCaseRoutes)
	mux.Handle("/uploads/", http.StripPrefix("/uploads/", http.FileServer(http.Dir(s.config.UploadDir))))

	return withCORS(mux, s.config.FrontendOrigin)
}
