package store

import (
	"context"
	"fmt"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"
	"time"

	"senior-project/backend/internal/models"
)

func (s *Store) CreateAttachmentMessage(ctx context.Context, caseID int64, senderType, senderName, body string, header *multipart.FileHeader, file multipart.File) (models.Message, error) {
	savedPath, err := saveUploadedFile(s.uploadDir, header, file)
	if err != nil {
		return models.Message{}, err
	}

	now := time.Now().UTC().Format(timeLayout)
	result, err := s.db.ExecContext(ctx, `
		INSERT INTO messages (case_id, sender_type, sender_name, body, attachment_name, attachment_path, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)`,
		caseID,
		defaultString(senderType, "client"),
		defaultString(senderName, "Client"),
		defaultString(body, "File uploaded for review"),
		header.Filename,
		savedPath,
		now,
	)
	if err != nil {
		return models.Message{}, err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return models.Message{}, err
	}

	return models.Message{
		ID:             id,
		CaseID:         caseID,
		SenderType:     defaultString(senderType, "client"),
		SenderName:     defaultString(senderName, "Client"),
		Body:           defaultString(body, "File uploaded for review"),
		AttachmentName: header.Filename,
		AttachmentURL:  "/uploads/" + filepath.Base(savedPath),
		CreatedAt:      now,
	}, nil
}

func saveUploadedFile(uploadDir string, header *multipart.FileHeader, file multipart.File) (string, error) {
	ext := filepath.Ext(header.Filename)
	name := strings.TrimSuffix(filepath.Base(header.Filename), ext)
	safeName := slugify(name)
	if safeName == "" {
		safeName = "attachment"
	}

	filename := fmt.Sprintf("%d-%s%s", time.Now().UnixNano(), safeName, ext)
	path := filepath.Join(uploadDir, filename)

	dst, err := os.Create(path)
	if err != nil {
		return "", err
	}
	defer dst.Close()

	if _, err := dst.ReadFrom(file); err != nil {
		return "", err
	}

	return path, nil
}

func slugify(input string) string {
	input = strings.ToLower(strings.TrimSpace(input))
	var builder strings.Builder
	lastDash := false

	for _, r := range input {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			builder.WriteRune(r)
			lastDash = false
			continue
		}
		if !lastDash {
			builder.WriteRune('-')
			lastDash = true
		}
	}

	return strings.Trim(builder.String(), "-")
}
