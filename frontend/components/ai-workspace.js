"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { askLegalAssistant, getDashboard } from "../lib/api";
import { loadSession } from "../lib/session";

// --- ICONS ---
const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const FileIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

const AnalyzeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="8" y1="13" x2="16" y2="13" />
    <line x1="8" y1="17" x2="14" y2="17" />
    <line x1="10" y1="9" x2="8" y2="9" />
  </svg>
);

const UserIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);

const LightbulbIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10" /><rect x="14" y="15" width="8" height="7" rx="2" /><line x1="18" y1="15" x2="18" y2="11" /><line x1="18" y1="22" x2="18" y2="22" />
  </svg>
);

const PaperclipIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
  </svg>
);

const DotsHorizontalIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" />
  </svg>
);

const ChevronRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18l6-6-6-6" />
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
  "Sharia Law (Sunni or Jafari)",
  "Military Law",
  "Labor & Employment Law",
  "Property & Tenancy Law"
];

const TAB_COPY = {
  ask: {
    title: "Ask a Question",
    subtitle: "Describe your legal issue for AI-powered assistance.",
    detailsLabel: "Known facts (optional)",
    detailsPlaceholder: "Add dates, notices, what happened, and any urgent deadlines.",
    inputPlaceholder: "Type your legal question here...",
    buttonLabel: "Get Answer"
  },
  create: {
    title: "Create Document",
    subtitle: "Generate a first-pass legal draft with placeholders for lawyer review.",
    detailsLabel: "Draft requirements",
    detailsPlaceholder: "Paste the facts, clauses you want included, names, dates, and business terms.",
    inputPlaceholder: "What document do you need drafted?",
    buttonLabel: "Create Draft"
  },
  analyze: {
    title: "Analyze Document",
    subtitle: "Paste a clause or document and ask the AI to identify risks and missing protections.",
    detailsLabel: "Document text",
    detailsPlaceholder: "Paste the clause, contract section, notice, or full draft here.",
    inputPlaceholder: "What do you want analyzed?",
    buttonLabel: "Analyze Document"
  }
};

const STARTER_PROMPTS = [
  {
    label: "Tenancy law summary",
    mode: "ask",
    category: "Property & Tenancy Law",
    prompt: "Summarize current local tenancy laws and the main landlord-tenant obligations."
  },
  {
    label: "Employment rights",
    mode: "ask",
    category: "Labor & Employment Law",
    prompt: "Explain my rights if I was fired without notice and what deadlines usually matter."
  },
  {
    label: "Analyze an NDA",
    mode: "analyze",
    category: "Civil & Commercial Law",
    prompt: "Review this NDA and point out the clauses that create the biggest risk for me."
  }
];

