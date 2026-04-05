"use client";

import { useEffect, useState } from "react";

import { getDashboard } from "../lib/api";

export default function FAQClient() {
  const [faqSuggestions, setFaqSuggestions] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const data = await getDashboard();
        setFaqSuggestions(data.faqSuggestions || []);
      } catch (requestError) {
        setError(requestError.message);
      }
    }

    load();
  }, []);

  const [featuredFAQ, ...remainingFAQs] = faqSuggestions;

  return (
    <>
      {error ? <p className="feedback error">{error}</p> : null}
      <section className="faq-layout">
        <article className="panel welcome-panel faq-hero-panel">
          <p className="panel-kicker">Part 3</p>
          <h2>Suggested FAQ questions</h2>
          <p className="hero-copy">
            This page is split out so users can review common questions without entering the message center.
          </p>
        </article>

        {featuredFAQ ? (
          <article className="feature-card faq-feature-card">
            <span>{featuredFAQ.category}</span>
            <h3>{featuredFAQ.question}</h3>
            <p>Priority #{featuredFAQ.priority}</p>
          </article>
        ) : null}

        <div className="faq-stack">
          {remainingFAQs.map((item) => (
            <article key={item.id} className="feature-card static-card faq-list-card">
              <span>{item.category}</span>
              <h3>{item.question}</h3>
              <p>Priority #{item.priority}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
