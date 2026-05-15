"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { getDashboard } from "../lib/api";
import { INITIAL_REVIEWS } from "../lib/reviews";
import { loadSession } from "../lib/session";

const QUICK_ACTIONS = [
  {
    href: "/ai",
    title: "Ask AI",
    description: "Get instant answers to your legal questions with our AI assistant.",
    cta: "Start Chat",
    icon: "ai",
    tone: "warm"
  },
  {
    href: "/review",
    title: "Lawyer Reviews",
    description: "Read client feedback and find the right legal professional for your case.",
    cta: "View Reviews",
    icon: "shield-star",
    tone: "sun"
  },
  {
    href: "/labor",
    title: "Labor Calculator",
    description: "Calculate salaries, benefits, end-of-service, and more with ease.",
    cta: "Calculate",
    icon: "calculator",
    tone: "violet"
  },
  {
    href: "/messaging",
    title: "Manage Cases",
    description: "Track your cases and communicate with your lawyer securely.",
    cta: "View Cases",
    icon: "message",
    tone: "sand"
  }
];

const HERO_BENEFITS = [
  {
    title: "Secure & Private",
    description: "Your data is encrypted and protected.",
    icon: "lock"
  },
  {
    title: "Trusted Platform",
    description: "Verified lawyers and reliable information.",
    icon: "shield"
  },
  {
    title: "Save Time",
    description: "Get answers and resolve issues faster.",
    icon: "clock"
  }
];

const PLATFORM_FEATURES = [
  {
    title: "AI-Powered Assistance",
    icon: "sparkles",
    items: ["Instant legal answers", "Local laws and regulations", "Smart recommendations"]
  },
  {
    title: "Labor Calculator",
    icon: "calculator",
    items: ["End of service benefits", "Salary calculation", "Leave entitlements"]
  },
  {
    title: "Connect with Lawyers",
    icon: "shield-star",
    items: ["Verified legal professionals", "Direct messaging", "Case tracking and updates"]
  }
];

const HOW_IT_WORKS = [
  {
    title: "Ask Your Question",
    description: "Describe your legal issue in your own words.",
    icon: "question"
  },
  {
    title: "Get Instant Guidance",
    description: "Our AI provides clear, accurate legal information.",
    icon: "sparkles"
  },
  {
    title: "Connect If Needed",
    description: "Talk to a lawyer and manage your case with ease.",
    icon: "user"
  }
];

const FOOTER_COLUMNS = [
  {
    title: "Platform",
    links: [
      { label: "AI Assistant", href: "/ai" },
      { label: "Messaging", href: "/messaging" },
      { label: "Labor Calculator", href: "/labor" }
    ]
  },
  {
    title: "Company",
    links: [
      { label: "About Us", href: "/home" },
      { label: "How It Works", href: "#how-it-works" },
      { label: "For Lawyers", href: "/messaging" },
      { label: "Contact Us", href: "/home" }
    ]
  },
  {
    title: "Legal",
    links: [
      { label: "Terms of Service", href: "/home" },
      { label: "Privacy Policy", href: "/home" },
      { label: "Cookie Policy", href: "/home" }
    ]
  },
  {
    title: "Support",
    links: [
      { label: "Contact Support", href: "/messaging" }
    ]
  }
];

