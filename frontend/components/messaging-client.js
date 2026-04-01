"use client";

import { useEffect, useMemo, useState } from "react";

import { API_BASE, createCase, getDashboard, sendCaseMessage, uploadCaseAttachment } from "../lib/api";
import { loadSession } from "../lib/session";

export default function MessagingClient() {
  const [session, setSession] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [selectedLawyerId, setSelectedLawyerId] = useState(1);
  const [messageInput, setMessageInput] = useState("");
  const [clientName, setClientName] = useState("Sample Client");
  const [caseTitle, setCaseTitle] = useState("Need help reviewing my legal issue");
  const [caseSummary, setCaseSummary] = useState("The chatbot marked this issue as complex and suggested a lawyer.");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const currentSession = loadSession();
    setSession(currentSession);
    if (currentSession?.name) {
      setClientName(currentSession.name);
    }
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const data = await getDashboard();
        setDashboard(data);
        if (data.lawyers?.[0]?.id) {
          setSelectedLawyerId(data.lawyers[0].id);
        }
      } catch (requestError) {
        setError(requestError.message);
      }
    }

    load();
  }, []);

  const role = session?.role || "guest";
  const isAdmin = role === "admin";
  const isGuest = role === "guest";
  const isClient = role === "client";
  const isLawyer = role === "lawyer";

  const selectedLawyer = useMemo(() => {
    return dashboard?.lawyers?.find((lawyer) => lawyer.id === Number(selectedLawyerId));
  }, [dashboard, selectedLawyerId]);

  async function handleCaseCreate(event) {
    event.preventDefault();
    if (!isClient) {
      setError("Only signed-in client accounts can create referral cases.");
      return;
    }

    setStatus("Creating referral...");
    setError("");

    try {
      const data = await createCase({
        title: caseTitle,
        summary: caseSummary,
        clientName,
        lawyerId: Number(selectedLawyerId)
      });

      setDashboard((current) => ({
        ...(current || {}),
        activeCase: data
      }));
      setStatus(`Referral created with ${data.lawyer.name}.`);
    } catch (requestError) {
      setError(requestError.message);
      setStatus("");
    }
  }

  async function handleMessageSend(event) {
    event.preventDefault();
    if (!dashboard?.activeCase?.case?.id || !messageInput.trim()) {
      return;
    }

    setStatus("Sending message...");
    setError("");

    try {
      const data = await sendCaseMessage(dashboard.activeCase.case.id, {
        body: messageInput
      });

      setDashboard((current) => ({
        ...(current || {}),
        activeCase: {
          ...current.activeCase,
          messages: [...current.activeCase.messages, data]
        }
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
    if (!file || !dashboard?.activeCase?.case?.id) {
      return;
    }

    setUploading(true);
    setStatus("Uploading file...");
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("message", `Uploaded file: ${file.name}`);

      const data = await uploadCaseAttachment(dashboard.activeCase.case.id, formData);
      setDashboard((current) => ({
        ...(current || {}),
        activeCase: {
          ...current.activeCase,
          messages: [...current.activeCase.messages, data]
        }
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

  if (isAdmin) {
    return (
      <section className="grid lower-grid">
        <article className="panel access-panel">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">Access blocked</p>
              <h2>Admin accounts cannot open message threads</h2>
            </div>
          </div>
          <p className="hero-copy">
            This workspace is reserved for the client and the assigned lawyer. Admin accounts can still create lawyer profiles from the home dashboard.
          </p>
        </article>
      </section>
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
              <p className="panel-kicker">{isLawyer ? "Assigned counsel" : "Part 2"}</p>
              <h2>{isLawyer ? "Your lawyer profile" : "Lawyer referral"}</h2>
            </div>
          </div>

          <div className="lawyer-grid">
            {dashboard?.lawyers?.map((lawyer) => (
              <button
                key={lawyer.id}
                type="button"
                className={`lawyer-card ${Number(selectedLawyerId) === lawyer.id ? "selected" : ""}`}
                onClick={() => setSelectedLawyerId(lawyer.id)}
                disabled={isLawyer}
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

          {isClient ? (
            <form className="referral-form" onSubmit={handleCaseCreate}>
              <input value={clientName} onChange={(event) => setClientName(event.target.value)} placeholder="Client name" />
              <input value={caseTitle} onChange={(event) => setCaseTitle(event.target.value)} placeholder="Case title" />
              <textarea
                value={caseSummary}
                onChange={(event) => setCaseSummary(event.target.value)}
                placeholder="Short referral summary"
              />
              <button type="submit">Create referral case</button>
            </form>
          ) : (
            <p className="hero-copy">
              {isGuest
                ? "Guest mode can preview the lawyer directory, but referral creation requires a signed-in client account."
                : "Lawyer accounts receive assigned cases here and can continue protected communication inside the thread on the right."}
            </p>
          )}
        </div>

        <div className="panel messaging-panel">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">{isLawyer ? "Lawyer workspace" : "Client workspace"}</p>
              <h2>Messaging and case progress</h2>
            </div>
            <span className="badge">{dashboard?.activeCase?.case?.status || "No case loaded"}</span>
          </div>

          {dashboard?.activeCase ? (
            <>
              <div className="progress-card">
                <div className="progress-meta">
                  <div>
                    <p className="muted">Current case</p>
                    <h3>{dashboard.activeCase.case.title}</h3>
                  </div>
                  <strong>{dashboard.activeCase.case.progressPercent}%</strong>
                </div>
                <div className="progress-bar">
                  <div style={{ width: `${dashboard.activeCase.case.progressPercent}%` }} />
                </div>
                <div className="timeline">
                  {dashboard.activeCase.updates.map((step) => (
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
                {dashboard.activeCase.messages.map((item) => (
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

              {!isGuest ? (
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
                  Guest mode does not allow protected messages or file uploads. Sign in as a client to continue.
                </p>
              )}
            </>
          ) : (
            <p className="muted">
              {isLawyer
                ? "No case has been assigned to this lawyer account yet."
                : "No case has been loaded for this account yet."}
            </p>
          )}
        </div>
      </section>
    </>
  );
}
