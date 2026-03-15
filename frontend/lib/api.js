const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";

async function parseJSON(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
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

export async function getDashboard() {
  const response = await fetch(`${API_BASE}/api/dashboard`, { cache: "no-store" });
  return parseJSON(response);
}

export async function createCase(payload) {
  const response = await fetch(`${API_BASE}/api/cases`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return parseJSON(response);
}

export async function sendCaseMessage(caseId, payload) {
  const response = await fetch(`${API_BASE}/api/cases/${caseId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return parseJSON(response);
}

export async function uploadCaseAttachment(caseId, formData) {
  const response = await fetch(`${API_BASE}/api/cases/${caseId}/attachments`, {
    method: "POST",
    body: formData
  });
  return parseJSON(response);
}