function LegalHomeIcon({ type }) {
  if (type === "ai") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 4.5c1.2 2.9 2.1 3.8 5 5-2.9 1.2-3.8 2.1-5 5-1.2-2.9-2.1-3.8-5-5 2.9-1.2 3.8-2.1 5-5Z" />
        <path d="M5.5 14.5c.6 1.5 1.1 2 2.6 2.6-1.5.6-2 1.1-2.6 2.6-.6-1.5-1.1-2-2.6-2.6 1.5-.6 2-1.1 2.6-2.6Z" />
        <path d="M18 3.5c.5 1.1.9 1.5 2 2-.1.6-.5 1-1 1.2-.5.2-.9.6-1.2 1.3-.5-1.1-.9-1.5-2-2 1.1-.5 1.5-.9 2.2-2.5Z" />
      </svg>
    );
  }

  if (type === "calculator") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="6" y="3.5" width="12" height="17" rx="2" />
        <path d="M8.8 7h6.4" />
        <path d="M9 11h.01M12 11h.01M15 11h.01M9 14h.01M12 14h.01M15 14h.01M9 17h.01M12 17h.01M15 17h.01" />
      </svg>
    );
  }

  if (type === "chat" || type === "message") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6.5 5.5h11A2.5 2.5 0 0 1 20 8v5.3a2.5 2.5 0 0 1-2.5 2.5h-6.1l-3.7 2.8c-.5.4-1.2 0-1.2-.7v-2.1A2.5 2.5 0 0 1 4 13.3V8a2.5 2.5 0 0 1 2.5-2.5Z" />
      </svg>
    );
  }

  if (type === "lock") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="5" y="10" width="14" height="10" rx="2.2" />
        <path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" />
      </svg>
    );
  }

  if (type === "shield" || type === "shield-star") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3.5 18.5 6v5.1c0 4.2-2.6 7.3-6.5 9.4-3.9-2.1-6.5-5.2-6.5-9.4V6L12 3.5Z" />
        {type === "shield-star" ? <path d="m12 8.2.9 1.9 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.3.9-1.9Z" /> : <path d="m9.5 12 1.7 1.7 3.4-3.8" />}
      </svg>
    );
  }

  if (type === "clock") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="13" r="7" />
        <path d="M12 9.5V13l2.4 1.7" />
        <path d="M9 3.5h6" />
      </svg>
    );
  }

  if (type === "document") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6.5 3.5h8l3 3v14h-11Z" />
        <path d="M14.5 3.5v3h3" />
        <path d="M9 11h6M9 14h6M9 17h4" />
      </svg>
    );
  }

  if (type === "sparkles") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 4.5c.8 2.1 1.5 2.8 3.6 3.6C8.5 8.9 7.8 9.6 7 11.7 6.2 9.6 5.5 8.9 3.4 8.1 5.5 7.3 6.2 6.6 7 4.5Z" />
        <path d="M15 8c1.1 2.9 2.1 3.9 5 5-2.9 1.1-3.9 2.1-5 5-1.1-2.9-2.1-3.9-5-5 2.9-1.1 3.9-2.1 5-5Z" />
      </svg>
    );
  }

  if (type === "traffic") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="10" width="16" height="6" rx="2" />
        <path d="M7.5 10 9.8 7h4.4l2.3 3" />
        <circle cx="8" cy="16.5" r="1.4" />
        <circle cx="16" cy="16.5" r="1.4" />
      </svg>
    );
  }

  if (type === "employment") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 8.5h14v10H5Z" />
        <path d="M9 8.5V6.8A1.8 1.8 0 0 1 10.8 5h2.4A1.8 1.8 0 0 1 15 6.8v1.7" />
        <path d="M5 12h14" />
      </svg>
    );
  }

  if (type === "housing") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4.5 11 12 4.8 19.5 11" />
        <path d="M6.5 9.8V20h11V9.8" />
        <path d="M10 20v-5h4v5" />
      </svg>
    );
  }

  if (type === "criminal") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 4v15" />
        <path d="M6.5 7h11" />
        <path d="m7 7-3 5h6L7 7Z" />
        <path d="m17 7-3 5h6l-3-5Z" />
        <path d="M9 19h6" />
      </svg>
    );
  }

  if (type === "question") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9.5 9a2.6 2.6 0 1 1 4.3 2c-.9.7-1.8 1.2-1.8 2.7" />
        <path d="M12 17h.01" />
        <circle cx="12" cy="12" r="8" />
      </svg>
    );
  }

  if (type === "user") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5.5 19a6.5 6.5 0 0 1 13 0" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h12" />
      <path d="m12 7 5 5-5 5" />
    </svg>
  );
}

