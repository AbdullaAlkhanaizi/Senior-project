import { loadSession } from "./session";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";

async function parseJSON(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
}

function withAuthHeaders(headers = {}) {
  const session = loadSession();
  if (!session?.token) {
    return headers;
  }

  return {
    ...headers,
    Authorization: `Bearer ${session.token}`
  };
}

export { API_BASE };

export async function loginUser(payload) {
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return parseJSON(response);
}

export async function signupUser(payload) {
  const response = await fetch(`${API_BASE}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return parseJSON(response);
}

export async function continueAsGuest(payload) {
  const response = await fetch(`${API_BASE}/api/auth/guest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return parseJSON(response);
}

export async function createLawyerAccount(payload) {
  const response = await fetch(`${API_BASE}/api/admin/lawyers`, {
    method: "POST",
    headers: withAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload)
  });
  return parseJSON(response);
}

export async function getDashboard() {
  const response = await fetch(`${API_BASE}/api/dashboard`, {
    cache: "no-store",
    headers: withAuthHeaders()
  });
  return parseJSON(response);
}

export async function createCase(payload) {
  const response = await fetch(`${API_BASE}/api/cases`, {
    method: "POST",
    headers: withAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload)
  });
  return parseJSON(response);
}

export async function getCases() {
  const response = await fetch(`${API_BASE}/api/cases`, {
    cache: "no-store",
    headers: withAuthHeaders()
  });
  return parseJSON(response);
}

export async function getCaseDetails(caseId) {
  const response = await fetch(`${API_BASE}/api/cases/${caseId}`, {
    cache: "no-store",
    headers: withAuthHeaders()
  });
  return parseJSON(response);
}

export async function decideCase(caseId, payload) {
  const response = await fetch(`${API_BASE}/api/cases/${caseId}/decision`, {
    method: "POST",
    headers: withAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload)
  });
  return parseJSON(response);
}

export async function sendCaseMessage(caseId, payload) {
  const response = await fetch(`${API_BASE}/api/cases/${caseId}/messages`, {
    method: "POST",
    headers: withAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload)
  });
  return parseJSON(response);
}

export async function uploadCaseAttachment(caseId, formData) {
  const response = await fetch(`${API_BASE}/api/cases/${caseId}/attachments`, {
    method: "POST",
    headers: withAuthHeaders(),
    body: formData
  });
  return parseJSON(response);
}

export async function createCaseStep(caseId, payload) {
  const response = await fetch(`${API_BASE}/api/cases/${caseId}/updates`, {
    method: "POST",
    headers: withAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload)
  });
  return parseJSON(response);
}

export async function updateCaseStep(caseId, stepId, payload) {
  const response = await fetch(`${API_BASE}/api/cases/${caseId}/updates/${stepId}`, {
    method: "PUT",
    headers: withAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload)
  });
  return parseJSON(response);
}

export async function deleteCaseStep(caseId, stepId) {
  const response = await fetch(`${API_BASE}/api/cases/${caseId}/updates/${stepId}`, {
    method: "DELETE",
    headers: withAuthHeaders()
  });
  return parseJSON(response);
}
