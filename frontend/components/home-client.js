"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { loadSession } from "../lib/session";

const RobotIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#b6603e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="8" width="14" height="10" rx="3" />
    <path d="M12 2v6M9 2h6M16 13h.01M8 13h.01M9 18v2M15 18v2" />
    <path d="M12 11v2" />
  </svg>
);

const DotsIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" style={{ margin: 'auto' }}>
    <circle cx="5" cy="12" r="2.5" fill="#8c7e75" />
    <circle cx="12" cy="12" r="2.5" fill="#8c7e75" />
    <circle cx="19" cy="12" r="2.5" fill="#8c7e75" />
  </svg>
);

const ChevronRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18l6-6-6-6" />
  </svg>
);

const MessageIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);

const DocumentIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const FaqIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#b6603e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    <path d="M12 8v4" />
    <circle cx="12" cy="16" r="0.5" fill="#b6603e" />
  </svg>
);

const DocOutlineIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#b6603e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const MessagingOutlineIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#b6603e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);

export default function HomeClient() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    setSession(loadSession());
  }, []);

  return (
    <div className="dash-container">
      <div className="dash-top">
        <div className="dash-left-panel">
          <div className="hero-text">
            <h1>Manage legal tasks<br/>in one place</h1>
            <p>Streamline documents, tasks, and client communication from<br/>one central hub.</p>
            <div className="hero-actions">
              <Link href="/ai" className="btn-primary">Get Started with AI Assistant</Link>
              <Link href="/faq" className="btn-secondary">Browse FAQs</Link>
            </div>
          </div>

          <div className="recent-activity-section">
            <h2 className="section-title">Recent Activity</h2>
            <div className="activity-card shadow-sm">
              <Link href="/messaging" className="activity-item">
                <div className="activity-icon bg-brown">
                  <MessageIcon />
                </div>
                <div className="activity-info">
                  <div className="activity-title">Message: <strong>John Smith</strong></div>
                  <div className="activity-meta">Last activity: <span>2 hours ago</span></div>
                </div>
                <ChevronRight />
              </Link>
              <div className="activity-divider"></div>
              <Link href="/docs" className="activity-item">
                <div className="activity-icon bg-tan">
                  <DocumentIcon />
                </div>
                <div className="activity-info">
                  <div className="activity-title">Document: <strong>Partnership Agreement</strong></div>
                  <div className="activity-meta">Touched: <span>Yesterday</span></div>
                </div>
                <ChevronRight />
              </Link>
            </div>
          </div>
        </div>

        <div className="dash-right-panel">
          <div className="glass-backing-plate">
            <div className="glass-card big-ai-card shadow-lg">
              <div className="card-header">
                <div className="header-title">
                  <RobotIcon /> AI Assistant
                </div>
                <div className="header-dots-new">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#aab8c2' }}>
                    <circle cx="5" cy="12" r="2.2" />
                    <circle cx="12" cy="12" r="2.2" />
                    <circle cx="19" cy="12" r="2.2" />
                  </svg>
                </div>
              </div>
              <div className="card-body">
                <p className="card-desc">Ask legal questions and get<br/>real-time answers powered by AI.</p>
                
                <div className="chat-prompts">
                  <button className="prompt-btn">
                    <span>Create a non-disclosure agreement</span>
                    <ChevronRight />
                  </button>
                  <button className="prompt-btn">
                    <span>Explain the process to file a trademark</span>
                    <ChevronRight />
                  </button>
                  <button className="prompt-btn">
                    <span>Find a divorce lawyer near me</span>
                    <ChevronRight />
                  </button>
                </div>

                <div className="card-action">
                  <Link href="/ai" className="btn-primary">Open Assistant</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="dash-bottom-row">
        <div className="small-card calc-card shadow-sm">
          <div className="calc-header">
            <div className="calc-title">
              <div className="calc-icon-wrapper">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d26038" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 13L20 7c.6-.6 1.6-.6 2.2 0 .6.6.6 1.6 0 2.2L16 15" />
                  <path d="M11.5 12.5a3.5 3.5 0 0 1-5 0 3.5 3.5 0 0 1 0-5 3.5 3.5 0 0 1 5 0 3.5 3.5 0 0 1 0 5z" />
                  <path d="M5.5 15.5L2 19" />
                </svg>
              </div>
              <span>Labour Cost Calculator</span>
            </div>
            <div className="calc-total">BHD 21,733<span>/mo</span></div>
          </div>
          
          <div className="calc-rows">
            <div className="calc-row">
              <span className="c-icon">
                <svg width="16" height="16" viewBox="0 0 21 15" fill="none">
                  <mask id="bh-mask">
                    <rect width="21" height="15" fill="white" rx="2"/>
                  </mask>
                  <g mask="url(#bh-mask)">
                    <rect width="21" height="15" fill="#CE1126" />
                    <path d="M0 0h6l2 1.5L6 3l2 1.5L6 6l2 1.5L6 9l2 1.5L6 12l2 1.5L6 15H0V0z" fill="white"/>
                  </g>
                </svg>
              </span>
              <span className="c-label">BH</span>
              <span className="c-val">BHD 20 <small>/hrs</small></span>
              <div className="c-bar-bg"><div className="c-bar-fill fill-1" style={{width: '90%'}}></div></div>
            </div>
            <div className="calc-row">
              <span className="c-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a09a95" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </span>
              <span className="c-label">40</span>
              <span className="c-val">hours</span>
              <div className="c-bar-bg"><div className="c-bar-fill fill-2" style={{width: '25%'}}></div></div>
            </div>
            <div className="calc-row">
              <span className="c-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a09a95" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                </svg>
              </span>
              <span className="c-label">5</span>
              <span className="c-val">employees</span>
              <div className="c-bar-bg"><div className="c-bar-fill fill-3" style={{width: '12%'}}></div></div>
            </div>
          </div>
        </div>

        <div className="small-card shadow-sm">
          <div className="card-header" style={{ marginBottom: '12px' }}>
            <div className="header-title" style={{ fontSize: '1rem' }}>
              <MessagingOutlineIcon /> Messaging
            </div>
            <div className="header-dots-new">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#aab8c2' }}>
                <circle cx="5" cy="12" r="1.8" />
                <circle cx="12" cy="12" r="1.8" />
                <circle cx="19" cy="12" r="1.8" />
              </svg>
            </div>
          </div>
          <div className="card-body-compact">
            <div className="msg-content">
              <div className="msg-text">
                <strong>2 New Messages</strong>
                <p>(e.g., John S., Alice M.)</p>
              </div>
              <div className="msg-badge">1</div>
            </div>
          </div>
          <div className="sm-action">
            <Link href="/faq" className="btn-secondary sm-btn">Browse FAQs</Link>
          </div>
        </div>

        <div className="small-card template-card shadow-sm">
          <div className="card-header" style={{ marginBottom: '12px' }}>
            <div className="header-title" style={{ fontSize: '1rem' }}>
              <DocOutlineIcon /> Document Templates
            </div>
          </div>
          <div className="card-body-compact">
            <div className="card-kicker">RECENT TEMPLATES:</div>
            <div className="template-item">NDA v1.2</div>
            <div className="template-item">Contractor Agrmt</div>
          </div>
          <div className="sm-action">
            <Link href="#" className="btn-secondary sm-btn">View All Templates</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
