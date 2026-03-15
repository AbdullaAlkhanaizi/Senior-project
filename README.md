# Legal Consultant Senior Project

This repository is a local starter for a legal consultant website with:

- A login or guest entry page.
- A separate sign up page.
- A home hub page that points users to the AI page, FAQ page, or messaging page.
- A chatbot window placeholder that you can connect to your own AI and legal knowledge source.
- Lawyer and law firm referral cards for complex questions.
- A client-lawyer messaging workspace with file upload support.
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

## Run the backend

```powershell
cd backend
go mod tidy
go run ./cmd/server
```

The backend runs on `http://localhost:8080`.

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

The frontend already includes a dedicated AI page. You can later replace the placeholder messages and send button logic with your AI integration. The backend also has a clear escalation path:

- Basic questions stay in the chatbot.
- Complex questions can create a case and assign a lawyer.
- The client and lawyer can continue through the messaging workspace.

## API summary

- `GET /api/health`
- `POST /api/auth/login`
- `POST /api/auth/signup`
- `POST /api/auth/guest`
- `GET /api/dashboard`
- `GET /api/cases`
- `POST /api/cases`
- `GET /api/cases/:id`
- `POST /api/cases/:id/messages`
- `POST /api/cases/:id/attachments`
- `GET /uploads/:filename`
