"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { createLawyerAccount, getDashboard } from "../lib/api";
import { loadSession } from "../lib/session";

const ROLE_TITLES = {
  admin: "Admin workspace",
  lawyer: "Lawyer workspace",
  client: "Client workspace",
  guest: "Guest preview"
};

const ROLE_COPY = {
  admin: "Create lawyer accounts, review platform data, and manage access. Admins do not have access to client-lawyer message threads.",
  lawyer: "Review your assigned matters and continue case communication from the protected messaging workspace.",
  client: "Track your case, contact your lawyer, and create a new referral when the AI assistant escalates your issue.",
  guest: "Browse the platform before registering. Referral creation and protected messaging require a client account."
};

const INITIAL_LAWYER_FORM = {
  name: "",
  email: "",
  password: "",
  firm: "",
  specialty: "",
  city: "",
  phone: "",
  bio: ""
};

export default function HomeClient() {
  const [session, setSession] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [lawyerForm, setLawyerForm] = useState(INITIAL_LAWYER_FORM);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const currentSession = loadSession();
    setSession(currentSession);

    async function load() {
      try {
        const data = await getDashboard();
        setDashboard(data);
      } catch (requestError) {
        setError(requestError.message);
      }
    }

    load();
  }, []);

  const role = session?.role || "guest";
  const activeCase = dashboard?.activeCase;
  const lawyers = dashboard?.lawyers || [];

  async function handleCreateLawyer(event) {
    event.preventDefault();
    setError("");
    setStatus("Creating lawyer account...");

    try {
      const lawyer = await createLawyerAccount(lawyerForm);
      setDashboard((current) => ({
        ...(current || {}),
        lawyers: [...(current?.lawyers || []), lawyer]
      }));
      setLawyerForm(INITIAL_LAWYER_FORM);
      setStatus(`${lawyer.name} can now sign in with the lawyer role.`);
    } catch (requestError) {
      setError(requestError.message);
      setStatus("");
    }
  }

  function updateLawyerForm(field, value) {
    setLawyerForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  return (
    <>
      {error ? <p className="feedback error">{error}</p> : null}
      {status ? <p className="feedback">{status}</p> : null}

      <section className="hub-grid">
        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">Signed in as</p>
              <h2>{ROLE_TITLES[role] || "Workspace"}</h2>
            </div>
            <span className="badge">{role}</span>
          </div>

          <p className="hero-copy">{ROLE_COPY[role] || ROLE_COPY.guest}</p>

          <div className="account-summary">
            <div>
              <span className="summary-label">Account</span>
              <strong>{session?.name || "Guest explorer"}</strong>
            </div>
            <div>
              <span className="summary-label">Email</span>
              <strong>{session?.email || "No saved account"}</strong>
            </div>
          </div>

          <div className="hub-cards">
            <Link href="/ai" className="feature-card">
              <span>Assistant</span>
              <h3>Ask the AI legal assistant</h3>
              <p>Start triage, draft questions, and prepare for escalation.</p>
            </Link>

            <Link href="/faq" className="feature-card">
              <span>Knowledge Base</span>
              <h3>Browse legal FAQs</h3>
              <p>Explore the frequently asked questions already surfaced by the system.</p>
            </Link>

            {role !== "admin" ? (
              <Link href="/messaging" className="feature-card">
                <span>Protected Thread</span>
                <h3>Open the messaging workspace</h3>
                <p>View case progress, file uploads, and direct lawyer communication.</p>
              </Link>
            ) : (
              <article className="feature-card static-card">
                <span>Access Boundary</span>
                <h3>Admin message access is blocked</h3>
                <p>Client-lawyer threads stay unavailable to admin accounts by design.</p>
              </article>
            )}

            {role === "guest" ? (
              <Link href="/signup" className="feature-card">
                <span>Registration</span>
                <h3>Create a client account</h3>
                <p>Only clients self-register. Lawyer accounts are created by admins.</p>
              </Link>
            ) : null}
          </div>
        </article>

        <article className="panel">
          {role === "admin" ? (
            <>
              <div className="panel-header">
                <div>
                  <p className="panel-kicker">Admin Only</p>
                  <h2>Create lawyer account</h2>
                </div>
              </div>

              <form className="referral-form admin-form-grid" onSubmit={handleCreateLawyer}>
                <input value={lawyerForm.name} onChange={(event) => updateLawyerForm("name", event.target.value)} placeholder="Lawyer name" />
                <input value={lawyerForm.email} onChange={(event) => updateLawyerForm("email", event.target.value)} placeholder="Lawyer email" />
                <input value={lawyerForm.password} onChange={(event) => updateLawyerForm("password", event.target.value)} placeholder="Temporary password" type="password" />
                <input value={lawyerForm.firm} onChange={(event) => updateLawyerForm("firm", event.target.value)} placeholder="Firm name" />
                <input value={lawyerForm.specialty} onChange={(event) => updateLawyerForm("specialty", event.target.value)} placeholder="Specialty" />
                <input value={lawyerForm.city} onChange={(event) => updateLawyerForm("city", event.target.value)} placeholder="City" />
                <input value={lawyerForm.phone} onChange={(event) => updateLawyerForm("phone", event.target.value)} placeholder="Phone" />
                <textarea value={lawyerForm.bio} onChange={(event) => updateLawyerForm("bio", event.target.value)} placeholder="Short lawyer bio" />
                <button type="submit">Create lawyer account</button>
              </form>
            </>
          ) : activeCase ? (
            <>
              <div className="panel-header">
                <div>
                  <p className="panel-kicker">Current case</p>
                  <h2>{activeCase.case.title}</h2>
                </div>
                <span className="badge">{activeCase.case.status}</span>
              </div>

              <div className="progress-card">
                <div className="progress-meta">
                  <div>
                    <p className="muted">Assigned lawyer</p>
                    <h3>{activeCase.lawyer.name}</h3>
                  </div>
                  <strong>{activeCase.case.progressPercent}%</strong>
                </div>
                <div className="progress-bar">
                  <div style={{ width: `${activeCase.case.progressPercent}%` }} />
                </div>
                <div className="timeline">
                  {activeCase.updates.map((step) => (
                    <article key={step.id} className={`timeline-step ${step.state}`}>
                      <span />
                      <div>
                        <h4>{step.label}</h4>
                        <p>{step.state}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              <div className="status-row">
                <Link href="/messaging" className="link-button">Open messaging</Link>
                <Link href="/faq" className="link-button ghost">Browse FAQs</Link>
              </div>
            </>
          ) : (
            <>
              <div className="panel-header">
                <div>
                  <p className="panel-kicker">Next step</p>
                  <h2>No protected case yet</h2>
                </div>
              </div>

              <p className="hero-copy">
                {role === "guest"
                  ? "You can preview the platform, but creating a referral or joining a protected case requires a client account."
                  : "Your account is ready. When you start a referral, the system will attach the case to your signed-in role automatically."}
              </p>

              <div className="status-row">
                {role === "guest" ? (
                  <Link href="/signup" className="link-button">Create client account</Link>
                ) : (
                  <Link href="/messaging" className="link-button">Open referral workspace</Link>
                )}
              </div>
            </>
          )}
        </article>
      </section>

      <section className="grid" style={{ marginTop: "24px" }}>
        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">Directory</p>
              <h2>Lawyer accounts</h2>
            </div>
          </div>

          <div className="lawyer-grid">
            {lawyers.map((lawyer) => (
              <article key={lawyer.id} className="selected-lawyer">
                <h3>{lawyer.name}</h3>
                <p>{lawyer.firm}</p>
                <p>{lawyer.specialty}</p>
                <p>{lawyer.city}</p>
                <p>{lawyer.email}</p>
              </article>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">System note</p>
              <h2>Role boundaries</h2>
            </div>
          </div>

          <div className="access-note">
            <p><strong>Admins</strong> can create lawyer accounts and access platform data, but not private client-lawyer threads.</p>
            <p><strong>Lawyers</strong> sign in to access only the cases assigned to their account.</p>
            <p><strong>Clients</strong> self-register and access only their own cases and conversations.</p>
          </div>
        </article>
      </section>
    </>
  );
}
