package models

const (
	RoleGuest  = "guest"
	RoleClient = "client"
	RoleLawyer = "lawyer"
	RoleAdmin  = "admin"
)

type DashboardResponse struct {
	FAQSuggestions []FAQSuggestion `json:"faqSuggestions"`
	Lawyers        []Lawyer        `json:"lawyers"`
	ActiveCase     *CaseDetails    `json:"activeCase,omitempty"`
}

type FAQSuggestion struct {
	ID       int64  `json:"id"`
	Question string `json:"question"`
	Category string `json:"category"`
	Priority int    `json:"priority"`
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
	ProgressPercent int    `json:"progressPercent"`
	ClientName      string `json:"clientName"`
	ClientUserID    int64  `json:"clientUserId,omitempty"`
	LawyerID        int64  `json:"lawyerId"`
	CreatedAt       string `json:"createdAt"`
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
