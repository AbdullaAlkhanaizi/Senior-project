package main

import (
	"context"
	"log"
	"net/http"

	"senior-project/backend/internal/config"
	"senior-project/backend/internal/database"
	"senior-project/backend/internal/httpapi"
	"senior-project/backend/internal/store"
)

func main() {
	ctx := context.Background()
	cfg := config.Load()

	db, err := database.Open(ctx, cfg.DatabasePath)
	if err != nil {
		log.Fatalf("open database: %v", err)
	}
	defer db.Close()

	dataStore := store.New(db, cfg.UploadDir)
	if err := dataStore.Migrate(ctx); err != nil {
		log.Fatalf("migrate database: %v", err)
	}
	if err := dataStore.Seed(ctx); err != nil {
		log.Fatalf("seed database: %v", err)
	}

	server := httpapi.NewServer(dataStore, cfg)

	log.Printf("backend listening on %s", cfg.Addr)
	if err := http.ListenAndServe(cfg.Addr, server.Handler()); err != nil {
		log.Fatalf("serve http: %v", err)
	}
}
