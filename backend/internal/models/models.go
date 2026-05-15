package models

const (
	RoleGuest  = "guest"
	RoleClient = "client"
	RoleLawyer = "lawyer"
	RoleAdmin  = "admin"
)

type DashboardResponse struct {
	Lawyers    []Lawyer     `json:"lawyers"`
	ActiveCase *CaseDetails `json:"activeCase,omitempty"`
}

type Lawyer struct {
	ID        int64  `json:"id"`
	UserID    int64  `json:"userId,omitempty"`
	Name      string `json:"name"`
	Firm      string `json:"firm"`
	Specialty string `json:"specialty"`
	City      string `json:"city"`
	Email     string `json:"email"`
	Phone     string `json:"phone"`
	Bio       string `json:"bio"`
}

type CaseSummary struct {
	ID              int64  `json:"id"`
	Title           string `json:"title"`
	Summary         string `json:"summary"`
	Status          string `json:"status"`
	DecisionStatus  string `json:"decisionStatus"`
	DecisionNote    string `json:"decisionNote"`
	ProgressPercent int    `json:"progressPercent"`
	ClientName      string `json:"clientName"`
	ClientUserID    int64  `json:"clientUserId,omitempty"`
	LawyerID        int64  `json:"lawyerId"`
	LawyerName      string `json:"lawyerName"`
	HiddenByClient  bool   `json:"hiddenByClient"`
	HiddenByLawyer  bool   `json:"hiddenByLawyer"`
	CreatedAt       string `json:"createdAt"`
	RespondedAt     string `json:"respondedAt,omitempty"`
}

type CaseUpdate struct {
	ID        int64  `json:"id"`
	Label     string `json:"label"`
	State     string `json:"state"`
	SortOrder int    `json:"sortOrder"`
	CreatedAt string `json:"createdAt"`
}

type Message struct {
	ID             int64  `json:"id"`
	CaseID         int64  `json:"caseId"`
	SenderType     string `json:"senderType"`
	SenderName     string `json:"senderName"`
	Body           string `json:"body"`
	AttachmentName string `json:"attachmentName"`
	AttachmentURL  string `json:"attachmentUrl"`
	CreatedAt      string `json:"createdAt"`
}

type CaseDetails struct {
	Case     CaseSummary  `json:"case"`
	Lawyer   Lawyer       `json:"lawyer"`
	Updates  []CaseUpdate `json:"updates"`
	Messages []Message    `json:"messages"`
}

type CreateCaseRequest struct {
	Title        string `json:"title"`
	Summary      string `json:"summary"`
	ClientName   string `json:"clientName"`
	LawyerID     int64  `json:"lawyerId"`
	ClientUserID int64  `json:"-"`
}

type CaseDecisionRequest struct {
	Decision string `json:"decision"`
	Note     string `json:"note"`
	Outcome  string `json:"outcome"`
}

type UpsertCaseUpdateRequest struct {
	Label string `json:"label"`
	State string `json:"state"`
}

type ReorderCaseUpdatesRequest struct {
	UpdateIDs []int64 `json:"updateIds"`
}

type UpdateCaseVisibilityRequest struct {
	Hidden bool `json:"hidden"`
}

