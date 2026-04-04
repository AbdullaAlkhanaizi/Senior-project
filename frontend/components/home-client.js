"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { createLawyerAccount, getDashboard } from "../lib/api";
import { loadSession } from "../lib/session";

const ROLE_COPY = {
  admin: "Create lawyer accounts, review platform activity, and manage access controls across the portal.",
  lawyer: "Review your assigned matters and continue protected communication from the messaging workspace.",
  client: "Track your case, contact your lawyer, and prepare referrals through the guided assistant.",
  guest: "Preview the platform features as a guest user before creating a referral or protected case."
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

const FEATURE_CARDS = [
  {
    href: "/ai",
    title: "Ask the AI legal assistant",
    description: "Start triage, ask questions, and prepare for escalation.",
    icon: "bot"
  },
  {
    href: "/faq",
    title: "Browse legal FAQs",
    description: "Explore the frequently asked questions already surfaced by the system.",
    icon: "faq"
  },
  {
    href: "/messaging",
    title: "Open Messaging",
    description: "View case progress, files shared, and direct lawyer communication.",
    icon: "message"
  },
  {
    href: "/signup",
    title: "Create a client account",
    description: "Only clients self-register. Lawyer accounts are created by admins.",
    icon: "user"
  }
];

const ROLE_BOUNDARIES = [
  {
    title: "Admins",
    description: "Can create lawyer accounts and review platform data, but never access protected client-lawyer threads."
  },
  {
    title: "Lawyers",
    description: "Can access only the cases assigned to their account and continue protected communication."
  },
  {
    title: "Clients",
    description: "Can self-register and access only their own cases, updates, and conversations."
  }
];

function HomeIcon({ type }) {
  if (type === "faq") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 4.5h9l3 3V19a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 5 19V6A1.5 1.5 0 0 1 6.5 4.5Z" />
        <path d="M14.5 4.5V8h3.5" />
        <path d="M8 11h8" />
        <path d="M8 14h8" />
      </svg>
    );
  }

  if (type === "message") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6.5 6.5h11A2.5 2.5 0 0 1 20 9v5a2.5 2.5 0 0 1-2.5 2.5h-6.2l-3.6 2.8c-.5.4-1.2 0-1.2-.7v-2.1A2.5 2.5 0 0 1 4 14V9a2.5 2.5 0 0 1 2.5-2.5Z" />
        <path d="M8 11h8" />
      </svg>
    );
  }

  if (type === "user") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 12a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5Z" />
        <path d="M5 19a6.6 6.6 0 0 1 14 0" />
        <path d="M18.5 8.5v4" />
        <path d="M16.5 10.5h4" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5" y="7" width="14" height="10" rx="3" />
      <path d="M9 12h.01M15 12h.01" />
      <path d="M12 4.5v2" />
      <path d="M8 4.5 9.5 6" />
      <path d="M16 4.5 14.5 6" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3.5 18 6v5.2c0 4.1-2.5 7.1-6 9.3-3.5-2.2-6-5.2-6-9.3V6l6-2.5Z" />
      <path d="M12 8.5v5" />
      <path d="M9.5 11h5" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

function MaleLawyerIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 12a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5Z" />
      <path d="M5.5 19a6.5 6.5 0 0 1 13 0" />
      <path d="M15 4h4v4" />
      <path d="m19 5-3.5 3.5" />
    </svg>
  );
}

function FemaleLawyerIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
      <path d="M8.5 19c.4-3 1.9-5 3.5-6.2 1.6 1.2 3.1 3.2 3.5 6.2" />
      <path d="M12 15.5v4" />
      <path d="M10.2 19.5h3.6" />
    </svg>
  );
}

function getLawyerProfile(name) {
  const firstName = (name || "").trim().split(" ")[0]?.toLowerCase();
  const femaleNames = new Set(["noor", "sara", "fatima", "maryam", "layla", "amal", "noura", "huda"]);

  if (femaleNames.has(firstName)) {
    return {
      tone: "female",
      icon: <FemaleLawyerIcon />
    };
  }

  return {
    tone: "male",
    icon: <MaleLawyerIcon />
  };
}

