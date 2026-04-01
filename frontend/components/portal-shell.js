"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { clearSession, loadSession } from "../lib/session";

const SearchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8a837c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const ROLE_LABELS = {
  admin: "Admin",
  lawyer: "Lawyer",
  client: "Client",
  guest: "Guest"
};

export default function PortalShell({ title, description, hideHero, children }) {
  const pathname = usePathname() || "";
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [session, setSession] = useState(null);

  useEffect(() => {
    setSession(loadSession());
  }, [pathname]);

  const handleSearchToggle = () => {
    setSearchOpen(!searchOpen);
    if (!searchOpen) {
      setTimeout(() => document.getElementById("navbar-search")?.focus(), 100);
    }
  };

  const handleLogout = () => {
    clearSession();
    setSession(null);
    router.push("/");
  };

  const role = session?.role || "guest";
  const showMessaging = role !== "admin";

  return (
    <div className="portal-layout">
      <div className="portal-nav-shell">
        <header className="portal-navbar">
          <Link href="/" className="portal-brand">
            LEGAL CONSULTANT
          </Link>
          <div className="portal-nav-right">
            <nav className="portal-links">
              <Link href="/home" className={pathname === "/home" ? "active" : ""}>Home</Link>
              <Link href="/ai" className={pathname === "/ai" ? "active" : ""}>AI</Link>
              <Link href="/faq" className={pathname === "/faq" ? "active" : ""}>FAQ</Link>
              {showMessaging ? (
                <Link href="/messaging" className={pathname === "/messaging" ? "active" : ""}>Messaging</Link>
              ) : null}
              <Link href="/labor" className={pathname === "/labor" ? "active" : ""}>Labor Calculator</Link>
            </nav>
            <div className="portal-divider"></div>
            <div className="portal-account-strip">
              <div className="portal-account-meta">
                <span className="portal-role-badge">{ROLE_LABELS[role] || "Account"}</span>
                <strong>{session?.name || "Explorer"}</strong>
              </div>
              {session?.token ? (
                <button type="button" className="portal-logout-btn" onClick={handleLogout}>
                  Log out
                </button>
              ) : (
                <Link href="/" className="portal-login-link">
                  Sign in
                </Link>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", position: "relative" }}>
              <input
                id="navbar-search"
                type="text"
                autoComplete="off"
                className={`portal-search-input ${searchOpen ? "open" : ""}`}
                style={{
                  width: searchOpen ? "260px" : "0",
                  opacity: searchOpen ? 1 : 0,
                  pointerEvents: searchOpen ? "auto" : "none",
                  padding: searchOpen ? "10px 18px" : "10px 0",
                  visibility: searchOpen ? "visible" : "hidden",
                  marginRight: searchOpen ? "8px" : "0"
                }}
                placeholder="Search resources, cases..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
              <button
                type="button"
                className="portal-search-btn"
                aria-label="Search"
                onClick={handleSearchToggle}
                style={{
                  background: "white",
                  borderRadius: "50%",
                  width: "42px",
                  height: "42px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                  border: "1px solid rgba(0,0,0,0.06)",
                  cursor: "pointer",
                  transition: "transform 0.2s",
                  flexShrink: 0
                }}
              >
                <SearchIcon />
              </button>
            </div>
          </div>
        </header>
      </div>

      {!hideHero && (
        <section className="hero compact">
          <div>
            <p className="eyebrow">Senior Project</p>
            <h1>{title}</h1>
            <p className="hero-copy">{description}</p>
          </div>
        </section>
      )}

      {children}
    </div>
  );
}
