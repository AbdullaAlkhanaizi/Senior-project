"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const SearchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8a837c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

export default function PortalShell({ title, description, hideHero, children }) {
  const pathname = usePathname() || "";
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchToggle = () => {
    setSearchOpen(!searchOpen);
    if (!searchOpen) {
      setTimeout(() => document.getElementById('navbar-search')?.focus(), 100);
    }
  };

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
              <Link href="/messaging" className={pathname === "/messaging" ? "active" : ""}>Messaging</Link>
              <Link href="/labor" className={pathname === "/labor" ? "active" : ""}>Labor Calculator</Link>
            </nav>
            <div className="portal-divider"></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
              <input 
                id="navbar-search"
                type="text" 
                autoComplete="off"
                className={`portal-search-input ${searchOpen ? 'open' : ''}`}
                style={{
                  width: searchOpen ? '260px' : '0',
                  opacity: searchOpen ? 1 : 0,
                  pointerEvents: searchOpen ? 'auto' : 'none',
                  padding: searchOpen ? '10px 18px' : '10px 0',
                  visibility: searchOpen ? 'visible' : 'hidden',
                  marginRight: searchOpen ? '8px' : '0'
                }}
                placeholder="Search resources, cases..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button 
                type="button"
                className="portal-search-btn" 
                aria-label="Search"
                onClick={handleSearchToggle}
                style={{
                  background: 'white',
                  borderRadius: '50%',
                  width: '42px',
                  height: '42px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                  border: '1px solid rgba(0,0,0,0.06)',
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
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
