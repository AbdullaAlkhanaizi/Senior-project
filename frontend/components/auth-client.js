"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { continueAsGuest, loginUser } from "../lib/api";
import { saveSession } from "../lib/session";

const ScaleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v14" />
    <path d="M4.5 6h15" />
    <path d="m4.5 6-2.8 4.2h5.6L4.5 6z" />
    <path d="m19.5 6-2.8 4.2h5.6L19.5 6z" />
    <path d="M8.8 19.2h6.4" />
  </svg>
);

const LockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4.5" y="10" width="15" height="10" rx="2.2" />
    <path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" />
  </svg>
);

const DocIcon = () => (
  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#A96B50" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6.5 3.5h8l3 3v14h-11z" />
    <path d="M14.5 3.5v3h3" />
    <path d="M9 11h6M9 14h5" />
    <circle cx="16" cy="18" r="3" fill="#F5EFEB" stroke="#A96B50" strokeWidth="1.5" />
    <line x1="18.5" y1="20.5" x2="21" y2="23" stroke="#A96B50" strokeWidth="2" />
  </svg>
);

const ChatIcon = () => (
  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#A96B50" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5.5 5.5h9a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H9L6 18.5v-3h-.5a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2z" />
    <path d="M8.3 9.4h5M8.3 12h3.8" />
  </svg>
);

const HandshakeIcon = () => (
  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#A96B50" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="m4.4 10.2 2.7-2.7 2.7 2.7-2.7 2.7-2.7-2.7z" />
    <path d="m14.2 13.8 2.7-2.7 2.7 2.7-2.7 2.7-2.7-2.7z" />
    <path d="m9.7 10.2 4.5 3.6" />
    <path d="M2.5 12h3m13 0h3M12 2.5v3m0 13v3" strokeOpacity="0.4" />
  </svg>
);