function timestamp() {
  return new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function buildWelcomeMessage(mode) {
  if (mode === "create") {
    return {
      role: "assistant",
      text: "Describe the document you need. I can draft a first version with placeholders and flag sections that still need lawyer review.",
      timestamp: timestamp()
    };
  }

  if (mode === "analyze") {
    return {
      role: "assistant",
      text: "Paste the document text or clause and tell me what you want checked. I will highlight likely risks, ambiguities, and follow-up questions.",
      timestamp: timestamp()
    };
  }

  return {
    role: "assistant",
    text: "Ask your legal question and include any dates, notices, or deadlines that matter. I will give general guidance, not case-specific legal advice.",
    timestamp: timestamp()
  };
}

function composePrompt(mode, category, details, prompt) {
  const trimmedPrompt = prompt.trim();
  const trimmedDetails = details.trim();
  const parts = [];

  if (category) {
    parts.push(`Issue category: ${category}`);
  }

  if (mode === "create") {
    parts.push(`Document request: ${trimmedPrompt}`);
    if (trimmedDetails) {
      parts.push(`Draft requirements and facts:\n${trimmedDetails}`);
    }
    return parts.join("\n\n");
  }

  if (mode === "analyze") {
    parts.push(`Analysis request: ${trimmedPrompt}`);
    if (trimmedDetails) {
      parts.push(`Document or clause to review:\n${trimmedDetails}`);
    }
    return parts.join("\n\n");
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
  const [activeTab, setActiveTab] = useState("ask");
  const [session, setSession] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [issueCategory, setIssueCategory] = useState(ISSUE_OPTIONS[0]);
  const [details, setDetails] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState(() => [buildWelcomeMessage("ask")]);
  const [disclaimer, setDisclaimer] = useState("");
  const [activeModel, setActiveModel] = useState("");
  const [suggestedActions, setSuggestedActions] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setSession(loadSession());

    async function loadWorkspace() {
      try {
        const data = await getDashboard();
        setDashboard(data);
      } catch (requestError) {
        setError(requestError.message);
      }
    }

    loadWorkspace();
  }, []);

  const lawyers = dashboard?.lawyers || [];
  const faqs = dashboard?.faqSuggestions || [];
  const activeCase = dashboard?.activeCase;
  const tabCopy = TAB_COPY[activeTab] || TAB_COPY.ask;
  const viewerRole = session?.role || "guest";
  const actionHref = viewerRole === "guest" ? "/signup" : "/messaging";
  const actionLabel = viewerRole === "guest" ? "Create Client Account" : "Open Referral Workspace";

  function resetConversation(mode, nextPrompt = "", nextCategory = ISSUE_OPTIONS[0]) {
    setActiveTab(mode);
    setIssueCategory(nextCategory);
    setDetails("");
    setChatInput(nextPrompt);
    setMessages(mode === "find" ? [] : [buildWelcomeMessage(mode)]);
    setDisclaimer("");
    setActiveModel("");
    setSuggestedActions([]);
    setError("");
  }

  async function handleSend(event) {
    event.preventDefault();
    if (activeTab === "find" || isLoading) {
      return;
    }

    const trimmedInput = chatInput.trim();
    const trimmedDetails = details.trim();
    if (!trimmedInput) {
      setError("Enter a question or instruction first.");
      return;
    }
    if (activeTab === "analyze" && !trimmedDetails) {
      setError("Paste the document or clause you want analyzed.");
      return;
    }

    const userMessage = {
      role: "user",
      text: composePrompt(activeTab, issueCategory, details, chatInput),
      timestamp: timestamp()
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setChatInput("");
    setError("");
    setIsLoading(true);

    try {
      const response = await askLegalAssistant({
        mode: activeTab,
        category: issueCategory,
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
      setSuggestedActions(response.suggestedActions || []);
    } catch (requestError) {
      setError(requestError.message);
      setMessages(messages);
    } finally {
      setIsLoading(false);
    }
  }

  function applyStarter(prompt) {
    resetConversation(prompt.mode, prompt.prompt, prompt.category);
  }

  return (
    <div className="luxury-ai-workspace">
      {/* Top Navigation Row */}
      <div className="ai-top-nav">
        <button className={activeTab === "ask" ? "nav-tab active" : "nav-tab"} onClick={() => resetConversation("ask", "", issueCategory)}>
          <SearchIcon /> Ask a Question
        </button>
        <button className={activeTab === "create" ? "nav-tab active" : "nav-tab"} onClick={() => resetConversation("create", "", issueCategory)}>
          <FileIcon /> Create Document
        </button>
        <button className={activeTab === "analyze" ? "nav-tab active" : "nav-tab"} onClick={() => resetConversation("analyze", "", issueCategory)}>
          <AnalyzeIcon /> Analyze Document
        </button>
        <button className={activeTab === "find" ? "nav-tab active" : "nav-tab"} onClick={() => resetConversation("find", "", issueCategory)}>
          <UserIcon /> Find Lawyer
        </button>
      </div>

      <div className="main-ai-grid">
        {/* Left Column: Ask Panel */}
        <aside className="left-tool-panel">
          <div className="premium-card tool-form">
            <h2>{activeTab === "find" ? "Find Lawyer" : tabCopy.title}</h2>
            <p className="subtitle">
              {activeTab === "find"
                ? "Review the available lawyers and continue to the referral workspace when you need case-specific help."
                : tabCopy.subtitle}
            </p>

            {activeTab === "find" ? (
              <div className="insight-widget">
                <div className="insight-card-item">
                  <span className="caption">Protected escalation</span>
                  <div className="flex-row">
                    <p>{activeCase ? `Active case: ${activeCase.case.title}` : "No active protected case yet"}</p>
                    <ChevronRight />
                  </div>
                </div>
                <div className="insight-card-item solid">
                  <div className="flex-row">
                    <p>{session?.role === "guest" ? "Guests must create a client account first" : "Continue to messaging to contact your lawyer"}</p>
                    <ChevronRight />
                  </div>
                </div>
                <Link href={actionHref} className="btn-terracotta wide-btn">{actionLabel}</Link>
              </div>
            ) : (
              <>
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
                  <label>{tabCopy.detailsLabel}</label>
                  <textarea
                    placeholder={tabCopy.detailsPlaceholder}
                    className="minimal-textarea"
                    value={details}
                    onChange={(event) => setDetails(event.target.value)}
                  />
                </div>

                <button className="btn-terracotta wide-btn" type="button" onClick={handleSend} disabled={isLoading}>
                  {isLoading ? "Working..." : tabCopy.buttonLabel}
                </button>
              </>
            )}
          </div>
        </aside>

        {/* Middle Column: Chat Workspace */}
        <main className="chat-workspace-area">
          <div className="premium-card main-chat-box">
            <header className="chat-box-header">
              <div className="brand-badge">
                <span className="badge-bg">AI</span>
              </div>
              <DotsHorizontalIcon />
            </header>

            <div className="chat-message-flow-v3">
              {activeTab === "find" ? (
                <div className="insight-widget">
                  {lawyers.map((lawyer) => (
                    <article key={lawyer.id} className="insight-card-item solid">
                      <span className="caption">{lawyer.specialty}</span>
                      <div className="flex-row">
                        <p>{lawyer.name} · {lawyer.firm}</p>
                        <ChevronRight />
                      </div>
                      <p>{lawyer.city}</p>
                      <p>{lawyer.email}</p>
                    </article>
                  ))}
                  {!lawyers.length ? <p>No lawyers are available yet.</p> : null}
                </div>
              ) : (
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
                        <span className="caption">{msg.timestamp}</span>
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
              )}
            </div>

            <footer className="chat-box-input">
              {error ? <p className="feedback error">{error}</p> : null}
              {disclaimer ? <p className="caption">{disclaimer}</p> : null}
              {activeModel ? <p className="caption">Model: {activeModel}</p> : null}
              {activeTab === "find" ? (
                <div className="input-field-wrapper">
                  <Link href={actionHref} className="send-action-btn">{actionLabel}</Link>
                </div>
              ) : (
                <form className="input-field-wrapper" onSubmit={handleSend}>
                  <button type="button" className="attachment-btn" disabled><PaperclipIcon /></button>
                  <input
                    type="text"
                    placeholder={tabCopy.inputPlaceholder}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                  />
                  <button type="submit" className="send-action-btn" disabled={isLoading}>Send</button>
                </form>
              )}
            </footer>
          </div>
        </main>

        {/* Right Column: AI Insights */}
        <aside className="right-insights-panel">
          <div className="premium-card insight-widget">
            <div className="widget-header">
              <LightbulbIcon /> <h3>Suggested Actions</h3>
            </div>
            {(suggestedActions.length ? suggestedActions : [
              "Add dates and deadlines for more precise guidance.",
              "Escalate to a lawyer for case-specific review.",
              "Use Analyze Document for clauses, notices, or contracts."
            ]).map((item) => (
              <button
                key={item}
                type="button"
                className="insight-card-item solid"
                onClick={() => setChatInput(item)}
                disabled={activeTab === "find"}
              >
                <div className="flex-row">
                  <p>{item}</p>
                  <ChevronRight />
                </div>
              </button>
            ))}
          </div>

          <div className="premium-card insight-widget">
            <div className="widget-header">
              <LightbulbIcon /> <h3>Quick Start</h3>
              <DotsHorizontalIcon />
            </div>
            {STARTER_PROMPTS.map((item) => (
              <button
                key={item.label}
                type="button"
                className="insight-card-item solid"
                onClick={() => applyStarter(item)}
              >
                <div className="flex-row">
                  <p>{item.label}</p>
                  <ChevronRight />
                </div>
              </button>
            ))}
            {faqs.slice(0, 3).map((faq) => (
              <button
                key={faq.id}
                type="button"
                className="insight-card-item"
                onClick={() => applyStarter({
                  label: faq.question,
                  mode: "ask",
                  category: faq.category || ISSUE_OPTIONS[0],
                  prompt: faq.question
                })}
              >
                <span className="caption">{faq.category}</span>
                <div className="flex-row">
                  <p>{faq.question}</p>
                  <ChevronRight />
                </div>
              </button>
            ))}
          </div>
        </aside>
      </div>

    </div>
  );
}
