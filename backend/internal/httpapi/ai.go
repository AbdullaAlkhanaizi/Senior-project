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

	builder.WriteString("You are an AI legal intake assistant for a legal consultant platform. ")
	builder.WriteString("Provide practical, careful, general legal information and drafting help, but never claim to be a licensed lawyer or say your answer is final legal advice. ")
	builder.WriteString("Assume the relevant jurisdiction is ")
	builder.WriteString(defaultString(strings.TrimSpace(jurisdiction), "Bahrain"))
	builder.WriteString(" unless the user clearly says otherwise. ")
	if strings.TrimSpace(category) != "" {
		builder.WriteString("The current issue category is ")
		builder.WriteString(strings.TrimSpace(category))
		builder.WriteString(". ")
	}

	switch mode {
	case "create":
		builder.WriteString("The user wants help creating a legal document. Draft a practical first version with clear placeholders, assumptions, and sections that need lawyer review. ")
	case "analyze":
		builder.WriteString("The user wants help analyzing a legal document or clause. Highlight risks, ambiguities, missing protections, deadlines, and follow-up questions. ")
	default:
		builder.WriteString("The user wants guidance on a legal question. Explain the likely rule, penalties, risks, and common next steps in plain language. ")
	}

	builder.WriteString("When Bahrain law excerpts are provided from the legal knowledge base, use them as the primary source for your answer. ")
	builder.WriteString("Do not invent statutes, article numbers, penalties, or procedures that are not supported by the provided excerpts. ")
	builder.WriteString("If the knowledge base does not clearly answer the question, say that explicitly and explain what is missing. ")
	builder.WriteString("When facts are missing, say what is unclear and ask targeted follow-up questions. ")
	builder.WriteString("If the issue involves urgent deadlines, criminal exposure, violence, child safety, immigration, or major financial risk, urge the user to contact a licensed local lawyer immediately. ")
	builder.WriteString("Keep the answer structured with short headings: Summary, Key Points, Next Steps. ")
	builder.WriteString("End with a short reminder that the answer is informational and should be reviewed by a licensed lawyer for case-specific action.")

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
