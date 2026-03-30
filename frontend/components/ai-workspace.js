"use client";

import Link from "next/link";
import { useState } from "react";

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

const ScaleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 16s3 0 5-2" /><path d="M8 16s-3 0-5-2" /><circle cx="12" cy="12" r="3" /><path d="M12 2v10" /><path d="M3 14h18" />
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

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);


// --- DATA ---
const chatHistory = [
  {
    role: "user",
    text: "Is running a red light illegal in Bahrain? What are the penalties?",
    timestamp: "10:12 AM"
  },
  {
    role: "assistant",
    text: "Yes, under the Bahrain Traffic Law (specifically Article 47), running a red light is a serious offense. Penalties include significant fines and demerit points. In some cases...",
    timestamp: "10:12 AM"
  },
  {
    role: "user",
    text: "Could a harsh penalty lead to losing my license?",
    timestamp: "10:14 AM"
  },
  {
    role: "assistant",
    text: "Yes, if the offenses recur or result in major disruptions, this can lead to license suspension. It's best to consult a lawyer if you're facing a harsh penalty.",
    timestamp: "10:14 AM"
  }
];

export default function AIWorkspace() {
  const [activeTab, setActiveTab] = useState("ask");
  const [chatInput, setChatInput] = useState("");

  return (
    <div className="luxury-ai-workspace">
      {/* Top Navigation Row */}
      <div className="ai-top-nav">
        <button className={activeTab === "ask" ? "nav-tab active" : "nav-tab"} onClick={() => setActiveTab("ask")}>
          <SearchIcon /> Ask a Question
        </button>
        <button className={activeTab === "create" ? "nav-tab active" : "nav-tab"} onClick={() => setActiveTab("create")}>
          <FileIcon /> Create Document
        </button>
        <button className={activeTab === "analyze" ? "nav-tab active" : "nav-tab"} onClick={() => setActiveTab("analyze")}>
          <AnalyzeIcon /> Analyze Document
        </button>
        <button className={activeTab === "find" ? "nav-tab active" : "nav-tab"} onClick={() => setActiveTab("find")}>
          <UserIcon /> Find Lawyer
        </button>
      </div>

      <div className="main-ai-grid">
        {/* Left Column: Ask Panel */}
        <aside className="left-tool-panel">
          <div className="premium-card tool-form">
            <h2>Ask a Question</h2>
            <p className="subtitle">Describe your legal issue for AI-powered assistance.</p>

            <div className="form-group-v3">
              <label htmlFor="issue-category">What is your issue?</label>
              <div className="custom-select-wrapper">
                <select
                  id="issue-category"
                  className="minimal-select"
                  defaultValue="Traffic Law"
                >
                  <option value="Traffic Law">Traffic Law</option>
                  <option value="Personal Status Law">Personal Status Law</option>
                  <option value="Civil & Commercial Law">Civil & Commercial Law</option>
                  <option value="Criminal Law">Criminal Law</option>
                  <option value="Administrative Law">Administrative Law</option>
                  <option value="Constitutional Law">Constitutional Law</option>
                  <option value="Sharia Law (Sunni or Jafari)">Sharia Law (Sunni or Jafari)</option>
                  <option value="Military Law">Military Law</option>
                </select>
                <div className="select-chevron">
                  <ChevronDown />
                </div>
              </div>
            </div>

            <div className="form-group-v3">
              <label>Details (optional)</label>
              <textarea
                placeholder="Is running a red light illegal in Bahrain? What are the penalties..."
                className="minimal-textarea"
              />
            </div>

            <button className="btn-terracotta wide-btn">Get Answer</button>

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
              {chatHistory.map((msg, i) => (msg.role === "user" ? (
                <div key={i} className="msg-bubble user">
                  <p>{msg.text}</p>
                </div>
              ) : (
                <div key={i} className="msg-bubble assistant">
                  <div className="assistant-avatar small-ai-chip">
                    AI
                  </div>
                  <p>{msg.text}</p>
                </div>
              )))}
            </div>

            <footer className="chat-box-input">
              <div className="input-field-wrapper">
                <button className="attachment-btn"><PaperclipIcon /></button>
                <input
                  type="text"
                  placeholder="Type your legal question here..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                />
                <button className="send-action-btn">Send</button>
              </div>
            </footer>
          </div>
        </main>

        {/* Right Column: AI Insights */}
        <aside className="right-insights-panel">
          <div className="premium-card insight-widget">
            <div className="widget-header">
              <LightbulbIcon /> <h3>AI Insights</h3>
            </div>
            <div className="insight-card-item">
              <span className="caption">Legal Analysis</span>
              <div className="flex-row">
                <p>Case Precedent Search</p>
                <ChevronRight />
              </div>
            </div>
            <div className="insight-card-item solid">
              <div className="flex-row">
                <p>Legal Help Referral</p>
                <ChevronRight />
              </div>
            </div>
          </div>

          <div className="premium-card insight-widget">
            <div className="widget-header">
              <LightbulbIcon /> <h3>AI Insights</h3>
              <DotsHorizontalIcon />
            </div>
            <div className="insight-card-item">
              <span className="caption">Case Manager</span>
              <div className="flex-row">
                <p>Analyze this NDA</p>
                <ChevronRight />
              </div>
            </div>
            <div className="insight-card-item solid">
              <div className="flex-row">
                <p>Summarize current local tenancy laws</p>
                <ChevronRight />
              </div>
            </div>
            <div className="insight-card-item solid">
              <div className="flex-row">
                <p>Explain my rights if fired</p>
                <ChevronRight />
              </div>
            </div>
          </div>
        </aside>
      </div>

    </div>
  );
}
