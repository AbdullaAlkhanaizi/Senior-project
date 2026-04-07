"use client";

import { useEffect, useState } from "react";

import { getDashboard } from "../lib/api";

const CATEGORY_META = {
  All: {
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="7" fill="currentColor" />
      </svg>
    )
  },
  Traffic: {
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="9" width="16" height="7" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M7 9.5 9.5 6.8h5L17 9.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="8" cy="16.5" r="1.5" fill="currentColor" />
        <circle cx="16" cy="16.5" r="1.5" fill="currentColor" />
      </svg>
    )
  },
  Criminal: {
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 8h16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M7 8 4.5 18m10-10 2.5 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M9 8 8 5m7 3 1-3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M7 18h10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    )
  },
  Employment: {
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4.5 8.5h15v10h-15z" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M9 8.5v-2a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 6.5v2" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M4.5 12.5h15" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    )
  },
  Housing: {
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4.5 10.5 12 4l7.5 6.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6.5 9.5V20h11V9.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M10 20v-5h4v5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    )
  }
};

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="m16.5 16.5 4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export default function FAQClient() {
  const [faqSuggestions, setFaqSuggestions] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const data = await getDashboard();
        const items = [...(data.faqSuggestions || [])].sort((left, right) => left.priority - right.priority);
        setFaqSuggestions(items);
      } catch (requestError) {
        setError(requestError.message);
      }
    }

    load();
  }, []);

  const categories = ["All", ...new Set(faqSuggestions.map((item) => item.category))];
  const visibleFAQs = faqSuggestions.filter((item) => {
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      item.question.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query) ||
      String(item.priority).includes(query);

    return matchesCategory && matchesSearch;
  });
  const [featuredFAQ, ...remainingFAQs] = visibleFAQs;

  return (
    <>
      {error ? <p className="feedback error">{error}</p> : null}
      <section className="faq-showcase">
        <div className="faq-showcase-inner">
          <div className="faq-showcase-head">
            <h1>Frequently asked questions</h1>
            <p className="faq-showcase-copy">Browse common legal questions quickly without chat.</p>
          </div>

          <label className="faq-search" htmlFor="faq-search">
            <SearchIcon />
            <input
              id="faq-search"
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search FAQs..."
            />
          </label>

          <div className="faq-showcase-grid">
            <aside className="faq-sidebar">
              <h2>Categories</h2>
              <div className="faq-category-list">
                {categories.map((category) => {
                  const isActive = selectedCategory === category;
                  const meta = CATEGORY_META[category] || CATEGORY_META.All;

                  return (
                    <button
                      key={category}
                      type="button"
                      className={`faq-category-item ${isActive ? "active" : ""}`}
                      onClick={() => setSelectedCategory(category)}
                    >
                      <span className="faq-category-icon">{meta.icon}</span>
                      <span>{category}</span>
                    </button>
                  );
                })}
              </div>
            </aside>

            <div className="faq-results-panel">
              <div className="faq-results-head">
                <h2>Suggested FAQs</h2>
                <p>{visibleFAQs.length ? `${visibleFAQs.length} results` : "No results"}</p>
              </div>

              <div className="faq-results-list">
                {featuredFAQ ? (
                  <article className="faq-result-card faq-result-card-featured">
                    <div className="faq-result-main">
                      <span className="faq-tag">
                        <span className="faq-tag-icon">{(CATEGORY_META[featuredFAQ.category] || CATEGORY_META.All).icon}</span>
                        {featuredFAQ.category}
                      </span>
                      <h3>{featuredFAQ.question}</h3>
                    </div>
                    <p className="faq-priority">Priority #{featuredFAQ.priority}</p>
                  </article>
                ) : null}

                {remainingFAQs.map((item) => (
                  <article key={item.id} className="faq-result-card">
                    <div className="faq-result-main">
                      <span className="faq-tag">{item.category}</span>
                      <h3>{item.question}</h3>
                    </div>
                    <p className="faq-priority">Priority #{item.priority}</p>
                  </article>
                ))}

                {!visibleFAQs.length ? (
                  <article className="faq-empty-state">
                    <h3>No FAQs match this filter</h3>
                    <p>Try another keyword or switch back to All categories.</p>
                  </article>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
