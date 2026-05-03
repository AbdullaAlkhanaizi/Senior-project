# Legal Consultant Senior Project

This repository is a local starter for a legal consultant website with:

- A login page for admins, lawyers, and clients plus guest preview access.
- A separate client sign up page.
- A home hub page that points users to the AI page, FAQ page, or messaging page.
- A chatbot window placeholder that you can connect to your own AI and legal knowledge source.
- Lawyer and law firm referral cards for complex questions.
- A client-lawyer messaging workspace with file upload support.
- Role-aware account boundaries:
  - clients sign up from the public form
  - lawyers are created by admins only
  - admins cannot open client-lawyer message threads
- FAQ suggestions that can be populated by the chatbot.
- A Go backend with SQLite storage.
- A Next.js frontend using normal HTML and CSS.

## Project structure

- `backend/cmd/server/` application entrypoint.
- `backend/internal/config/` runtime config loading.
- `backend/internal/database/` SQLite connection setup.
- `backend/internal/httpapi/` separated HTTP handlers for auth, dashboard, health, and cases.
- `backend/internal/models/` shared request and response structs.
- `backend/internal/store/` database logic, migrations, seed data, auth, cases, and uploads.
- `frontend/app/` Next.js routes for login, signup, home, AI, FAQ, and messaging.
- `frontend/components/` reusable UI parts for auth, navigation, AI, FAQ, and messaging.
- `frontend/lib/` API helpers and local session storage helpers.

## Run both frontend and backend together

From the project root:

```powershell
go run start.go
```

This starts:

- frontend on `http://localhost:3000`
- backend on `http://localhost:8080`

## OR start them individually

## Run the backend

```powershell
cd backend
go mod tidy
go run ./cmd/server
```

The backend runs on `http://localhost:8080`.

## Default seeded accounts

These are intended for local development only:

- Admin: `admin@legal-portal.local` / `ChangeMe123!`
- Sample client: `client@legal-portal.local` / `Client123!`
- Seeded lawyers use their listed email with password `Lawyer123!`

You can override the seeded admin account with:

```powershell
$env:ADMIN_NAME="Your Admin Name"
$env:ADMIN_EMAIL="you@example.com"
$env:ADMIN_PASSWORD="UseAStrongPassword"
$env:AUTH_SECRET="replace-this-in-real-use"
$env:DEEPSEEK_API_KEY="your-deepseek-key"
$env:DEEPSEEK_MODEL="deepseek-v4-flash"
$env:DEEPSEEK_BASE_URL="https://api.deepseek.com"
$env:AI_JURISDICTION="Bahrain"
```

## Run the frontend

```powershell
cd frontend
npm install
npm run dev
```

The frontend runs on `http://localhost:3000`.

If your backend is not on the default port, set:

```powershell
$env:NEXT_PUBLIC_API_BASE="http://localhost:8080"
```

## Where to work on pages

- Login or guest page: `frontend/components/auth-client.js`
- Sign up page: `frontend/components/signup-client.js`
- Home hub page: `frontend/components/home-client.js`
- AI page: `frontend/components/ai-workspace.js`
- FAQ page: `frontend/components/faq-client.js`
- Messaging page: `frontend/components/messaging-client.js`
- Shared wrapper and top navigation: `frontend/components/portal-shell.js`
- Shared styling: `frontend/app/globals.css`

If you only want to change routing, edit the files in `frontend/app/`.

## Implement your chatbot later

The AI page is now wired to a backend chat endpoint that can call DeepSeek when `DEEPSEEK_API_KEY` is set. The backend also has a clear escalation path:

- Basic questions stay in the chatbot.
- Complex questions can create a case and assign a lawyer.
- The client and lawyer can continue through the messaging workspace.

### DeepSeek-backed AI assistant

The backend expects these environment variables:

```powershell
$env:DEEPSEEK_API_KEY="your-deepseek-key"
$env:DEEPSEEK_MODEL="deepseek-v4-flash"
$env:DEEPSEEK_BASE_URL="https://api.deepseek.com"
$env:AI_JURISDICTION="Bahrain"
```

What is implemented:

- `Ask a Question` sends legal Q&A prompts to DeepSeek.
- `Create Document` drafts first-pass legal text with placeholders.
- `Analyze Document` reviews pasted clauses or documents for risks and gaps.
- `Find Lawyer` reuses the existing lawyer directory and routes users to the protected workspace.

The AI endpoint returns general legal information only. For real deployment, you should still add:

- jurisdiction-specific legal source material or retrieval
- logging and rate limits
- stronger redaction and audit rules
- lawyer review before any action based on generated content

## API summary

- `GET /api/health`
- `POST /api/auth/login`
- `POST /api/auth/signup`
- `POST /api/auth/guest`
- `POST /api/admin/lawyers`
- `GET /api/dashboard`
- `POST /api/ai/chat`
- `GET /api/cases`
- `POST /api/cases`
- `GET /api/cases/:id`
- `POST /api/cases/:id/messages`
- `POST /api/cases/:id/attachments`
- `GET /uploads/:filename`
