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

  return (
    <>
      {error ? <p className="feedback error">{error}</p> : null}
      <section className="hub-grid">
        <article className="panel welcome-panel">
          <p className="panel-kicker">Part 3</p>
          <h2>Suggested FAQ questions</h2>
          <p className="hero-copy">
            This page is split out so users can review common questions without entering the message center.
          </p>
        </article>
        <div className="hub-cards">
          {faqSuggestions.map((item) => (
            <article key={item.id} className="feature-card static-card">
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