export default function HomeClient() {
  const [session, setSession] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [lawyerForm, setLawyerForm] = useState(INITIAL_LAWYER_FORM);
  const [openBoundary, setOpenBoundary] = useState(null);
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

  const visibleFeatures = FEATURE_CARDS.filter((card) => {
    if (card.href === "/messaging" && role === "admin") {
      return false;
    }

    if (card.href === "/signup" && role !== "guest") {
      return false;
    }

    return true;
  });

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
    <div className="home-reference-page">
      {error ? <p className="feedback error">{error}</p> : null}
      {status ? <p className="feedback">{status}</p> : null}

      <section className="home-reference-grid">
        <div className="home-reference-main">
          <section className="home-hero">
            <div className="home-hero-copy">
              <h1>Start navigating the legal platform</h1>
              <p>
                {ROLE_COPY[role] || ROLE_COPY.guest}
              </p>
              <div className="home-hero-actions">
                {role === "guest" ? (
                  <Link href="/signup" className="home-primary-button">Create Client Account</Link>
                ) : role === "admin" ? (
                  <a href="#lawyer-account-form" className="home-primary-button">Create Lawyer Account</a>
                ) : (
                  <Link href="/messaging" className="home-primary-button">Open Protected Workspace</Link>
                )}
              </div>
            </div>
          </section>

          <section className="home-feature-grid">
            {visibleFeatures.map((card) => (
              <Link key={card.title} href={card.href} className="home-feature-card">
                <span className="home-feature-icon">
                  <HomeIcon type={card.icon} />
                </span>
                <div>
                  <h2>{card.title}</h2>
                  <p>{card.description}</p>
                </div>
              </Link>
            ))}

            {role === "admin" ? (
              <article className="home-feature-card home-feature-card-static">
                <span className="home-feature-icon">
                  <ShieldIcon />
                </span>
                <div>
                  <h2>Protected messaging stays private</h2>
                  <p>Admin accounts can manage access and data, but cannot open client-lawyer message threads.</p>
                </div>
              </article>
            ) : null}
          </section>

          <section className="home-lawyers-panel">
            <div className="home-section-heading">
              <h2>Lawyer Accounts</h2>
            </div>

            <div className="home-lawyer-grid">
              {lawyers.map((lawyer) => {
                const profile = getLawyerProfile(lawyer.name);

                return (
                <article key={lawyer.id} className="home-lawyer-card">
                  <div className="home-lawyer-top">
                    <span className={`home-lawyer-avatar ${profile.tone}`}>
                      {profile.icon}
                    </span>
                    <h3>{lawyer.name}</h3>
                  </div>
                  <p>{lawyer.firm}</p>
                  <p>{lawyer.specialty}</p>
                  <p>{lawyer.city}</p>
                  <p>{lawyer.email}</p>
                </article>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="home-reference-sidebar">
          {role === "admin" ? (
            <section className="home-side-panel home-side-form-panel" id="lawyer-account-form">
              <div className="home-side-heading">
                <span className="home-side-badge">Admin only</span>
                <h2>Create lawyer account</h2>
              </div>

              <form className="home-lawyer-form" onSubmit={handleCreateLawyer}>
                <input value={lawyerForm.name} onChange={(event) => updateLawyerForm("name", event.target.value)} placeholder="Lawyer name" />
                <input value={lawyerForm.email} onChange={(event) => updateLawyerForm("email", event.target.value)} placeholder="Lawyer email" />
                <input value={lawyerForm.password} onChange={(event) => updateLawyerForm("password", event.target.value)} placeholder="Temporary password" type="password" />
                <input value={lawyerForm.firm} onChange={(event) => updateLawyerForm("firm", event.target.value)} placeholder="Firm name" />
                <input value={lawyerForm.specialty} onChange={(event) => updateLawyerForm("specialty", event.target.value)} placeholder="Specialty" />
                <input value={lawyerForm.city} onChange={(event) => updateLawyerForm("city", event.target.value)} placeholder="City" />
                <input value={lawyerForm.phone} onChange={(event) => updateLawyerForm("phone", event.target.value)} placeholder="Phone" />
                <textarea value={lawyerForm.bio} onChange={(event) => updateLawyerForm("bio", event.target.value)} placeholder="Short lawyer bio" />
                <button type="submit" className="home-primary-button">Create Lawyer Account</button>
              </form>
            </section>
          ) : activeCase ? (
            <section className="home-side-panel">
              <div className="home-side-heading">
                <span className="home-side-icon">
                  <ShieldIcon />
                </span>
                <h2>{activeCase.case.title}</h2>
              </div>

              <p className="home-side-copy">
                Assigned to {activeCase.lawyer.name}. Track the live case status and continue the protected thread when needed.
              </p>

              <div className="home-case-progress">
                <div className="home-case-progress-meta">
                  <span>Progress</span>
                  <strong>{activeCase.case.progressPercent}%</strong>
                </div>
                <div className="home-case-progress-bar">
                  <div style={{ width: `${activeCase.case.progressPercent}%` }} />
                </div>
              </div>

              <div className="home-case-updates">
                {activeCase.updates.map((step) => (
                  <article key={step.id} className={`home-case-step ${step.state}`}>
                    <span />
                    <div>
                      <h3>{step.label}</h3>
                      <p>{step.state}</p>
                    </div>
                  </article>
                ))}
              </div>

              <Link href="/messaging" className="home-primary-button">Open Messaging</Link>
            </section>
          ) : (
            <section className="home-side-panel">
              <div className="home-side-heading">
                <span className="home-side-icon">
                  <ShieldIcon />
                </span>
                <h2>Protected Case Ready?</h2>
              </div>

              <p className="home-side-copy">
                {role === "guest"
                  ? "You can preview the platform, but creating a referral or joining a protected case requires a client account."
                  : "Your account is ready. Start a referral to open a protected case and continue with direct lawyer coordination."}
              </p>

              {role === "guest" ? (
                <Link href="/signup" className="home-primary-button">Create Client Account</Link>
              ) : (
                <Link href="/messaging" className="home-primary-button">Open Referral Workspace</Link>
              )}
            </section>
          )}

          <section className="home-side-panel">
            <div className="home-section-heading">
              <h2>Role Boundaries</h2>
            </div>

            <div className="home-boundary-list">
              {ROLE_BOUNDARIES.map((item) => (
                <article
                  key={item.title}
                  className={`home-boundary-row ${openBoundary === item.title ? "open" : ""}`}
                >
                  <button
                    type="button"
                    className="home-boundary-trigger"
                    onClick={() =>
                      setOpenBoundary((current) => (current === item.title ? null : item.title))
                    }
                    aria-expanded={openBoundary === item.title}
                  >
                    <h3>{item.title}</h3>
                    <span className="home-boundary-arrow">
                      <ArrowIcon />
                    </span>
                  </button>

                  {openBoundary === item.title ? (
                    <p>{item.description}</p>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
