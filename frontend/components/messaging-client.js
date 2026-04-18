"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  API_BASE,
  createCase,
  createCaseStep,
  deleteCaseStep,
  decideCase,
  getCaseDetails,
  getCases,
  getDashboard,
  reorderCaseSteps,
  sendCaseMessage,
  updateCaseStep,
  uploadCaseAttachment
} from "../lib/api";
import { INITIAL_REVIEWS, getLawyerReviewSummary } from "../lib/reviews";
import { loadSession } from "../lib/session";

const STEP_STATE_OPTIONS = ["completed", "current", "upcoming"];
const LAWYER_THEMES = [
  { accent: "#8d3b1d", soft: "rgba(141, 59, 29, 0.16)", avatar: "linear-gradient(145deg, rgba(141, 59, 29, 0.95), rgba(103, 44, 19, 0.88))" },
  { accent: "#2f5d50", soft: "rgba(47, 93, 80, 0.18)", avatar: "linear-gradient(145deg, rgba(47, 93, 80, 0.94), rgba(31, 68, 58, 0.88))" },
  { accent: "#6b4a7d", soft: "rgba(107, 74, 125, 0.18)", avatar: "linear-gradient(145deg, rgba(107, 74, 125, 0.94), rgba(79, 54, 95, 0.88))" },
  { accent: "#9a6a18", soft: "rgba(154, 106, 24, 0.18)", avatar: "linear-gradient(145deg, rgba(154, 106, 24, 0.95), rgba(121, 81, 14, 0.88))" }
];

function buildStepDrafts(updates = []) {
  return updates.reduce((drafts, step) => {
    drafts[step.id] = {
      label: step.label,
      state: step.state
    };
    return drafts;
  }, {});
}

function reorderUpdates(updates, draggedStepId, targetStepId) {
  const draggedIndex = updates.findIndex((step) => step.id === draggedStepId);
  const targetIndex = updates.findIndex((step) => step.id === targetStepId);
  if (draggedIndex < 0 || targetIndex < 0 || draggedIndex === targetIndex) {
    return updates;
  }

  const nextUpdates = [...updates];
  const [draggedStep] = nextUpdates.splice(draggedIndex, 1);
  nextUpdates.splice(targetIndex, 0, draggedStep);
  return nextUpdates;
}

function getLawyerTheme(key = "") {
  const normalized = String(key);
  const score = normalized.split("").reduce((total, char) => total + char.charCodeAt(0), 0);
  const theme = LAWYER_THEMES[score % LAWYER_THEMES.length];

  return {
    "--lawyer-accent": theme.accent,
    "--lawyer-soft": theme.soft,
    "--lawyer-avatar": theme.avatar
  };
}

