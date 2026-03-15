"use client";

import { useEffect, useMemo, useState } from "react";

import { API_BASE, createCase, getDashboard, sendCaseMessage, uploadCaseAttachment } from "../lib/api";
import { loadSession } from "../lib/session";

export default function MessagingClient() {
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
    const session = loadSession();
    if (session?.name) {
      setClientName(session.name);
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

  const selectedLawyer = useMemo(() => {
    return dashboard?.lawyers?.find((lawyer) => lawyer.id === Number(selectedLawyerId));
  }, [dashboard, selectedLawyerId]);

  async function handleCaseCreate(event) {
    event.preventDefault();
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
        ...current,
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
        senderType: "client",
        senderName: clientName,
        body: messageInput
      });

      setDashboard((current) => ({
        ...current,
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
      formData.append("senderType", "client");
      formData.append("senderName", clientName);
      formData.append("message", `Uploaded file: ${file.name}`);

      const data = await uploadCaseAttachment(dashboard.activeCase.case.id, formData);
      setDashboard((current) => ({
        ...current,
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

  return (
    <>
      {error ? <p className="feedback error">{error}</p> : null}
      {status ? <p className="feedback">{status}</p> : null}

      <section className="grid lower-grid">
        <div className="panel referral-panel">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">Part 2</p>
              <h2>Lawyer referral</h2>
            </div>
          </div>

          <div className="lawyer-grid">
            {dashboard?.lawyers?.map((lawyer) => (
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
            <input value={clientName} onChange={(event) => setClientName(event.target.value)} placeholder="Client name" />
            <input value={caseTitle} onChange={(event) => setCaseTitle(event.target.value)} placeholder="Case title" />
            <textarea
              value={caseSummary}
              onChange={(event) => setCaseSummary(event.target.value)}
              placeholder="Short referral summary"
            />
            <button type="submit">Create referral case</button>
          </form>
        </div>

        <div className="panel messaging-panel">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">Client workspace</p>
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

              <form className="message-form" onSubmit={handleMessageSend}>
                <textarea
                  value={messageInput}
                  onChange={(event) => setMessageInput(event.target.value)}
                  placeholder="Send a message to the lawyer or law firm"
                />
                <div className="message-actions">
                  <label className={`upload-button ${uploading ? "disabled" : ""}`}>
                    <input type="file" onChange={handleUpload} disabled={uploading} />
                    Upload file
                  </label>
                  <button type="submit">Send message</button>
                </div>
              </form>
            </>
          ) : (
            <p className="muted">No case has been loaded from the backend yet.</p>
          )}
        </div>
      </section>
    </>
  );
}
