"use client";

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
  sendCaseMessage,
  updateCaseStep,
  uploadCaseAttachment
} from "../lib/api";
import { loadSession } from "../lib/session";

const STEP_STATE_OPTIONS = ["completed", "current", "upcoming"];

function buildStepDrafts(updates = []) {
  return updates.reduce((drafts, step) => {
    drafts[step.id] = {
      label: step.label,
      state: step.state
    };
    return drafts;
  }, {});
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
  const [showCreateCaseForm, setShowCreateCaseForm] = useState(false);
  const [clientView, setClientView] = useState("list");

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

  const caseLabel = useMemo(() => {
    if (!activeCase) {
      return "No case selected";
    }
    if (isLawyer) {
      return activeCase.case.clientName;
    }
    return activeCase.lawyer.name;
  }, [activeCase, isLawyer]);

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
      setShowCreateCaseForm(false);
      setClientView("list");
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

  if (isClient) {
    return (
      <>
        {error ? <p className="feedback error">{error}</p> : null}
        {status ? <p className="feedback">{status}</p> : null}

        <section className="grid lower-grid single-panel-grid client-messaging-grid">
          {clientView === "list" ? (
            <div className="panel referral-panel">
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
                  cases.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`case-list-item ${selectedCaseId === item.id ? "selected" : ""}`}
                      onClick={() => handleSelectCase(item.id)}
                    >
                      <div className="case-list-top">
                        <strong>{item.title}</strong>
                        <strong>{item.progressPercent}%</strong>
                      </div>
                      <p>{item.lawyerName}</p>
                      <div className="case-list-progress-bar">
                        <div style={{ width: `${item.progressPercent}%` }} />
                      </div>
                      <small>{item.status}</small>
                    </button>
                  ))
                ) : (
                  <p className="muted">No cases yet.</p>
                )}
              </div>

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

              <div className="progress-card">
                <div className="progress-meta">
                  <div>
                    <p className="muted">Issue summary</p>
                    <h3>{activeCase.case.title}</h3>
                  </div>
                  <strong>{activeCase.case.progressPercent}%</strong>
                </div>
                <p className="case-summary-text">{activeCase.case.summary}</p>
                <div className="case-meta-row">
                  <span className={`mini-status ${activeCase.case.decisionStatus}`}>{activeCase.case.decisionStatus}</span>
                  <span>{new Date(activeCase.case.createdAt).toLocaleString()}</span>
                </div>
                {activeCase.case.decisionNote ? (
                  <p className="case-note"><strong>Lawyer note:</strong> {activeCase.case.decisionNote}</p>
                ) : null}
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

              <div className="message-feed">
                {activeCase.messages.map((item) => (
                  <article key={item.id} className={`message-card ${item.senderType}`}>
                    <div className="message-meta">
                      <strong>{item.senderName}</strong>
                      <span>{new Date(item.createdAt).toLocaleString()}</span>
                    </div>
                    <p>{item.body}</p>
                    {item.attachmentUrl ? (
                      <a href={`${API_BASE}${item.attachmentUrl}`} target="_blank" rel="noreferrer">
                        {item.attachmentName}
                      </a>
                    ) : null}
                  </article>
                ))}
              </div>

              {canMessage ? (
                <form className="message-form" onSubmit={handleMessageSend}>
                  <textarea
                    value={messageInput}
                    onChange={(event) => setMessageInput(event.target.value)}
                    placeholder="Send a message to your lawyer"
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
                <p className="hero-copy">
                  {activeCase.case.decisionStatus === "pending"
                    ? "Messaging opens after the lawyer accepts the case."
                    : activeCase.case.decisionStatus === "declined"
                      ? "This request was declined. Create a new request with another lawyer to continue."
                      : "Sign in to continue."}
                </p>
              )}
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
              <div className="progress-card">
                <div className="progress-meta">
                  <div>
                    <p className="muted">Issue summary</p>
                    <h3>{activeCase.case.title}</h3>
                  </div>
                  <strong>{activeCase.case.progressPercent}%</strong>
                </div>
                <p className="case-summary-text">{activeCase.case.summary}</p>
                <div className="case-meta-row">
                  <span className={`mini-status ${activeCase.case.decisionStatus}`}>{activeCase.case.decisionStatus}</span>
                  <span>{new Date(activeCase.case.createdAt).toLocaleString()}</span>
                </div>
                {activeCase.case.decisionNote ? (
                  <p className="case-note"><strong>Lawyer note:</strong> {activeCase.case.decisionNote}</p>
                ) : null}
                <div className="progress-bar">
                  <div style={{ width: `${activeCase.case.progressPercent}%` }} />
                </div>
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

              <div className="message-feed">
                {activeCase.messages.map((item) => (
                  <article key={item.id} className={`message-card ${item.senderType}`}>
                    <div className="message-meta">
                      <strong>{item.senderName}</strong>
                      <span>{new Date(item.createdAt).toLocaleString()}</span>
                    </div>
                    <p>{item.body}</p>
                    {item.attachmentUrl ? (
                      <a href={`${API_BASE}${item.attachmentUrl}`} target="_blank" rel="noreferrer">
                        {item.attachmentName}
                      </a>
                    ) : null}
                  </article>
                ))}
              </div>

              {canMessage ? (
                <form className="message-form" onSubmit={handleMessageSend}>
                  <textarea
                    value={messageInput}
                    onChange={(event) => setMessageInput(event.target.value)}
                    placeholder={isLawyer ? "Send an update to your client" : "Send a message to your lawyer"}
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
                <p className="hero-copy">
                  {activeCase.case.decisionStatus === "pending"
                    ? "Messaging opens after the lawyer accepts the case."
                    : activeCase.case.decisionStatus === "declined"
                      ? "This request was declined. Create a new request with another lawyer to continue."
                      : "Sign in to continue."}
                </p>
              )}
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