export default function MessagingClient() {
  const [session, setSession] = useState(null);
  const [lawyers, setLawyers] = useState([]);
  const [cases, setCases] = useState([]);
  const [activeCase, setActiveCase] = useState(null);
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [selectedLawyerId, setSelectedLawyerId] = useState(0);
  const [issueSummary, setIssueSummary] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [decisionNote, setDecisionNote] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [loadingCases, setLoadingCases] = useState(true);
  const [stepDrafts, setStepDrafts] = useState({});
  const [newStep, setNewStep] = useState({ label: "", state: "upcoming" });
  const [clientView, setClientView] = useState("list");
  const [lawyerView, setLawyerView] = useState("list");
  const [draggedStepId, setDraggedStepId] = useState(null);
  const [dragOverStepId, setDragOverStepId] = useState(null);

  useEffect(() => {
    const currentSession = loadSession();
    setSession(currentSession);

    async function load() {
      setLoadingCases(true);
      try {
        const dashboardData = await getDashboard();
        setLawyers(dashboardData.lawyers || []);
        if (dashboardData.lawyers?.[0]?.id) {
          setSelectedLawyerId(dashboardData.lawyers[0].id);
        }

        if (!currentSession?.token) {
          setCases([]);
          setActiveCase(null);
          return;
        }

        const caseItems = await getCases();
        setCases(caseItems);

        if (caseItems[0]?.id) {
          setSelectedCaseId(caseItems[0].id);
          const details = await getCaseDetails(caseItems[0].id);
          setActiveCase(details);
        } else {
          setActiveCase(null);
        }
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setLoadingCases(false);
      }
    }

    load();
  }, []);

  useEffect(() => {
    setStepDrafts(buildStepDrafts(activeCase?.updates || []));
  }, [activeCase]);

  const role = session?.role || "guest";
  const isAdmin = role === "admin";
  const isGuest = role === "guest";
  const isClient = role === "client";
  const isLawyer = role === "lawyer";
  const selectedLawyer = lawyers.find((lawyer) => lawyer.id === Number(selectedLawyerId));
  const canMessage = activeCase?.case?.decisionStatus === "accepted" && !isGuest;
  const currentSenderType = isLawyer ? "lawyer" : isClient ? "client" : "";
  const isExpandedWorkspace =
    (isClient && (clientView === "details" || clientView === "create")) ||
    (isLawyer && lawyerView === "details");

  const caseLabel = useMemo(() => {
    if (!activeCase) {
      return "No case selected";
    }
    if (isLawyer) {
      return activeCase.case.clientName;
    }
    return activeCase.lawyer.name;
  }, [activeCase, isLawyer]);

  const lawyerReviewSummaries = useMemo(() => {
    return lawyers.reduce((summaries, lawyer) => {
      summaries[lawyer.name] = getLawyerReviewSummary(INITIAL_REVIEWS, lawyer.name);
      return summaries;
    }, {});
  }, [lawyers]);

  function formatTimestamp(value) {
    return new Date(value).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  }

  function getInitials(name = "") {
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("");
  }

  function getReviewHref(lawyerName = "") {
    return `/review?lawyer=${encodeURIComponent(lawyerName)}`;
  }

  function renderStars(ratingValue) {
    const rounded = Math.round(Number(ratingValue) || 0);

    return (
      <span className="lawyer-rating-stars" aria-label={`${rounded} star rating`}>
        {[1, 2, 3, 4, 5].map((value) => (
          <span key={value} className={value <= rounded ? "star-filled" : "star-empty"}>★</span>
        ))}
      </span>
    );
  }

  function renderLawyerReviewSummary(lawyer) {
    if (!lawyer) {
      return null;
    }

    const summary = lawyerReviewSummaries[lawyer.name] || { average: 0, count: 0 };

    return (
      <div className="lawyer-review-summary">
        {renderStars(summary.average)}
        <span>{summary.average.toFixed(1)}</span>
        <small>{summary.count} {summary.count === 1 ? "review" : "reviews"}</small>
      </div>
    );
  }

  function CaseReviewIcon() {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="9" width="16" height="7" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M7 9.5 9.5 6.8h5L17 9.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="8" cy="16.5" r="1.5" fill="currentColor" />
        <circle cx="16" cy="16.5" r="1.5" fill="currentColor" />
      </svg>
    );
  }

  function EmailIcon() {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M5.5 8 12 13l6.5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  function PhoneIcon() {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M8.2 4.5c.5-.5 1.3-.6 1.9-.2l2 1.2c.7.4.9 1.3.6 2l-.8 1.8c-.2.5-.1 1 .2 1.4l1.9 1.9c.4.4 1 .5 1.4.2l1.8-.8c.7-.3 1.5-.1 2 .6l1.2 2c.4.6.3 1.4-.2 1.9l-1.1 1.1c-1 1-2.5 1.4-3.9.9-2.4-.8-4.6-2.3-6.5-4.2s-3.4-4.1-4.2-6.5c-.5-1.4-.1-2.9.9-3.9z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  function renderCaseListItem(item, secondaryName, accentKey) {
    return (
      <button
        key={item.id}
        type="button"
        className={`case-list-item case-faq-card ${selectedCaseId === item.id ? "selected" : ""}`}
        style={accentKey ? getLawyerTheme(accentKey) : undefined}
        onClick={() => handleSelectCase(item.id)}
      >
        <div className="case-faq-card-top">
          <span className="faq-tag case-faq-tag">
            <span className="faq-tag-icon"><CaseReviewIcon /></span>
            Review
          </span>
          <p className="faq-priority case-review-cta">Open review</p>
        </div>

        <div className="case-faq-card-main">
          <div className="case-list-top">
            <strong>{item.title}</strong>
            <strong>{item.progressPercent}%</strong>
          </div>
          <p>{secondaryName}</p>
          <div className="case-list-progress-bar">
            <div style={{ width: `${item.progressPercent}%` }} />
          </div>
          <div className="case-faq-card-footer">
            <small>{item.status}</small>
            {"decisionStatus" in item && item.decisionStatus ? (
              <span className={`mini-status ${item.decisionStatus}`}>{item.decisionStatus}</span>
            ) : null}
          </div>
        </div>
      </button>
    );
  }

  function renderCaseOverview(details) {
    return (
      <div className="progress-card workspace-overview-card">
        <div className="progress-meta">
          <div>
            <p className="muted">Issue summary</p>
            <h3>{details.case.title}</h3>
          </div>
          <strong>{details.case.progressPercent}%</strong>
        </div>
        <p className="case-summary-text">{details.case.summary}</p>
        <div className="case-meta-row case-meta-row-rich">
          <span className={`mini-status ${details.case.decisionStatus}`}>{details.case.decisionStatus}</span>
          <span className="case-meta-pill">{details.case.status}</span>
          <span>{new Date(details.case.createdAt).toLocaleString()}</span>
        </div>
        {details.case.decisionNote ? (
          <p className="case-note"><strong>Lawyer note:</strong> {details.case.decisionNote}</p>
        ) : null}
        <div className="progress-bar">
          <div style={{ width: `${details.case.progressPercent}%` }} />
        </div>
      </div>
    );
  }

  function renderMessageArea(details, placeholderText) {
    const emptyMessage = isLawyer
      ? "No updates yet. Once you send a note, the client will see it here."
      : "No messages yet. Once the conversation starts, updates will appear here.";

    return (
      <div className="conversation-shell">
        <div className="conversation-header">
          <div>
            <p className="panel-kicker">Private conversation</p>
            <h3>Case messages</h3>
          </div>
          <div className="conversation-header-meta">
            <span className="conversation-dot" />
            <span>{details.messages.length} message{details.messages.length === 1 ? "" : "s"}</span>
          </div>
        </div>

        <div className="message-feed conversation-thread">
          {details.messages.length > 0 ? (
            details.messages.map((item) => {
              const isOwnMessage = item.senderType === currentSenderType;

              return (
                <article
                  key={item.id}
                  className={`message-card ${item.senderType} ${isOwnMessage ? "own-message" : "other-message"}`}
                >
                  <div className="message-chip-row">
                    <span className={`message-role-badge ${item.senderType}`}>{item.senderType}</span>
                    <span className="message-time">{formatTimestamp(item.createdAt)}</span>
                  </div>
                  <div className="message-meta">
                    <strong>{item.senderName}</strong>
                  </div>
                  <p>{item.body}</p>
                  {item.attachmentUrl ? (
                    <a
                      className="message-attachment"
                      href={`${API_BASE}${item.attachmentUrl}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {item.attachmentName}
                    </a>
                  ) : null}
                </article>
              );
            })
          ) : (
            <div className="conversation-empty">
              <p>{emptyMessage}</p>
            </div>
          )}
        </div>

        {canMessage ? (
          <form className="message-form conversation-composer" onSubmit={handleMessageSend}>
            <div className="composer-heading">
              <div>
                <p className="panel-kicker">Reply</p>
                <h4>Send a secure update</h4>
              </div>
              <span className="composer-note">Files and messages stay attached to this case.</span>
            </div>
            <textarea
              value={messageInput}
              onChange={(event) => setMessageInput(event.target.value)}
              placeholder={placeholderText}
            />
            <div className="message-actions">
              <label className={`upload-button ${uploading ? "disabled" : ""}`}>
                <input type="file" onChange={handleUpload} disabled={uploading} />
                Upload file
              </label>
              <button type="submit">Send message</button>
            </div>
          </form>
        ) : (
          <p className="hero-copy conversation-locked-copy">
            {details.case.decisionStatus === "pending"
              ? isLawyer
                ? "Messaging opens after you accept the case."
                : "Messaging opens after the lawyer accepts the case."
              : details.case.decisionStatus === "declined"
                ? isLawyer
                  ? "This request was declined. Return to your case list to review other requests."
                  : "This request was declined. Create a new request with another lawyer to continue."
                : "Sign in to continue."}
          </p>
        )}
      </div>
    );
  }

  async function refreshCases(preferredCaseId) {
    const caseItems = await getCases();
    setCases(caseItems);

    const nextCaseId = caseItems.some((item) => item.id === preferredCaseId)
      ? preferredCaseId
      : caseItems[0]?.id || null;

    setSelectedCaseId(nextCaseId);

    if (nextCaseId) {
      const details = await getCaseDetails(nextCaseId);
      setActiveCase(details);
    } else {
      setActiveCase(null);
    }
  }

  async function handleSelectCase(caseId) {
    setError("");
    setStatus("Loading case...");
    try {
      const details = await getCaseDetails(caseId);
      setSelectedCaseId(caseId);
      setActiveCase(details);
      if (isClient) {
        setClientView("details");
      } else if (isLawyer) {
        setLawyerView("details");
      }
      setDecisionNote("");
      setStatus("");
    } catch (requestError) {
      setError(requestError.message);
      setStatus("");
    }
  }

  async function handleCaseCreate(event) {
    event.preventDefault();
    if (!isClient) {
      setError("Only signed-in client accounts can create case requests.");
      return;
    }

    setError("");
    setStatus("Sending case request...");

    try {
      const data = await createCase({
        summary: issueSummary,
        lawyerId: Number(selectedLawyerId)
      });

      setIssueSummary("");
      setSelectedCaseId(data.case.id);
      setActiveCase(data);
      setClientView("details");
      await refreshCases(data.case.id);
      setStatus(`Case request sent to ${data.lawyer.name}.`);
    } catch (requestError) {
      setError(requestError.message);
      setStatus("");
    }
  }

  async function handleDecision(decision) {
    if (!activeCase?.case?.id || !isLawyer) {
      return;
    }

    setError("");
    setStatus(`${decision === "accepted" ? "Accepting" : "Declining"} case...`);

    try {
      const details = await decideCase(activeCase.case.id, {
        decision,
        note: decisionNote
      });
      setActiveCase(details);
      setDecisionNote("");
      await refreshCases(details.case.id);
      setStatus(`Case ${decision}.`);
    } catch (requestError) {
      setError(requestError.message);
      setStatus("");
    }
  }

  async function handleMessageSend(event) {
    event.preventDefault();
    if (!activeCase?.case?.id || !messageInput.trim()) {
      return;
    }

    setStatus("Sending message...");
    setError("");

    try {
      const data = await sendCaseMessage(activeCase.case.id, {
        body: messageInput
      });

      setActiveCase((current) => ({
        ...current,
        messages: [...current.messages, data]
      }));
      setMessageInput("");
      setStatus("Message sent.");
    } catch (requestError) {
      setError(requestError.message);
      setStatus("");
    }
  }

  async function handleUpload(event) {
    const file = event.target.files?.[0];
    if (!file || !activeCase?.case?.id) {
      return;
    }

    setUploading(true);
    setStatus("Uploading file...");
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("message", `Uploaded file: ${file.name}`);

      const data = await uploadCaseAttachment(activeCase.case.id, formData);
      setActiveCase((current) => ({
        ...current,
        messages: [...current.messages, data]
      }));
      setStatus(`Uploaded ${file.name}.`);
      event.target.value = "";
    } catch (requestError) {
      setError(requestError.message);
      setStatus("");
    } finally {
      setUploading(false);
    }
  }

  function updateStepDraft(stepId, field, value) {
    setStepDrafts((current) => ({
      ...current,
      [stepId]: {
        ...(current[stepId] || {}),
        [field]: value
      }
    }));
  }

  async function handleStepSave(stepId) {
    if (!isLawyer || !activeCase?.case?.id) {
      return;
    }

    const draft = stepDrafts[stepId];
    if (!draft) {
      return;
    }

    setError("");
    setStatus("Saving case step...");

    try {
      const details = await updateCaseStep(activeCase.case.id, stepId, draft);
      setActiveCase(details);
      await refreshCases(details.case.id);
      setStatus("Case step updated.");
    } catch (requestError) {
      setError(requestError.message);
      setStatus("");
    }
  }

  async function handleStepDelete(stepId) {
    if (!isLawyer || !activeCase?.case?.id) {
      return;
    }

    setError("");
    setStatus("Removing case step...");

    try {
      const details = await deleteCaseStep(activeCase.case.id, stepId);
      setActiveCase(details);
      await refreshCases(details.case.id);
      setStatus("Case step removed.");
    } catch (requestError) {
      setError(requestError.message);
      setStatus("");
    }
  }

  async function handleStepCreate(event) {
    event.preventDefault();
    if (!isLawyer || !activeCase?.case?.id) {
      return;
    }

    setError("");
    setStatus("Adding case step...");

    try {
      const details = await createCaseStep(activeCase.case.id, newStep);
      setActiveCase(details);
      setNewStep({ label: "", state: "upcoming" });
      await refreshCases(details.case.id);
      setStatus("Case step added.");
    } catch (requestError) {
      setError(requestError.message);
      setStatus("");
    }
  }

  function handleStepDragStart(event, stepId) {
    if (!isLawyer) {
      return;
    }

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(stepId));
    setDraggedStepId(stepId);
    setDragOverStepId(stepId);
  }

  function handleStepDragOver(event, stepId) {
    if (!isLawyer || !draggedStepId) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (draggedStepId !== stepId) {
      setDragOverStepId(stepId);
    }
  }

  function resetStepDragState() {
    setDraggedStepId(null);
    setDragOverStepId(null);
  }

  async function handleStepDrop(event, targetStepId) {
    event.preventDefault();
    if (!isLawyer || !activeCase?.case?.id || !draggedStepId) {
      resetStepDragState();
      return;
    }

    const nextUpdates = reorderUpdates(activeCase.updates, draggedStepId, targetStepId);
    resetStepDragState();
    if (nextUpdates === activeCase.updates) {
      return;
    }

    setError("");
    setStatus("Reordering case steps...");

    try {
      setActiveCase((current) => ({
        ...current,
        updates: nextUpdates
      }));
      const details = await reorderCaseSteps(activeCase.case.id, nextUpdates.map((step) => step.id));
      setActiveCase(details);
      await refreshCases(details.case.id);
      setStatus("Case steps reordered.");
    } catch (requestError) {
      setError(requestError.message);
      setStatus("");
      const details = await getCaseDetails(activeCase.case.id).catch(() => null);
      if (details) {
        setActiveCase(details);
      }
    }
  }

  if (isAdmin) {
    return (
      <section className="grid lower-grid">
        <article className="panel access-panel">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">Access blocked</p>
              <h2>Admin accounts cannot open case messaging</h2>
            </div>
          </div>
          <p className="hero-copy">
            This workspace is reserved for the client and the assigned lawyer. Admin accounts can still create lawyer profiles from the home dashboard.
          </p>
        </article>
      </section>
    );
  }

  if (isGuest) {
    return (
      <>
        {error ? <p className="feedback error">{error}</p> : null}
        {status ? <p className="feedback">{status}</p> : null}

        <section className="grid lower-grid single-panel-grid client-messaging-grid expanded guest-messaging-grid">
          <div className="panel referral-panel client-cases-panel">
            <div className="panel-header">
              <div>
                <p className="panel-kicker">Lawyer directory</p>
                <h2>Browse available lawyers</h2>
              </div>
            </div>

            <div className="case-list">
              {loadingCases ? (
                <p className="muted">Loading lawyers...</p>
              ) : lawyers.length > 0 ? (
                lawyers.map((lawyer) => (
                  <button
                    key={lawyer.id}
                    type="button"
                    className={`case-list-item case-faq-card ${Number(selectedLawyerId) === lawyer.id ? "selected" : ""}`}
                    style={getLawyerTheme(lawyer.name)}
                    onClick={() => setSelectedLawyerId(lawyer.id)}
                  >
                    <div className="case-faq-card-top">
                      <span className="faq-tag case-faq-tag">{lawyer.specialty}</span>
                      <p className="faq-priority case-review-cta">View profile</p>
                    </div>

                    <div className="case-faq-card-main">
                      <div className="case-list-top">
                        <strong>{lawyer.name}</strong>
                        <strong>{getInitials(lawyer.name)}</strong>
                      </div>
                      <p>{lawyer.firm}</p>
                      {renderLawyerReviewSummary(lawyer)}
                      <div className="case-faq-card-footer">
                        <small>{lawyer.city}</small>
                        <span className="case-meta-pill">Guest preview</span>
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <p className="muted">No lawyers are available right now.</p>
              )}
            </div>
          </div>

          <div className="panel messaging-panel">
            <div className="panel-header">
              <div>
                <p className="panel-kicker">Guest workspace</p>
                <h2>{selectedLawyer ? selectedLawyer.name : "Choose a lawyer"}</h2>
              </div>
              <span className="badge">View only</span>
            </div>

            {selectedLawyer ? (
              <div className="client-case-shell lawyer-case-shell">
                <aside className="client-case-sidebar lawyer-case-sidebar">
                  <div className="client-case-sidebar-header">
                    <p className="panel-kicker">Preview flow</p>
                    <h3>How access works</h3>
                  </div>
                  <div className="timeline">
                    <article className="timeline-step completed">
                      <span />
                      <div>
                        <h4>Browse lawyers</h4>
                        <p>Compare firms and specializations in guest mode.</p>
                      </div>
                    </article>
                    <article className="timeline-step current">
                      <span />
                      <div>
                        <h4>Create a client account</h4>
                        <p>Sign in to submit a matter for review.</p>
                      </div>
                    </article>
                    <article className="timeline-step upcoming">
                      <span />
                      <div>
                        <h4>Request representation</h4>
                        <p>Clients can open a case request with the selected lawyer.</p>
                      </div>
                    </article>
                    <article className="timeline-step upcoming">
                      <span />
                      <div>
                        <h4>Private messaging opens</h4>
                        <p>The secure thread becomes available after the lawyer accepts.</p>
                      </div>
                    </article>
                  </div>
                </aside>

                <div className="client-case-main">
                  <div className="progress-card workspace-overview-card" style={getLawyerTheme(selectedLawyer.name)}>
                    <div className="progress-meta">
                      <div>
                        <p className="muted">Lawyer profile</p>
                        <h3>{selectedLawyer.name}</h3>
                      </div>
                      <span className="case-meta-pill">{selectedLawyer.city}</span>
                    </div>
                    <p className="case-summary-text">{selectedLawyer.bio}</p>
                    <div className="case-meta-row case-meta-row-rich">
                      <span className="faq-tag case-faq-tag">{selectedLawyer.specialty}</span>
                      <span className="case-meta-pill">{selectedLawyer.firm}</span>
                      {renderLawyerReviewSummary(selectedLawyer)}
                    </div>
                    <div className="progress-bar">
                      <div style={{ width: "100%" }} />
                    </div>
                  </div>

                  <div className="conversation-shell">
                    <div className="conversation-header">
                      <div>
                        <p className="panel-kicker">Private conversation</p>
                        <h3>Messaging preview</h3>
                      </div>
                      <div className="conversation-header-meta">
                        <span className="conversation-dot" />
                        <span>Locked for guests</span>
                      </div>
                    </div>

                    <div className="workspace-summary-stack">
                      <div className="new-case-contact-card">
                        <span>Email</span>
                        <strong>{selectedLawyer.email}</strong>
                      </div>
                      <div className="new-case-contact-card">
                        <span>Phone</span>
                        <strong>{selectedLawyer.phone}</strong>
                      </div>
                    </div>

                    <p className="hero-copy conversation-locked-copy">
                      Guests can review lawyer details, but they cannot create a case or start a private thread from this screen.
                    </p>

                    <div className="decision-actions">
                      <Link href={getReviewHref(selectedLawyer.name)} className="link-button">
                        Read full reviews
                      </Link>
                      <Link href="/signup" className="link-button">
                        Create client account
                      </Link>
                      <Link href="/" className="link-button ghost">
                        Sign in
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="muted">Select a lawyer from the directory to open the preview workspace.</p>
            )}
          </div>
        </section>
      </>
    );
  }

  if (isClient) {
    return (
      <>
        {error ? <p className="feedback error">{error}</p> : null}
        {status ? <p className="feedback">{status}</p> : null}

        <section className={`grid lower-grid single-panel-grid client-messaging-grid ${isExpandedWorkspace ? "expanded" : ""}`}>
          {clientView === "list" ? (
            <div className="panel referral-panel client-cases-panel">
              <div className="panel-header">
                <div>
                  <p className="panel-kicker">Your cases</p>
                  <h2>Open a case or start a new request</h2>
                </div>
              </div>

              <div className="case-list">
                {loadingCases ? (
                  <p className="muted">Loading cases...</p>
                ) : cases.length > 0 ? (
                  cases.map((item) => renderCaseListItem(item, item.lawyerName, item.lawyerName))
                ) : (
                  <p className="muted">No cases yet.</p>
                )}
              </div>

              <div className="client-case-launcher">
                <button
                  type="button"
                  onClick={() => setClientView("create")}
                >
                  Create new case
                </button>
              </div>
            </div>
          ) : clientView === "create" ? (
            <div className="panel messaging-panel new-case-panel">
              <div className="panel-header">
                <div>
                  <p className="panel-kicker">New request</p>
                  <h2>Choose counsel and describe your matter</h2>
                </div>
                <button type="button" className="button-secondary panel-back-button" onClick={() => setClientView("list")}>
                  Back to cases
                </button>
              </div>

              <div className="new-case-shell">
                <div className="new-case-main">
                  <div className="new-case-section-label">
                    <span>Current engagement</span>
                  </div>
                  <div className="new-case-hero-card">
                    <div>
                      <p className="panel-kicker">Cases / Active / New request</p>
                      <h3>Start a new legal request</h3>
                    </div>
                    <span className="case-meta-pill">1 case action</span>
                  </div>

                  <div className="new-case-section-label">
                    <span>Select counsel</span>
                  </div>
                  <div className="new-case-lawyer-list">
                    {lawyers.map((lawyer) => (
                      <div
                        key={lawyer.id}
                        role="button"
                        tabIndex={0}
                        className={`new-case-lawyer-card ${Number(selectedLawyerId) === lawyer.id ? "selected" : ""}`}
                        style={getLawyerTheme(lawyer.name)}
                        onClick={() => setSelectedLawyerId(lawyer.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setSelectedLawyerId(lawyer.id);
                          }
                        }}
                      >
                        <div className="new-case-lawyer-avatar">{getInitials(lawyer.name)}</div>
                        <div className="new-case-lawyer-copy">
                          <strong>{lawyer.name}</strong>
                          <span>{lawyer.firm}</span>
                        </div>
                        <div className="new-case-lawyer-meta">
                          <p className="panel-kicker">Specialization</p>
                          <span className="faq-tag case-faq-tag new-case-specialty-tag">{lawyer.specialty}</span>
                          <small>{lawyer.city}</small>
                        </div>
                      </div>
                    ))}
                  </div>

                  <form className="referral-form new-case-form" onSubmit={handleCaseCreate}>
                    <div className="new-case-section-label">
                      <span>Describe your matter</span>
                    </div>
                    <div className="new-case-textarea-shell">
                      <div className="new-case-textarea-top">
                        <h3>State your case...</h3>
                      </div>
                      <textarea
                        value={issueSummary}
                        onChange={(event) => setIssueSummary(event.target.value)}
                        placeholder="Describe your legal matter in full. Include relevant dates, parties involved, and the outcome you seek. Your counsel will review and respond within 1-2 business days."
                      />
                      <div className="new-case-form-footer">
                        <p>Confidential. Reviewed within 1-2 business days.</p>
                        <button type="submit">Submit matter</button>
                      </div>
                    </div>
                  </form>
                </div>

                <aside className="new-case-sidebar">
                  {selectedLawyer ? (
                    <div className="new-case-profile-card" style={getLawyerTheme(selectedLawyer.name)}>
                      <div className="new-case-profile-top">
                        <div className="new-case-profile-avatar">{getInitials(selectedLawyer.name)}</div>
                        <div>
                          <h3>{selectedLawyer.name}</h3>
                          <p>{selectedLawyer.firm}</p>
                        </div>
                      </div>

                      <div className="new-case-profile-section">
                        <p className="panel-kicker">About</p>
                        <p>{selectedLawyer.bio}</p>
                      </div>

                      <div className="new-case-profile-section">
                        <p className="panel-kicker">Specialization</p>
                        <span className="faq-tag case-faq-tag new-case-specialty-tag">{selectedLawyer.specialty}</span>
                        <p className="new-case-profile-location">{selectedLawyer.city}</p>
                      </div>

                      <div className="new-case-profile-section">
                        <p className="panel-kicker">Client review</p>
                        {renderLawyerReviewSummary(selectedLawyer)}
                        <Link href={getReviewHref(selectedLawyer.name)} className="link-button">
                          Read full reviews
                        </Link>
                      </div>

                      <div className="new-case-profile-section">
                        <p className="panel-kicker">Contact</p>
                        <div className="new-case-contact-card">
                          <div className="new-case-contact-icon">
                            <EmailIcon />
                          </div>
                          <div className="new-case-contact-copy">
                            <span>Email</span>
                            <strong>{selectedLawyer.email}</strong>
                          </div>
                        </div>
                        <div className="new-case-contact-card">
                          <div className="new-case-contact-icon">
                            <PhoneIcon />
                          </div>
                          <div className="new-case-contact-copy">
                            <span>Phone</span>
                            <strong>{selectedLawyer.phone}</strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="new-case-profile-card">
                      <p className="muted">Select a lawyer to see their profile and submit your request.</p>
                    </div>
                  )}
                </aside>
              </div>
            </div>
          ) : activeCase ? (
            <div className="panel messaging-panel">
              <div className="panel-header">
                <div>
                  <p className="panel-kicker">Case workspace</p>
                  <h2>{caseLabel}</h2>
                </div>
                <button type="button" className="button-secondary panel-back-button" onClick={() => setClientView("list")}>
                  Back to cases
                </button>
              </div>

              <div className="client-case-shell lawyer-case-shell">
                <aside className="client-case-sidebar lawyer-case-sidebar">
                  <div className="client-case-sidebar-header">
                    <p className="panel-kicker">Case steps</p>
                    <h3>{activeCase.case.progressPercent}% complete</h3>
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
                </aside>

                <div className="client-case-main">
                  {renderCaseOverview(activeCase)}
                  {renderMessageArea(activeCase, "Send a message to your lawyer")}
                </div>
              </div>
            </div>
          ) : (
            <div className="panel messaging-panel">
              <div className="panel-header">
                <div>
                  <p className="panel-kicker">Case workspace</p>
                  <h2>No case selected</h2>
                </div>
                <button type="button" className="button-secondary panel-back-button" onClick={() => setClientView("list")}>
                  Back to cases
                </button>
              </div>
              <p className="muted">Select one of your cases to open the workspace.</p>
            </div>
          )}
        </section>
      </>
    );
  }

  if (isLawyer) {
    return (
      <>
        {error ? <p className="feedback error">{error}</p> : null}
        {status ? <p className="feedback">{status}</p> : null}

        <section className={`grid lower-grid single-panel-grid client-messaging-grid ${isExpandedWorkspace ? "expanded" : ""}`}>
          {lawyerView === "list" ? (
            <div className="panel referral-panel">
              <div className="panel-header">
                <div>
                  <p className="panel-kicker">Case inbox</p>
                  <h2>Open an assigned case</h2>
                </div>
              </div>

              <div className="case-list">
                {loadingCases ? (
                  <p className="muted">Loading cases...</p>
                ) : cases.length > 0 ? (
                  cases.map((item) => renderCaseListItem(item, item.clientName, item.lawyerName || item.title))
                ) : (
                  <p className="muted">No case requests have been assigned to this lawyer account yet.</p>
                )}
              </div>
            </div>
          ) : activeCase ? (
            <div className="panel messaging-panel">
              <div className="panel-header">
                <div>
                  <p className="panel-kicker">Lawyer workspace</p>
                  <h2>{caseLabel}</h2>
                </div>
                <button type="button" className="button-secondary panel-back-button" onClick={() => setLawyerView("list")}>
                  Back to cases
                </button>
              </div>

              {activeCase.case.decisionStatus === "pending" ? (
                <div className="decision-panel">
                  <p className="hero-copy">
                    Review the issue summary, then accept or decline the request. The private thread opens only after acceptance.
                  </p>
                  <textarea
                    className="decision-note"
                    value={decisionNote}
                    onChange={(event) => setDecisionNote(event.target.value)}
                    placeholder="Optional note for the client"
                  />
                  <div className="decision-actions">
                    <button type="button" onClick={() => handleDecision("accepted")}>Accept case</button>
                    <button type="button" className="button-secondary" onClick={() => handleDecision("declined")}>Decline case</button>
                  </div>
                </div>
              ) : null}

              <div className="client-case-shell">
                <aside className="client-case-sidebar">
                  <div className="client-case-sidebar-header">
                    <p className="panel-kicker">Case steps</p>
                    <h3>{activeCase.case.progressPercent}% complete</h3>
                  </div>
                  <div className="timeline">
                    {activeCase.updates.map((step) => (
                      <form
                        key={step.id}
                        className={`timeline-step timeline-step-editor ${step.state} ${draggedStepId === step.id ? "dragging" : ""} ${dragOverStepId === step.id && draggedStepId !== step.id ? "drag-target" : ""}`}
                        onSubmit={(event) => {
                          event.preventDefault();
                          handleStepSave(step.id);
                        }}
                        onDragOver={(event) => handleStepDragOver(event, step.id)}
                        onDrop={(event) => handleStepDrop(event, step.id)}
                      >
                        <span />
                        <div className="timeline-step-editor-body">
                          <input
                            value={stepDrafts[step.id]?.label || ""}
                            onChange={(event) => updateStepDraft(step.id, "label", event.target.value)}
                            placeholder="Step label"
                          />
                          <div className="timeline-step-editor-actions">
                            <select
                              value={stepDrafts[step.id]?.state || "upcoming"}
                              onChange={(event) => updateStepDraft(step.id, "state", event.target.value)}
                            >
                              {STEP_STATE_OPTIONS.map((option) => (
                                <option key={option} value={option}>{option}</option>
                              ))}
                            </select>
                            <button type="submit">Save</button>
                            <button
                              type="button"
                              className="button-secondary"
                              onClick={() => handleStepDelete(step.id)}
                            >
                              Remove
                            </button>
                            <button
                              type="button"
                              className="timeline-step-handle"
                              draggable
                              onDragStart={(event) => handleStepDragStart(event, step.id)}
                              onDragEnd={resetStepDragState}
                            >
                              Drag
                            </button>
                          </div>
                        </div>
                      </form>
                    ))}
                  </div>
                  <form className="timeline-add-form" onSubmit={handleStepCreate}>
                    <h4>Add case step</h4>
                    <input
                      value={newStep.label}
                      onChange={(event) => setNewStep((current) => ({ ...current, label: event.target.value }))}
                      placeholder="New step label"
                    />
                    <div className="timeline-add-actions">
                      <select
                        value={newStep.state}
                        onChange={(event) => setNewStep((current) => ({ ...current, state: event.target.value }))}
                      >
                        {STEP_STATE_OPTIONS.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                      <button type="submit">Add step</button>
                    </div>
                  </form>
                </aside>

                <div className="client-case-main">
                  {renderCaseOverview(activeCase)}
                  {renderMessageArea(activeCase, "Send an update to your client")}
                </div>
              </div>
            </div>
          ) : (
            <div className="panel messaging-panel">
              <div className="panel-header">
                <div>
                  <p className="panel-kicker">Lawyer workspace</p>
                  <h2>No case selected</h2>
                </div>
                <button type="button" className="button-secondary panel-back-button" onClick={() => setLawyerView("list")}>
                  Back to cases
                </button>
              </div>
              <p className="muted">Select one of your assigned cases to open the workspace.</p>
            </div>
          )}
        </section>
      </>
    );
  }

  return (
    <>
      {error ? <p className="feedback error">{error}</p> : null}
      {status ? <p className="feedback">{status}</p> : null}

      <section className="grid lower-grid">
        <div className="panel referral-panel">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">{isLawyer ? "Case inbox" : isClient ? "Your cases" : "Request a lawyer"}</p>
              <h2>{isLawyer ? "Assigned case requests" : isClient ? "Open a case or start a new request" : "Choose a lawyer and describe the issue"}</h2>
            </div>
          </div>

          <div className="case-list">
            {loadingCases ? (
              <p className="muted">Loading cases...</p>
            ) : cases.length > 0 ? (
              cases.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`case-list-item ${selectedCaseId === item.id ? "selected" : ""}`}
                  onClick={() => handleSelectCase(item.id)}
                >
                  <div className="case-list-top">
                    <strong>{item.title}</strong>
                    {isClient ? (
                      <strong>{item.progressPercent}%</strong>
                    ) : (
                      <span className={`mini-status ${item.decisionStatus}`}>{item.decisionStatus}</span>
                    )}
                  </div>
                  <p>{isLawyer ? item.clientName : item.lawyerName}</p>
                  {isClient ? (
                    <>
                      <div className="case-list-progress-bar">
                        <div style={{ width: `${item.progressPercent}%` }} />
                      </div>
                      <small>{item.status}</small>
                    </>
                  ) : (
                    <small>{item.status}</small>
                  )}
                </button>
              ))
            ) : (
              <p className="muted">No cases yet.</p>
            )}
          </div>

          {isClient ? (
            <div className="client-case-launcher">
              <button
                type="button"
                className={showCreateCaseForm ? "button-secondary" : ""}
                onClick={() => setShowCreateCaseForm((current) => !current)}
              >
                {showCreateCaseForm ? "Close new case request" : "Create new case"}
              </button>

              {showCreateCaseForm ? (
                <div className="client-case-drawer">
                  <div className="client-case-drawer-header">
                    <div>
                      <p className="panel-kicker">New request</p>
                      <h3>Pick a lawyer and ask for representation</h3>
                    </div>
                  </div>

                  <div className="lawyer-grid">
                    {lawyers.map((lawyer) => (
                      <button
                        key={lawyer.id}
                        type="button"
                        className={`lawyer-card ${Number(selectedLawyerId) === lawyer.id ? "selected" : ""}`}
                        onClick={() => setSelectedLawyerId(lawyer.id)}
                      >
                        <strong>{lawyer.name}</strong>
                        <span>{lawyer.firm}</span>
                        <p>{lawyer.specialty}</p>
                        <small>{lawyer.city}</small>
                      </button>
                    ))}
                  </div>

                  {selectedLawyer ? (
                    <div className="selected-lawyer">
                      <h3>{selectedLawyer.name}</h3>
                      <p>{selectedLawyer.bio}</p>
                      <p>{selectedLawyer.email}</p>
                      <p>{selectedLawyer.phone}</p>
                    </div>
                  ) : null}

                  <form className="referral-form" onSubmit={handleCaseCreate}>
                    <textarea
                      value={issueSummary}
                      onChange={(event) => setIssueSummary(event.target.value)}
                      placeholder="Describe your issue so the lawyer can review and decide whether to accept the case."
                    />
                    <button type="submit">Send case request</button>
                  </form>
                </div>
              ) : null}
            </div>
          ) : isLawyer && activeCase?.case?.decisionStatus === "pending" ? (
            <div className="decision-panel">
              <p className="hero-copy">
                Review the issue summary, then accept or decline the request. The private thread opens only after acceptance.
              </p>
              <textarea
                className="decision-note"
                value={decisionNote}
                onChange={(event) => setDecisionNote(event.target.value)}
                placeholder="Optional note for the client"
              />
              <div className="decision-actions">
                <button type="button" onClick={() => handleDecision("accepted")}>Accept case</button>
                <button type="button" className="button-secondary" onClick={() => handleDecision("declined")}>Decline case</button>
              </div>
            </div>
          ) : (
            <p className="hero-copy">
              {isGuest
                ? "Guest mode can preview lawyers, but sending a case request requires a client account."
                : "Select a case from the list to review its status and conversation."}
            </p>
          )}
        </div>

        <div className="panel messaging-panel">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">{isLawyer ? "Lawyer workspace" : "Case workspace"}</p>
              <h2>{activeCase ? caseLabel : "Messaging and case progress"}</h2>
            </div>
            <span className="badge">{activeCase?.case?.status || "No case selected"}</span>
          </div>

          {activeCase ? (
            <>
              <div className="workspace-summary-stack">
                {renderCaseOverview(activeCase)}
                <div className="timeline">
                  {activeCase.updates.map((step) => (
                    isLawyer ? (
                      <form
                        key={step.id}
                        className={`timeline-step timeline-step-editor ${step.state}`}
                        onSubmit={(event) => {
                          event.preventDefault();
                          handleStepSave(step.id);
                        }}
                      >
                        <span />
                        <div className="timeline-step-editor-body">
                          <input
                            value={stepDrafts[step.id]?.label || ""}
                            onChange={(event) => updateStepDraft(step.id, "label", event.target.value)}
                            placeholder="Step label"
                          />
                          <div className="timeline-step-editor-actions">
                            <select
                              value={stepDrafts[step.id]?.state || "upcoming"}
                              onChange={(event) => updateStepDraft(step.id, "state", event.target.value)}
                            >
                              {STEP_STATE_OPTIONS.map((option) => (
                                <option key={option} value={option}>{option}</option>
                              ))}
                            </select>
                            <button type="submit">Save</button>
                            <button
                              type="button"
                              className="button-secondary"
                              onClick={() => handleStepDelete(step.id)}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </form>
                    ) : (
                      <article key={step.id} className={`timeline-step ${step.state}`}>
                        <span />
                        <div>
                          <h4>{step.label}</h4>
                          <p>{step.state}</p>
                        </div>
                      </article>
                    )
                  ))}
                </div>
                {isLawyer ? (
                  <form className="timeline-add-form" onSubmit={handleStepCreate}>
                    <h4>Add case step</h4>
                    <input
                      value={newStep.label}
                      onChange={(event) => setNewStep((current) => ({ ...current, label: event.target.value }))}
                      placeholder="New step label"
                    />
                    <div className="timeline-add-actions">
                      <select
                        value={newStep.state}
                        onChange={(event) => setNewStep((current) => ({ ...current, state: event.target.value }))}
                      >
                        {STEP_STATE_OPTIONS.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                      <button type="submit">Add step</button>
                    </div>
                  </form>
                ) : null}
              </div>
              {renderMessageArea(activeCase, isLawyer ? "Send an update to your client" : "Send a message to your lawyer")}
            </>
          ) : (
            <p className="muted">
              {isLawyer
                ? "No case requests have been assigned to this lawyer account yet."
                : isClient
                  ? "Select one of your cases to open the workspace, or create a new case request."
                  : "Choose a lawyer and submit your issue to start a case request."}
            </p>
          )}
        </div>
      </section>
    </>
  );
}
