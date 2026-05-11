package httpapi

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"senior-project/backend/internal/ai"
	"senior-project/backend/internal/models"
)

const aiDisclaimer = "AI-generated legal information only. It is not a substitute for advice from a licensed lawyer reviewing your exact facts and documents."

func (s *Server) handleAIChat(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	var req models.AIChatRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json body")
		return
	}

	mode := normalizeAIMode(req.Mode)
	if mode == "" {
		writeError(w, http.StatusBadRequest, "mode must be ask, create, or analyze")
		return
	}

	messages, err := sanitizeAIMessages(req.Messages)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	reply, err := s.ai.Chat(r.Context(), ai.ChatRequest{
		SystemPrompt: buildAISystemPrompt(mode, req.Category, s.config.AIJurisdiction, s.buildAILawsContext(req.Category, messages)),
		Messages:     messages,
	})
	if err != nil {
		status := http.StatusBadGateway
		switch {
		case errors.Is(err, ai.ErrNotConfigured):
			status = http.StatusServiceUnavailable
		case strings.Contains(strings.ToLower(err.Error()), "empty response"):
			status = http.StatusBadGateway
		}
		writeError(w, status, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, models.AIChatResponse{
		Message: models.AIChatMessage{
			Role:    reply.Message.Role,
			Content: strings.TrimSpace(reply.Message.Content),
		},
		Model:            defaultString(reply.Model, s.ai.Model()),
		Disclaimer:       aiDisclaimer,
		SuggestedActions: suggestedActionsForMode(mode),
	})
}

func normalizeAIMode(mode string) string {
	switch strings.ToLower(strings.TrimSpace(mode)) {
	case "ask", "create", "analyze":
		return strings.ToLower(strings.TrimSpace(mode))
	default:
		return ""
	}
}

func sanitizeAIMessages(input []models.AIChatMessage) ([]ai.Message, error) {
	if len(input) == 0 {
		return nil, errors.New("at least one message is required")
	}

	messages := make([]ai.Message, 0, minInt(len(input), 12))
	for _, item := range input {
		role := strings.ToLower(strings.TrimSpace(item.Role))
		content := strings.TrimSpace(item.Content)
		if content == "" {
			continue
		}
		if role != "user" && role != "assistant" {
			return nil, errors.New("messages may only use user or assistant roles")
		}
		messages = append(messages, ai.Message{
			Role:    role,
			Content: content,
		})
	}

	if len(messages) == 0 {
		return nil, errors.New("at least one non-empty message is required")
	}
	if len(messages) > 12 {
		messages = messages[len(messages)-12:]
	}

	return messages, nil
}

func buildAISystemPrompt(mode, category, jurisdiction, lawsContext string) string {
	var builder strings.Builder

	builder.WriteString("You are a precise AI legal assistant. Assume the relevant jurisdiction is ")
	builder.WriteString(defaultString(strings.TrimSpace(jurisdiction), "Bahrain"))
	builder.WriteString(". ")

	// 1. Force the exact output structure requiring formal titles
	builder.WriteString("CRITICAL INSTRUCTION: You MUST answer the user's question in a single concise sentence following EXACTLY this structure:\n")
	builder.WriteString("[Yes/No], [briefly state what is allowed or prohibited], as per [Exact Formal Title of the Law/Decree and Article].\n\n")

	// 2. Enforce formal citations for both DB hits and fallbacks
	builder.WriteString("Strict Output Rules & Logic:\n")
	builder.WriteString("1. Start exactly with 'Yes,' or 'No,'.\n")
	builder.WriteString("2. First, check the BAHRAIN LAW KNOWLEDGE BASE below. If an excerpt answers the prompt, cite its exact 'Title:' field at the end.\n")
	builder.WriteString("3. FALLBACK RULE: If the provided excerpts are irrelevant or missing, use your general foundational knowledge of Bahrain law to answer correctly. When answering from general knowledge, you MUST cite the formal statute, Legislative Decree, or specific Article (e.g., 'Legislative Decree No. 23 of 2014 Promulgating the Traffic Law, Article 50') instead of a generic title.\n")
	builder.WriteString("4. Keep the middle explanation concise and under 15 words.\n")
	builder.WriteString("5. Absolutely NO introductory text, disclaimers, extra paragraphs, or bullet points.\n")

	if strings.TrimSpace(lawsContext) != "" {
		builder.WriteString("\n\n--- BAHRAIN LAW KNOWLEDGE BASE ---\n")
		builder.WriteString(lawsContext)
		builder.WriteString("\n----------------------------\n")
	}

	return builder.String()
}

func (s *Server) buildAILawsContext(category string, messages []ai.Message) string {
	if s == nil || s.laws == nil {
		return ""
	}

	searchTexts := make([]string, 0, len(messages))
	for _, message := range messages {
		if message.Role != "user" {
			continue
		}
		if content := strings.TrimSpace(message.Content); content != "" {
			searchTexts = append(searchTexts, content)
		}
	}

	return s.laws.RelevantContext(category, searchTexts, 4)
}

func suggestedActionsForMode(mode string) []string {
	switch mode {
	case "create":
		return []string{
			"Ask for a shorter client-ready version.",
			"Ask which placeholders must be filled before signing.",
			"Send the draft to a lawyer for jurisdiction-specific review.",
		}
	case "analyze":
		return []string{
			"Ask which clause creates the highest risk.",
			"Ask for proposed redline language.",
			"Escalate to a lawyer before signing or responding.",
		}
	default:
		return []string{
			"Ask a follow-up about deadlines or penalties.",
			"Paste a document or notice for analysis.",
			"Escalate to a lawyer if the facts are urgent or case-specific.",
		}
	}
}

func minInt(a, b int) int {
	if a < b {
		return a
	}
	return b
}