export default function AuthClient() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  async function handleLogin(event) {
    event.preventDefault();
    setError("");
    setStatus("");

    if (!email.trim() || !password.trim()) {
      setError("Please fill in all required fields.");
      return;
    }

    setStatus("Signing in...");
    try {
      const session = await loginUser({ email, password });
      saveSession(session);
      router.push("/home");
    } catch (requestError) {
      setError(requestError.message);
      setStatus("");
    }
  }

  async function handleGuest() {
    setError("");
    setStatus("Opening guest access...");
    try {
      const session = await continueAsGuest({ name: "Guest User" });
      saveSession(session);
      router.push("/home");
    } catch (requestError) {
      setError(requestError.message);
      setStatus("");
    }
  }

  return (
    <main className="auth-container">
      <style dangerouslySetInnerHTML={{
        __html: `
        @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@400;600;700;900&display=swap");

        body {
          margin: 0;
          font-family: 'Inter', sans-serif;
          background: #F4EFEB;
          color: #1a1a1a;
        }

        * {
          box-sizing: border-box;
        }

        .auth-container {
          display: flex;
          min-height: 100vh;
          width: 100%;
          position: relative;
        }

        .left-pane {
          width: 56%;
          background: linear-gradient(135deg, #172D4D 0%, #0F1A2D 100%);
          clip-path: polygon(0 0, 100% 0, 93% 100%, 0 100%);
          padding: 100px 40px 60px 5vw;
          position: relative;
          z-index: 2;
          display: flex;
          justify-content: flex-start;
        }

        .top-nav {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          padding: 30px 40px 0 5vw;
          display: flex;
          justify-content: space-between;
          align-items: center;
          z-index: 10;
        }

        .nav-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 700;
          letter-spacing: 0.08em;
          font-size: 13px;
          color: #ffffff;
          text-transform: uppercase;
        }

        .nav-links {
          display: flex;
          align-items: center;
          gap: 24px;
          font-size: 13px;
          color: #ffffff;
          font-weight: 500;
          padding-right: 12%; /* Keep it inside the slanted edge */
        }

        .nav-links a {
          text-decoration: none;
          color: #ffffff;
          transition: opacity 0.2s;
        }

        .nav-links a:hover {
          opacity: 0.8;
        }

        .contact-btn {
          border: 1px solid rgba(255,255,255,0.3);
          padding: 8px 16px;
          border-radius: 6px;
          font-weight: 500;
        }

        .contact-btn:hover {
          background: rgba(255,255,255,0.1);
        }

        .left-content {
          width: 100%;
          max-width: 580px;
          color: #ffffff;
          padding-right: 40px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .heading-main {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 48px;
          line-height: 1.15;
          font-weight: 600;
          margin: 0 0 16px 0;
          letter-spacing: -0.01em;
        }

        .sub-heading {
          font-size: 16px;
          line-height: 1.5;
          color: rgba(255,255,255,0.9);
          margin-bottom: 32px;
        }

        .login-card {
          background: rgba(19, 30, 50, 0.4);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          box-shadow: 0 16px 32px rgba(0,0,0,0.25);
          overflow: hidden;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }

        .card-header {
          padding: 18px 24px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          font-size: 15px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 10px;
          color: #ffffff;
        }

        .card-body {
          padding: 24px;
        }

        .card-kicker {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin-bottom: 16px;
          color: rgba(255, 255, 255, 0.8);
        }

        .form-group {
          margin-bottom: 18px;
        }

        .form-label {
          display: block;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #ffffff;
          margin-bottom: 8px;
        }

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .dark-input {
          width: 100%;
          height: 46px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          padding: 0 16px;
          font-size: 14px;
          color: #ffffff;
          outline: none;
          transition: all 0.2s;
          font-family: 'Inter', sans-serif;
        }

        .dark-input::placeholder {
          color: rgba(255, 255, 255, 0.4);
        }

        .dark-input:focus, .dark-input:hover {
          border-color: #6a8ce0;
          box-shadow: 0 0 10px rgba(106, 140, 224, 0.5);
          background: rgba(255, 255, 255, 0.08);
        }

        .show-btn {
          position: absolute;
          right: 6px;
          height: 34px;
          background: #ffffff;
          border: none;
          color: #1a1a1a;
          border-radius: 6px;
          padding: 0 12px;
          font-size: 12px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .show-btn:hover {
          background: #f0f0f0;
        }

        .forgot-link {
          display: block;
          text-align: right;
          font-size: 12px;
          color: #8da2e5;
          text-decoration: underline;
          margin-top: 8px;
          transition: color 0.2s;
        }

        .forgot-link:hover {
          color: #c9d6ff;
        }

        .login-btn {
          width: 100%;
          height: 48px;
          background: #B9532B;
          color: white;
          font-size: 15px;
          font-weight: 600;
          border: none;
          border-radius: 8px;
          margin-top: 16px;
          cursor: pointer;
          transition: background 0.2s, transform 0.1s;
        }

        .login-btn:hover {
          background: #A04420;
        }
        
        .login-btn:active {
          transform: translateY(1px);
        }

        .card-footer {
          padding: 16px 24px;
          border-top: 1px solid rgba(255,255,255,0.08);
          font-size: 11px;
          color: rgba(255,255,255,0.7);
          text-align: center;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }

        /* Right side */
        .right-pane {
          width: 44%;
          display: flex;
          justify-content: flex-start;
          align-items: center;
          padding: 60px 8% 60px 4%;
          z-index: 1;
        }

        .right-content {
          width: 100%;
          max-width: 440px;
          padding-left: 10px;
        }

        .badge-pill {
          display: inline-block;
          background: #eedbcd;
          color: #A35029;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.1em;
          padding: 6px 14px;
          border-radius: 20px;
          margin-bottom: 24px;
          text-transform: uppercase;
        }

        .right-heading {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 44px;
          line-height: 1.1;
          font-weight: 700;
          color: #1a1a1a;
          margin: 0 0 40px 0;
          letter-spacing: -0.01em;
        }

        .features-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 28px;
        }

        .feature-item {
          display: flex;
          align-items: flex-start;
          gap: 16px;
        }

        .feature-icon {
          margin-top: 2px;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
        }

        .feature-kicker {
          display: block;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.1em;
          color: #555;
          margin-bottom: 4px;
          text-transform: uppercase;
        }

        .feature-text {
          font-size: 14px;
          color: #111;
          line-height: 1.5;
        }

        .action-wrapper {
          position: relative;
          margin-top: 40px;
        }

        .recommended-badge {
          position: absolute;
          top: -10px;
          left: 16px;
          background: #B9532B;
          color: #fff;
          font-size: 10px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 4px;
          z-index: 2;
        }

        .guest-btn {
          width: 100%;
          height: 52px;
          background: #CC6035;
          color: white;
          font-size: 15px;
          font-weight: 600;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          position: relative;
          z-index: 1;
          transition: background 0.2s, transform 0.1s;
        }

        .guest-btn:hover {
          background: #B9532B;
        }

        .guest-btn:active {
          transform: translateY(1px);
        }
        
        .guest-note {
          margin-top: 20px;
          font-size: 13px;
          color: #555;
          line-height: 1.5;
        }

        .signin-footer {
          margin-top: 32px;
          padding-top: 24px;
          border-top: 1px solid rgba(0,0,0,0.08);
          font-size: 13px;
          color: #1a1a1a;
        }

        .signin-footer a {
          font-weight: 700;
          color: #1a1a1a;
          text-decoration: underline;
        }

        .feedback-error, .feedback-status {
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          padding: 10px 20px;
          border-radius: 8px;
          z-index: 100;
          font-size: 14px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .feedback-error {
          background: #ffebe5;
          color: #d93025;
        }

        .feedback-status {
          background: #e6f4ea;
          color: #137333;
        }

        @media (max-width: 900px) {
          .auth-container {
            flex-direction: column;
          }
          .left-pane {
            width: 100%;
            clip-path: none;
            padding: 80px 5% 40px;
            justify-content: center;
          }
          .nav-links {
            padding-right: 0;
          }
          .right-pane {
            width: 100%;
            padding: 40px 5%;
            justify-content: center;
          }
        }
      `}} />

      {error ? <div className="feedback-error">{error}</div> : null}
      {status ? <div className="feedback-status">{status}</div> : null}

      <section className="left-pane">
        <header className="top-nav">
          <div className="nav-brand">
            <ScaleIcon /> YOUR LEGAL PORTAL
          </div>
          <nav className="nav-links">
            <Link href="#">About</Link>
            <Link href="#">Help</Link>
            <Link href="#" className="contact-btn">Contact Us</Link>
          </nav>
        </header>

        <div className="left-content">
          <h1 className="heading-main">
            Welcome back to your<br />
            Legal Portal.
          </h1>

          <p className="sub-heading">
            Unlock access to your saved documents,<br />
            messages, and AI tools.
          </p>

          <div className="login-card">
            <div className="card-header">
              <LockIcon /> Secure Login
            </div>

            <div className="card-body">
              <p className="card-kicker">MEMBER LOGIN</p>

              <form onSubmit={handleLogin}>
                <div className="form-group">
                  <label htmlFor="email" className="form-label">Email Address</label>
                  <div className="input-wrapper">
                    <input
                      id="email"
                      type="email"
                      className="dark-input"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '8px' }}>
                  <label htmlFor="password" className="form-label">Password</label>
                  <div className="input-wrapper">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      className="dark-input"
                      placeholder="******"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button type="button" className="show-btn" onClick={() => setShowPassword(!showPassword)}>
                      <LockIcon /> {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  <Link href="#" className="forgot-link">Forgot password?</Link>
                </div>

                <button type="submit" className="login-btn">Login</button>
              </form>
            </div>

            <div className="card-footer">
              <LockIcon /> Your data is protected and encrypted for your security.
            </div>
          </div>
        </div>
      </section>

      <section className="right-pane">
        <div className="right-content">
          <span className="badge-pill">TRY AS GUEST</span>

          <h2 className="right-heading">
            Explore our<br />
            platform<br />
            features as a guest.
          </h2>

          <ul className="features-list">
            <li className="feature-item">
              <div className="feature-icon"><DocIcon /></div>
              <div>
                <span className="feature-kicker">MEMBER LOGIN</span>
                <span className="feature-text">
                  Preview common <strong>legal document<br />templates.</strong>
                </span>
              </div>
            </li>

            <li className="feature-item">
              <div className="feature-icon"><ChatIcon /></div>
              <div>
                <span className="feature-text">
                  Try our <strong>AI-powered legal FAQ bot.</strong>
                </span>
              </div>
            </li>

            <li className="feature-item">
              <div className="feature-icon"><HandshakeIcon /></div>
              <div>
                <span className="feature-text">
                  Browse <strong>legal professional profiles.</strong>
                </span>
              </div>
            </li>
          </ul>

          <div className="action-wrapper">
            <span className="recommended-badge">Recommended</span>
            <button type="button" onClick={handleGuest} className="guest-btn">
              Continue to Explore as Guest
            </button>
          </div>

          <p className="guest-note">
            Guest mode lets you explore features, but you won't be able to save<br />
            documents or messages.
          </p>

          <div className="signin-footer">
            Already have an account? <Link href="#">Sign in &gt;</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
