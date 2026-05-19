package httpapi

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strings"
	"time"

	"senior-project/backend/internal/ai"
	"senior-project/backend/internal/models"
)

const aiDisclaimer = "AI-generated legal information only. It is not a substitute for advice from a licensed lawyer reviewing your exact facts and documents."
const aiUsageTimeLayout = "2006-01-02T15:04:05Z07:00"

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

	current, err := s.viewerFromRequest(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	mode := normalizeAIMode(req.Mode)
	if mode == "" {
		writeError(w, http.StatusBadRequest, "mode must be ask, create, or analyze")
		return
	}

	if req.CaseID != 0 {
		if current == nil || current.Role == models.RoleGuest {
			writeError(w, http.StatusUnauthorized, "sign in to link AI usage to a case")
			return
		}
		allowed, err := s.store.CanAccessCase(r.Context(), req.CaseID, current.Role, current.ID, current.LawyerID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		if !allowed {
			writeError(w, http.StatusForbidden, "you do not have access to this case")
			return
		}
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

	if logErr := s.store.CreateAIUsageLog(r.Context(), models.AIUsageLog{
		UserID:           viewerID(current),
		UserName:         viewerName(current),
		UserRole:         viewerRole(current),
		CaseID:           req.CaseID,
		Model:            defaultString(reply.Model, s.ai.Model()),
		Mode:             mode,
		Category:         strings.TrimSpace(req.Category),
		PromptTokens:     reply.Usage.PromptTokens,
		CompletionTokens: reply.Usage.CompletionTokens,
		TotalTokens:      reply.Usage.TotalTokens,
		EstimatedCostUSD: estimateAICostUSD(reply.Usage, s.config.AIInputCostPerM, s.config.AIOutputCostPerM),
		CreatedAt:        time.Now().UTC().Format(aiUsageTimeLayout),
	}); logErr != nil {
		log.Printf("warning: unable to write ai usage log: %v", logErr)
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

	builder.WriteString("CRITICAL INSTRUCTION: You must first classify the user's request as either SIMPLE-DIRECT, COMPLEX-UNCERTAIN, or NON-LEGAL.\n")
	builder.WriteString("A request is SIMPLE-DIRECT only if it asks a narrow legal yes/no question and the answer is directly allowed or forbidden by a clear rule you know with high confidence.\n")
	builder.WriteString("A request is COMPLEX-UNCERTAIN if it is fact-specific, document-specific, procedural, strategic, exception-heavy, penalty-sensitive, depends on missing facts, or cannot be answered with very high confidence from a clear rule.\n\n")
	builder.WriteString("A request is NON-LEGAL if it is unrelated to laws, legal rights, legal duties, legal procedures, legal documents, legal disputes, or legal risk.\n\n")

	builder.WriteString("If the request is SIMPLE-DIRECT, answer in exactly one sentence using this exact structure:\n")
	builder.WriteString("[Yes/No], [briefly state what is allowed or prohibited], as per [Exact Formal Title of the Law/Decree], Article [Exact Article Number]. You MUST include the exact Article number.\n\n")

	builder.WriteString("If the request is COMPLEX-UNCERTAIN, do NOT guess, do NOT balance possibilities, and do NOT provide a partial legal conclusion.\n")
	builder.WriteString("Instead, answer in exactly one sentence using this exact structure:\n")
	builder.WriteString("This question requires a licensed lawyer to review your specific facts and documents before giving a reliable legal answer.\n\n")

	builder.WriteString("If the request is NON-LEGAL, answer in exactly one sentence using this exact structure:\n")
	builder.WriteString("I can only help with legal questions, so I cannot answer that request.\n\n")

	builder.WriteString("Strict decision rules:\n")
	builder.WriteString("1. Start by checking the BAHRAIN LAW KNOWLEDGE BASE below.\n")
	builder.WriteString("2. Use a Yes/No legal answer only when the rule is direct, the result is clear, and you can cite the exact law title or formal statute/article with high confidence.\n")
	builder.WriteString("3. If the knowledge base is irrelevant or incomplete, you may use general knowledge only for straightforward black-letter rules with very high confidence.\n")
	builder.WriteString("4. If the user asks for coding help, math help, writing help, general knowledge, personal advice, business advice, or any other non-legal task, you must use the NON-LEGAL sentence instead of referring them to a lawyer.\n")
	builder.WriteString("5. If there is any meaningful uncertainty, missing fact, possible exception, or need for legal judgment, you must use the lawyer-referral sentence instead.\n")
	builder.WriteString("6. Questions about contracts, liability, defenses, evidence, deadlines, immigration status, employment termination details, family disputes, criminal exposure, regulatory compliance, or \"what should I do\" are usually COMPLEX-UNCERTAIN.\n")
	builder.WriteString("7. Never invent a citation. Never cite a generic law name when you are unsure of the exact formal source.\n")
	builder.WriteString("8. Do not include introductory text, explanations about uncertainty, bullet points, multiple sentences, or disclaimers.\n")
	builder.WriteString("9. When using the Yes/No format, keep the middle explanation concise and under 15 words.\n")

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

func estimateAICostUSD(usage ai.TokenUsage, inputCostPerM, outputCostPerM float64) float64 {
	return (float64(usage.PromptTokens)/1_000_000)*inputCostPerM + (float64(usage.CompletionTokens)/1_000_000)*outputCostPerM
}

func viewerID(current *viewer) int64 {
	if current == nil {
		return 0
	}
	return current.ID
}

func viewerName(current *viewer) string {
	if current == nil || strings.TrimSpace(current.Name) == "" {
		return "Guest"
	}
	return current.Name
}

func viewerRole(current *viewer) string {
	if current == nil || strings.TrimSpace(current.Role) == "" {
		return models.RoleGuest
	}
	return current.Role
}