function StarRating({ rating }) {
  const rounded = Math.round(Number(rating) || 0);

  return (
    <span className="login-home-stars" aria-label={`${rounded} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((value) => (
        <span key={value} className={value <= rounded ? "filled" : ""}>
          {"\u2605"}
        </span>
      ))}
    </span>
  );
}

function getInitials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

export default function HomeClient() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const currentSession = loadSession();
    if (!currentSession) {
      router.replace("/");
      return;
    }

    setReady(true);

    async function load() {
      try {
        const data = await getDashboard();
        setDashboard(data);
      } catch (requestError) {
        setError(requestError.message);
      }
    }

    load();
  }, [router]);

  const featuredReviews = useMemo(() => INITIAL_REVIEWS.slice(0, 3), []);

  if (!ready) {
    return (
      <main className="login-home-page">
        <p className="login-home-loading">Preparing your home page...</p>
      </main>
    );
  }

  return (
    <main className="login-home-page">
      {error ? <p className="feedback error">{error}</p> : null}

      <section className="login-home-hero" aria-labelledby="login-home-title">
        <div className="login-home-hero-copy">
          <h1 id="login-home-title">
            Smart Legal Help <span>Instantly</span>
          </h1>
          <p>Ask questions, generate documents, or connect with a lawyer, all in one platform.</p>
          <div className="login-home-hero-actions">
            <Link href="/ai" className="login-home-button login-home-button-primary">
              <LegalHomeIcon type="sparkles" />
              Ask a Legal Question
            </Link>
            <Link href="/labor" className="login-home-button login-home-button-secondary">
              <LegalHomeIcon type="calculator" />
              Labor Calculator
            </Link>
          </div>
        </div>

        <div className="login-home-benefits" aria-label="Platform benefits">
          {HERO_BENEFITS.map((benefit) => (
            <article key={benefit.title} className="login-home-benefit-card">
              <span>
                <LegalHomeIcon type={benefit.icon} />
              </span>
              <div>
                <h2>{benefit.title}</h2>
                <p>{benefit.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="login-home-action-section" aria-labelledby="quick-actions-title">
        <div className="login-home-centered-heading">
          <h2 id="quick-actions-title">What would you like to do?</h2>
          <span aria-hidden="true" />
        </div>

        <div className="login-home-action-grid">
          {QUICK_ACTIONS.map((action) => (
            <Link key={action.title} href={action.href} className="login-home-action-card">
              <span className={`login-home-action-icon ${action.tone}`}>
                <LegalHomeIcon type={action.icon} />
              </span>
              <h3>{action.title}</h3>
              <p>{action.description}</p>
              <strong>
                {action.cta}
                <ArrowIcon />
              </strong>
            </Link>
          ))}
        </div>
      </section>

      <section className="login-home-platform-section" aria-labelledby="platform-title">
        <div className="login-home-centered-heading">
          <h2 id="platform-title">Everything you need in one legal platform</h2>
        </div>

        <div className="login-home-platform-grid">
          {PLATFORM_FEATURES.map((feature) => (
            <article key={feature.title} className="login-home-platform-item">
              <span className="login-home-platform-icon">
                <LegalHomeIcon type={feature.icon} />
              </span>
              <div>
                <h3>{feature.title}</h3>
                <ul>
                  {feature.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="login-home-review-section" aria-labelledby="trusted-title">
        <div className="login-home-centered-heading">
          <h2 id="trusted-title">Trusted by thousands</h2>
          <p>Real people, real results.</p>
        </div>

        <div className="login-home-review-row">
          {featuredReviews.map((review) => (
            <article key={review.id} className="login-home-review-card">
              <StarRating rating={review.rating} />
              <h3>{review.title}</h3>
              <p>{review.review}</p>
              <div className="login-home-review-author">
                <span>{getInitials(review.name)}</span>
                <strong>{review.name}</strong>
              </div>
            </article>
          ))}
          <Link href="/review" className="login-home-review-next" aria-label="Open all reviews">
            <ArrowIcon />
          </Link>
        </div>
      </section>

      <section className="login-home-steps-section" id="how-it-works" aria-labelledby="how-it-works-title">
        <div className="login-home-centered-heading">
          <h2 id="how-it-works-title">How it works</h2>
        </div>

        <div className="login-home-steps">
          {HOW_IT_WORKS.map((step, index) => (
            <article key={step.title} className="login-home-step">
              <span className="login-home-step-number">{index + 1}</span>
              <span className="login-home-step-icon">
                <LegalHomeIcon type={step.icon} />
              </span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="login-home-footer">
        <div className="login-home-footer-brand">
          <h2>LEGAL CONSULTANT</h2>
          <p>Smart legal solutions. Anytime, anywhere.</p>
        </div>

        <nav className="login-home-footer-nav" aria-label="Home footer">
          {FOOTER_COLUMNS.map((column) => (
            <div key={column.title}>
              <h3>{column.title}</h3>
              {column.links.map((link) => (
                <Link key={link.label} href={link.href}>
                  {link.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className="login-home-social">
          <h3>Follow us</h3>
          <div>
            <a href="#" aria-label="Facebook">f</a>
            <a href="#" aria-label="Twitter">t</a>
            <a href="#" aria-label="LinkedIn">in</a>
          </div>
          <p>Copyright 2025 Legal Consultant. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