type CreateMessageRequest struct {
	SenderType string `json:"senderType"`
	SenderName string `json:"senderName"`
	Body       string `json:"body"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type SignupRequest struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type CreateLawyerAccountRequest struct {
	Name      string `json:"name"`
	Email     string `json:"email"`
	Password  string `json:"password"`
	Firm      string `json:"firm"`
	Specialty string `json:"specialty"`
	City      string `json:"city"`
	Phone     string `json:"phone"`
	Bio       string `json:"bio"`
}

type GuestRequest struct {
	Name string `json:"name"`
}

type AuthResponse struct {
	ID       int64  `json:"id"`
	Name     string `json:"name"`
	Email    string `json:"email"`
	Role     string `json:"role"`
	Mode     string `json:"mode"`
	Token    string `json:"token,omitempty"`
	LawyerID int64  `json:"lawyerId,omitempty"`
}

type AIChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type AIChatRequest struct {
	Mode     string          `json:"mode"`
	Category string          `json:"category"`
	CaseID   int64           `json:"caseId,omitempty"`
	Messages []AIChatMessage `json:"messages"`
}

type AIChatResponse struct {
	Message          AIChatMessage `json:"message"`
	Model            string        `json:"model"`
	Disclaimer       string        `json:"disclaimer"`
	SuggestedActions []string      `json:"suggestedActions"`
}

type AIUsageLog struct {
	UserID           int64   `json:"userId,omitempty"`
	UserName         string  `json:"userName"`
	UserRole         string  `json:"userRole"`
	CaseID           int64   `json:"caseId,omitempty"`
	Model            string  `json:"model"`
	Mode             string  `json:"mode"`
	Category         string  `json:"category"`
	PromptTokens     int     `json:"promptTokens"`
	CompletionTokens int     `json:"completionTokens"`
	TotalTokens      int     `json:"totalTokens"`
	EstimatedCostUSD float64 `json:"estimatedCostUsd"`
	CreatedAt        string  `json:"createdAt"`
}

type Review struct {
	ID         int64  `json:"id"`
	UserID     int64  `json:"userId"`
	UserName   string `json:"name"`
	LawyerID   int64  `json:"lawyerId"`
	LawyerName string `json:"lawyerName"`
	Title      string `json:"title"`
	Body       string `json:"review"`
	Rating     int    `json:"rating"`
	CreatedAt  string `json:"date"`
}

type CreateReviewRequest struct {
	LawyerID int64  `json:"lawyerId"`
	Title    string `json:"title"`
	Body     string `json:"review"`
	Rating   int    `json:"rating"`
}

type LawyerCompletedStats struct {
	LawyerID       int64  `json:"lawyerId"`
	LawyerName     string `json:"lawyerName"`
	TotalCompleted int    `json:"totalCompleted"`
	Won            int    `json:"won"`
	Lost           int    `json:"lost"`
	NotDecided     int    `json:"notDecided"`
}

type AIUsageSummary struct {
	TotalRequests         int     `json:"totalRequests"`
	CaseLinkedRequests    int     `json:"caseLinkedRequests"`
	TrackedUsers          int     `json:"trackedUsers"`
	PromptTokens          int     `json:"promptTokens"`
	CompletionTokens      int     `json:"completionTokens"`
	TotalTokens           int     `json:"totalTokens"`
	EstimatedCostUSD      float64 `json:"estimatedCostUsd"`
	AverageCostPerRequest float64 `json:"averageCostPerRequest"`
}

type AIUsageByUserStats struct {
	UserID           int64   `json:"userId,omitempty"`
	UserName         string  `json:"userName"`
	UserRole         string  `json:"userRole"`
	RequestCount     int     `json:"requestCount"`
	PromptTokens     int     `json:"promptTokens"`
	CompletionTokens int     `json:"completionTokens"`
	TotalTokens      int     `json:"totalTokens"`
	EstimatedCostUSD float64 `json:"estimatedCostUsd"`
	LastUsedAt       string  `json:"lastUsedAt"`
}

type AIUsageByCaseStats struct {
	CaseID           int64   `json:"caseId"`
	CaseTitle        string  `json:"caseTitle"`
	ClientName       string  `json:"clientName"`
	LawyerName       string  `json:"lawyerName"`
	RequestCount     int     `json:"requestCount"`
	PromptTokens     int     `json:"promptTokens"`
	CompletionTokens int     `json:"completionTokens"`
	TotalTokens      int     `json:"totalTokens"`
	EstimatedCostUSD float64 `json:"estimatedCostUsd"`
	LastUsedAt       string  `json:"lastUsedAt"`
}

type AdminStatsResponse struct {
	TotalUsers     int                    `json:"totalUsers"`
	TotalLawyers   int                    `json:"totalLawyers"`
	TotalCases     int                    `json:"totalCases"`
	ActiveCases    int                    `json:"activeCases"`
	CompletedCases int                    `json:"completedCases"`
	LawyerStats    []LawyerCompletedStats `json:"lawyerStats"`
	AIUsage        AIUsageSummary         `json:"aiUsage"`
	AIUsageByUser  []AIUsageByUserStats   `json:"aiUsageByUser"`
	AIUsageByCase  []AIUsageByCaseStats   `json:"aiUsageByCase"`
}

type AdminUser struct {
	ID        int64  `json:"id"`
	Name      string `json:"name"`
	Email     string `json:"email"`
	Role      string `json:"role"`
	CreatedAt string `json:"createdAt"`
}
