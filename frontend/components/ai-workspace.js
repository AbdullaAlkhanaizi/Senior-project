"use client";

import { useEffect, useState } from "react";

import { askLegalAssistant, getDashboard } from "../lib/api";

// --- ICONS ---
const LightbulbIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10" /><rect x="14" y="15" width="8" height="7" rx="2" /><line x1="18" y1="15" x2="18" y2="11" /><line x1="18" y1="22" x2="18" y2="22" />
  </svg>
);



const ChevronDown = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9l6 6 6-6" />
  </svg>
);

const ISSUE_OPTIONS = [
  "Traffic Law",
  "Personal Status Law",
  "Civil & Commercial Law",
  "Criminal Law",
  "Administrative Law",
  "Constitutional Law",
  "Military Law",
  "Labor & Employment Law",
  "Property & Tenancy Law"
];

const ASK_COPY = {
  title: "Ask a Question",
  subtitle: "Describe your legal issue for AI-powered assistance.",
  detailsLabel: "Known facts (optional)",
  detailsPlaceholder: "Add dates, notices, what happened, and any urgent deadlines.",
  inputPlaceholder: "Type your legal question here...",
  buttonLabel: "Get Answer"
};

const STARTER_PROMPTS = [
  {
    label: "Tenancy law summary",
    category: "Property & Tenancy Law",
    prompt: "Summarize current local tenancy laws and the main landlord-tenant obligations."
  },
  {
    label: "Employment rights",
    category: "Labor & Employment Law",
    prompt: "Explain my rights if I was fired without notice and what deadlines usually matter."
  },
  {
    label: "Commercial dispute help",
    category: "Civil & Commercial Law",
    prompt: "Outline the first questions I should answer before filing or defending a commercial dispute."
  }
];

function timestamp() {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  }).format(new Date());
}

function buildWelcomeMessage(includeTimestamp = true) {
  return {
    role: "assistant",
    text: "Ask your legal question and include any dates, notices, or deadlines that matter. I will give general guidance, not case-specific legal advice.",
    timestamp: includeTimestamp ? timestamp() : ""
  };
}

function composePrompt(category, details, prompt) {
  const trimmedPrompt = prompt.trim();
  const trimmedDetails = details.trim();
  const parts = [];

  if (category) {
    parts.push(`Issue category: ${category}`);
  }

  if (trimmedDetails) {
    parts.push(`Known facts:\n${trimmedDetails}`);
  }
  parts.push(`Question: ${trimmedPrompt}`);
  return parts.join("\n\n");
}

function buildChatPayload(messages) {
  return messages.map((message) => ({
    role: message.role,
    content: message.text
  }));
}

export default function AIWorkspace() {
  const [issueCategory, setIssueCategory] = useState(ISSUE_OPTIONS[0]);
  const [details, setDetails] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState(() => [buildWelcomeMessage(false)]);
  const [disclaimer, setDisclaimer] = useState("");
  const [activeModel, setActiveModel] = useState("");
  const [activeCaseId, setActiveCaseId] = useState(0);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadCaseContext() {
      try {
        const dashboard = await getDashboard();
        if (isMounted) {
          setActiveCaseId(dashboard?.activeCase?.case?.id || 0);
        }
      } catch {
        if (isMounted) {
          setActiveCaseId(0);
        }
      }
    }

    loadCaseContext();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSend(event) {
    event.preventDefault();
    if (isLoading) {
      return;
    }

    const trimmedInput = chatInput.trim();
    if (!trimmedInput) {
      setError("Enter a question or instruction first.");
      return;
    }

    const userMessage = {
      role: "user",
      text: composePrompt(issueCategory, details, chatInput),
      timestamp: timestamp()
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setChatInput("");
    setError("");
    setIsLoading(true);

    try {
      const response = await askLegalAssistant({
        mode: "ask",
        category: issueCategory,
        caseId: activeCaseId || undefined,
        messages: buildChatPayload(nextMessages)
      });

      setMessages((current) => [
        ...current,
        {
          role: response.message.role || "assistant",
          text: response.message.content,
          timestamp: timestamp()
        }
      ]);
      setDisclaimer(response.disclaimer || "");
      setActiveModel(response.model || "");
    } catch (requestError) {
      setError(requestError.message);
      setMessages(messages);
    } finally {
      setIsLoading(false);
    }
  }

  function applyStarter(prompt) {
    setIssueCategory(prompt.category);
    setDetails("");
    setChatInput(prompt.prompt);
    setError("");
  }

  return (
    <div className="luxury-ai-workspace">
      <div className="main-ai-grid">
        <aside className="left-tool-panel">
          <div className="premium-card tool-form">
            <h2>{ASK_COPY.title}</h2>
            <p className="subtitle">{ASK_COPY.subtitle}</p>

            <div className="form-group-v3">
              <label htmlFor="issue-category">What is your issue?</label>
              <div className="custom-select-wrapper">
                <select
                  id="issue-category"
                  className="minimal-select"
                  value={issueCategory}
                  onChange={(event) => setIssueCategory(event.target.value)}
                >
                  {ISSUE_OPTIONS.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
                <div className="select-chevron">
                  <ChevronDown />
                </div>
              </div>
            </div>

            <div className="form-group-v3">
              <label>{ASK_COPY.detailsLabel}</label>
              <textarea
                placeholder={ASK_COPY.detailsPlaceholder}
                className="minimal-textarea"
                value={details}
                onChange={(event) => setDetails(event.target.value)}
              />
            </div>

            <button className="btn-terracotta wide-btn" type="button" onClick={handleSend} disabled={isLoading}>
              {isLoading ? "Working..." : ASK_COPY.buttonLabel}
            </button>

            <div className="sidebar-quick-actions">
              {STARTER_PROMPTS.map((prompt) => (
                <button key={prompt.label} type="button" className="action-pill" onClick={() => applyStarter(prompt)}>
                  <LightbulbIcon />
                  {prompt.label}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <main className="chat-workspace-area">
          <div className="premium-card main-chat-box">
            <header className="chat-box-header">
              <div className="brand-badge">
                <span className="badge-bg">AI</span>
              </div>
             
            </header>

            <div className="chat-message-flow-v3">
              <>
                {messages.map((msg, i) => (msg.role === "user" ? (
                  <div key={`${msg.timestamp}-${i}`} className="msg-bubble user">
                    <p>{msg.text}</p>
                  </div>
                ) : (
                  <div key={`${msg.timestamp}-${i}`} className="msg-bubble assistant">
                    <div className="assistant-avatar small-ai-chip">
                      AI
                    </div>
                    <div>
                      <p>{msg.text}</p>
                      {msg.timestamp ? <span className="caption">{msg.timestamp}</span> : null}
                    </div>
                  </div>
                )))}
                {isLoading ? (
                  <div className="msg-bubble assistant">
                    <div className="assistant-avatar small-ai-chip">
                      AI
                    </div>
                    <p>Reviewing your request...</p>
                  </div>
                ) : null}
              </>
            </div>

            <footer className="chat-box-input">
              {error ? <p className="feedback error">{error}</p> : null}
              {disclaimer ? <p className="caption">{disclaimer}</p> : null}
              {activeModel ? <p className="caption">Model: {activeModel}</p> : null}
              <form className="input-field-wrapper" onSubmit={handleSend}>
                <input
                  type="text"
                  placeholder={ASK_COPY.inputPlaceholder}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                />
                <button type="submit" className="send-action-btn" disabled={isLoading}>Send</button>
              </form>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}
