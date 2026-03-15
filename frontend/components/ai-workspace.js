"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

const starterChat = [
  {
    role: "assistant",
    text: "Ask a basic legal question here. You will later connect this panel to your own AI model and legal knowledge base."
  },
  {
    role: "user",
    text: "Is running a red light illegal?"
  },
  {
    role: "assistant",
    text: "For short, general questions the chatbot can answer directly. For more complex situations it should escalate to a lawyer."
  }
];

const quickPrompts = [
  "Is running a red light illegal?",
  "Can an employer lower my salary without notice?",
  "When should the AI tell the user to contact a lawyer?"
];

export default function AIWorkspace() {
  const [chatInput, setChatInput] = useState("");
  const promptCount = useMemo(() => quickPrompts.length, []);

  return (
    <section className="grid">
      <article className="panel chat-panel">
        <div className="panel-header">
          <div>
            <p className="panel-kicker">Part 1</p>
            <h2>Chatbot shell</h2>
          </div>
          <span className="badge">AI hook pending</span>
        </div>

        <div className="chat-window">
          {starterChat.map((message, index) => (
            <article key={`${message.role}-${index}`} className={`bubble ${message.role}`}>
              <span>{message.role === "assistant" ? "AI assistant" : "User"}</span>
              <p>{message.text}</p>
            </article>
          ))}
        </div>

        <form className="chat-form">
          <input
            value={chatInput}
            onChange={(event) => setChatInput(event.target.value)}
            placeholder="Type here when you connect your chatbot..."
          />
          <button type="button">Send</button>
        </form>
      </article>

      <article className="panel faq-panel">
        <div className="panel-header">
          <div>
            <p className="panel-kicker">Escalation Flow</p>
            <h2>What this page should do later</h2>
          </div>
          <span className="badge">{promptCount} starter prompts</span>
        </div>

        <div className="faq-list">
          {quickPrompts.map((prompt) => (
            <article key={prompt} className="faq-card">
              <span>Prompt idea</span>
              <h3>{prompt}</h3>
            </article>
          ))}
        </div>

        <div className="selected-lawyer action-card">
          <h3>Next step for complex issues</h3>
          <p>
            When the AI detects a complex or case-specific question, send the user to the messaging
            page and pre-fill a lawyer referral case.
          </p>
          <div className="cta-row">
            <Link href="/messaging" className="link-button">
              Open messaging
            </Link>
            <Link href="/faq" className="link-button ghost">
              View FAQ page
            </Link>
          </div>
        </div>
      </article>
    </section>
  );
}
