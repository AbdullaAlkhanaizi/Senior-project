"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { loadSession } from "../lib/session";

const sections = [
  {
    href: "/ai",
    kicker: "AI Assistant",
    title: "Open the chatbot workspace",
    description: "This is where your future legal AI will answer basic questions and trigger referrals."
  },
  {
    href: "/faq",
    kicker: "FAQ",
    title: "Review suggested questions",
    description: "The FAQ page displays example questions that your chatbot can suggest to users."
  },
  {
    href: "/messaging",
    kicker: "Messaging",
    title: "Continue with a lawyer",
    description: "Use the message center for client-lawyer communication, uploads, and progress updates."
  }
];

export default function HomeClient() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    setSession(loadSession());
  }, []);

  return (
    <section className="hub-grid">
      <article className="panel welcome-panel">
        <p className="panel-kicker">Portal Home</p>
        <h2>{session ? `Welcome, ${session.name}` : "Welcome"}</h2>
        <p className="hero-copy">
          Use this page as the central hub. It directs the user to the AI assistant, FAQ page, or
          lawyer messaging workspace.
        </p>
        <div className="status-row">
          <span className="badge">{session?.mode || "visitor"}</span>
          <span className="badge">{session?.email || "no email stored"}</span>
        </div>
      </article>

      <div className="hub-cards">
        {sections.map((section) => (
          <Link key={section.href} href={section.href} className="feature-card">
            <span>{section.kicker}</span>
            <h3>{section.title}</h3>
            <p>{section.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
