"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { signupUser } from "../lib/api";
import { saveSession } from "../lib/session";

const BackIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M14.5 6 8.5 12l6 6" />
    <path d="M9 12h7" />
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="m5 12 4.2 4.2L19 6.5" />
  </svg>
);

const EyeIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M2.5 12s3.7-6 9.5-6 9.5 6 9.5 6-3.7 6-9.5 6-9.5-6-9.5-6Z" />
    <circle cx="12" cy="12" r="3.2" />
  </svg>
);

const EyeOffIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="m3 3 18 18" />
    <path d="M10.6 6.3A10.9 10.9 0 0 1 12 6c5.8 0 9.5 6 9.5 6a16.5 16.5 0 0 1-3.1 3.8" />
    <path d="M6.2 6.2A16.7 16.7 0 0 0 2.5 12s3.7 6 9.5 6c1.7 0 3.3-.5 4.7-1.3" />
    <path d="M9.9 9.9A3 3 0 0 0 9 12a3 3 0 0 0 4.8 2.4" />
  </svg>
);

const KeyIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="8" cy="15" r="3.2" />
    <path d="M10.6 12.6 21 2.2" />
    <path d="M16.6 4.2 19 6.6" />
    <path d="M14.2 6.6 16.6 9" />
  </svg>
);

function RuleItem({ active, dimmed, children }) {
  const classes = ["signup-reference-rule"];
  if (active) classes.push("is-active");
  if (dimmed) classes.push("is-dimmed");

  return (
    <li className={classes.join(" ")}>
      <span />
      {children}
    </li>
  );
}

export default function SignupClient() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const passwordChecks = useMemo(
    () => ({
      minLength: password.length >= 6,
      hasNumber: /\d/.test(password),
      hasMixedCase: /[a-z]/.test(password) && /[A-Z]/.test(password)
    }),
    [password]
  );

  async function handleSignup(event) {
    event.preventDefault();
    setError("");

    if (!passwordChecks.minLength || !passwordChecks.hasNumber) {
      setError("Please use at least 6 characters and include at least one number.");
      return;
    }

    setStatus("Creating account...");

    try {
      const session = await signupUser({ name, email, password });
      saveSession(session);
      router.push("/messaging");
    } catch (requestError) {
      setError(requestError.message);
      setStatus("");
    }
  }

  return (
    <main className="signup-reference-page">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap");

            .signup-reference-page {
              min-height: 100vh;
              padding: clamp(24px, 4vw, 54px);
              background:
                radial-gradient(circle at 50% 50%, rgba(228, 214, 193, 0.52), rgba(228, 214, 193, 0) 56%),
                linear-gradient(180deg, #eee5d9 0%, #e5dccf 100%);
              font-family: "Inter", "Segoe UI", sans-serif;
              color: #fff;
              overflow: hidden;
            }

            .signup-reference-shell {
              position: relative;
              min-height: calc(100vh - clamp(48px, 8vw, 108px));
              border-radius: 22px;
              padding: clamp(18px, 4vw, 48px);
              background:
                radial-gradient(circle at 50% 18%, rgba(253, 248, 241, 0.72), rgba(253, 248, 241, 0.08) 46%),
                linear-gradient(180deg, rgba(236, 225, 208, 0.92), rgba(224, 211, 193, 0.94));
              box-shadow:
                inset 0 22px 42px rgba(255, 255, 255, 0.16),
                0 30px 70px rgba(97, 73, 50, 0.16);
            }

            .signup-reference-shell::after {
              content: "";
              position: absolute;
              right: 10px;
              bottom: 8px;
              width: 42px;
              height: 42px;
              background:
                linear-gradient(135deg, rgba(255, 255, 255, 0) 42%, rgba(255, 255, 255, 0.92) 43%, rgba(255, 255, 255, 0) 58%),
                linear-gradient(45deg, rgba(255, 255, 255, 0) 42%, rgba(255, 255, 255, 0.92) 43%, rgba(255, 255, 255, 0) 58%);
              opacity: 0.8;
              transform: rotate(6deg);
              pointer-events: none;
            }

            .signup-reference-card {
              position: relative;
              min-height: calc(100vh - clamp(84px, 10vw, 164px));
              display: grid;
              grid-template-columns: minmax(0, 1.18fr) minmax(340px, 0.92fr);
              border-radius: 24px;
              overflow: hidden;
              background:
                radial-gradient(circle at 16% 18%, rgba(75, 83, 108, 0.26), transparent 28%),
                linear-gradient(140deg, #23334d 0%, #1f2b40 55%, #1a2437 100%);
              box-shadow: 0 28px 60px rgba(30, 39, 72, 0.28);
            }

            .signup-reference-card::before {
              content: "";
              position: absolute;
              inset: 0;
              background:
                radial-gradient(circle at 18% 42%, rgba(255, 255, 255, 0.035), transparent 34%),
                radial-gradient(circle at 80% 18%, rgba(255, 255, 255, 0.05), transparent 22%);
              pointer-events: none;
            }

            .signup-reference-left {
              position: relative;
              z-index: 2;
              padding: clamp(28px, 5vw, 62px) clamp(24px, 4.5vw, 56px);
              display: flex;
              align-items: center;
            }

            .signup-reference-left::after {
              content: "";
              position: absolute;
              top: 0;
              right: -2px;
              width: 96px;
              height: 100%;
              background: linear-gradient(180deg, rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0.01));
              clip-path: polygon(35% 0, 100% 0, 78% 100%, 0 100%);
              opacity: 0.34;
              pointer-events: none;
            }

            .signup-reference-form-wrap {
              width: min(100%, 392px);
            }

            .signup-reference-topbar {
              display: flex;
              flex-wrap: wrap;
              gap: 18px 34px;
              align-items: center;
              margin-bottom: 40px;
              color: rgba(255, 248, 240, 0.8);
              font-size: 0.95rem;
            }

            .signup-reference-back {
              display: inline-flex;
              align-items: center;
              gap: 10px;
              color: inherit;
              text-decoration: none;
            }

            .signup-reference-back:hover,
            .signup-reference-signin:hover {
              color: #ffffff;
            }

            .signup-reference-back-badge {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              width: 28px;
              height: 28px;
              border-radius: 999px;
              border: 1px solid rgba(255, 248, 240, 0.14);
              background: rgba(255, 248, 240, 0.02);
            }

            .signup-reference-back-badge svg,
            .signup-reference-password-toggle svg {
              width: 16px;
              height: 16px;
              fill: none;
              stroke: currentColor;
              stroke-width: 1.8;
              stroke-linecap: round;
              stroke-linejoin: round;
            }

            .signup-reference-signin {
              color: rgba(255, 248, 240, 0.8);
              text-decoration: none;
            }

            .signup-reference-signin span {
              border-bottom: 1px solid rgba(255, 248, 240, 0.4);
            }

            .signup-reference-kicker {
              margin: 0 0 10px;
              color: rgba(255, 248, 240, 0.72);
              font-size: 0.94rem;
              font-weight: 500;
              letter-spacing: 0.1em;
              text-transform: uppercase;
            }

            .signup-reference-title {
              margin: 0 0 28px;
              color: #fff7ef;
              font-family: "Playfair Display", Georgia, serif;
              font-size: clamp(3rem, 5vw, 4.2rem);
              font-weight: 600;
              line-height: 0.95;
              letter-spacing: -0.045em;
            }

            .signup-reference-feedback {
              margin: 0 0 16px;
              padding: 12px 14px;
              border-radius: 14px;
              background: rgba(255, 255, 255, 0.06);
              border: 1px solid rgba(255, 255, 255, 0.08);
              color: rgba(255, 255, 255, 0.88);
            }

            .signup-reference-feedback.is-error {
              border-color: rgba(166, 75, 42, 0.34);
              background: rgba(166, 75, 42, 0.18);
            }

            .signup-reference-form {
              display: grid;
              gap: 14px;
            }

            .signup-reference-field {
              position: relative;
            }

            .signup-reference-input {
              width: 100%;
              height: 40px;
              padding: 0 42px 0 15px;
              border-radius: 11px;
              border: 1px solid rgba(166, 75, 42, 0.82);
              background: rgba(23, 32, 50, 0.28);
              color: #fff7ef;
              outline: none;
              transition: border-color 180ms ease, box-shadow 180ms ease, background 180ms ease;
            }

            .signup-reference-input::placeholder {
              color: rgba(255, 248, 240, 0.48);
            }

            .signup-reference-input:focus {
              background: rgba(23, 32, 50, 0.42);
              box-shadow: 0 0 0 3px rgba(166, 75, 42, 0.18);
            }

            .signup-reference-field-state,
            .signup-reference-password-toggle {
              position: absolute;
              top: 50%;
              right: 13px;
              transform: translateY(-50%);
              color: rgba(214, 221, 230, 0.72);
            }

            .signup-reference-field-state svg {
              width: 15px;
              height: 15px;
              fill: none;
              stroke: #33695a;
              stroke-width: 2.2;
              stroke-linecap: round;
              stroke-linejoin: round;
            }

            .signup-reference-password-toggle {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              padding: 0;
              border: 0;
              background: transparent;
              box-shadow: none;
              cursor: pointer;
            }

            .signup-reference-rules {
              margin: 0;
              padding: 0;
              list-style: none;
              display: grid;
              gap: 8px;
              color: rgba(255, 255, 255, 0.85);
              font-size: 0.93rem;
            }

            .signup-reference-rule {
              display: flex;
              align-items: center;
              gap: 10px;
              color: rgba(255, 255, 255, 0.78);
            }

            .signup-reference-rule span {
              width: 9px;
              height: 9px;
              border-radius: 50%;
              background: rgba(112, 120, 149, 0.35);
            }

            .signup-reference-rule.is-active span {
              background: #a64b2a;
              box-shadow: 0 0 0 3px rgba(166, 75, 42, 0.12);
            }

            .signup-reference-rule.is-dimmed {
              color: rgba(255, 255, 255, 0.28);
            }

            .signup-reference-divider {
              margin: 22px 0 20px;
              display: flex;
              align-items: center;
              gap: 10px;
              color: rgba(255, 255, 255, 0.4);
              font-size: 0.92rem;
            }

            .signup-reference-divider::after {
              content: "";
              flex: 1;
              height: 1px;
              background: rgba(255, 255, 255, 0.18);
            }

            .signup-reference-divider svg {
              width: 16px;
              height: 16px;
              fill: none;
              stroke: currentColor;
              stroke-width: 1.8;
              stroke-linecap: round;
              stroke-linejoin: round;
            }

            .signup-reference-submit {
              width: fit-content;
              min-width: 146px;
              height: 38px;
              padding: 0 22px;
              border-radius: 999px;
              border: 0;
              background: linear-gradient(180deg, #b6603e 0%, #793519 100%);
              color: #fff7ef;
              font-weight: 600;
              cursor: pointer;
              box-shadow: 0 12px 28px rgba(121, 53, 25, 0.28);
              transition: transform 180ms ease, filter 180ms ease;
            }

            .signup-reference-submit:hover {
              transform: translateY(-1px);
              filter: brightness(1.04);
            }

            .signup-reference-footer {
              margin-top: 66px;
              display: inline-flex;
              align-items: center;
              gap: 10px;
              color: rgba(255, 248, 240, 0.82);
              font-size: 0.78rem;
              text-transform: uppercase;
              letter-spacing: 0.04em;
            }

            .signup-reference-footer-flag {
              font-size: 1rem;
            }

            .signup-reference-chevron {
              font-size: 0.86rem;
              opacity: 0.7;
            }

            .signup-reference-right {
              position: relative;
              overflow: hidden;
              background:
                linear-gradient(140deg, #f5efe4 14%, #fffaf3 42%, #e9dfcf 100%);
            }

            .signup-reference-right::before,
            .signup-reference-right::after {
              content: "";
              position: absolute;
              background: linear-gradient(135deg, #617186, #465164);
            }

            .signup-reference-right::before {
              top: -28px;
              left: -44px;
              width: 110%;
              height: 152px;
              border-radius: 28px;
              transform: rotate(-12deg);
            }

            .signup-reference-right::after {
              right: -86px;
              bottom: -54px;
              width: 86%;
              height: 150px;
              border-radius: 36px;
              transform: rotate(-39deg);
            }

            .signup-reference-shape-a,
            .signup-reference-shape-b,
            .signup-reference-shape-c {
              position: absolute;
              background: linear-gradient(135deg, #637287, #485367);
              pointer-events: none;
            }

            .signup-reference-shape-a {
              top: -18px;
              right: -20px;
              width: 320px;
              height: 122px;
              border-radius: 28px;
              transform: rotate(8deg);
            }

            .signup-reference-shape-b {
              top: 34%;
              left: -14%;
              width: 132%;
              height: 108px;
              clip-path: polygon(0 78%, 100% 0, 100% 54%, 0 100%);
              opacity: 0.86;
            }

            .signup-reference-shape-c {
              right: -28px;
              top: 50%;
              width: 82%;
              height: 140px;
              clip-path: polygon(38% 0, 100% 0, 100% 100%, 0 100%);
              opacity: 0.94;
            }

            .signup-reference-stat-card,
            .signup-reference-info-card {
              position: absolute;
              z-index: 2;
              background: linear-gradient(180deg, rgba(250, 245, 236, 0.97), rgba(239, 230, 214, 0.96));
              border-radius: 22px;
              box-shadow: 0 20px 46px rgba(76, 80, 108, 0.22);
              color: #22252d;
            }

            .signup-reference-stat-card {
              top: 118px;
              left: 64px;
              width: 144px;
              min-height: 188px;
              padding: 18px 20px;
            }

            .signup-reference-stat-head {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 8px;
              color: #a64b2a;
            }

            .signup-reference-stat-head strong {
              display: block;
              margin-top: 6px;
              color: #1d1f26;
              font-size: 1rem;
            }

            .signup-reference-stat-head svg,
            .signup-reference-info-card svg {
              width: 26px;
              height: 26px;
              fill: none;
              stroke: #a64b2a;
              stroke-width: 1.9;
              stroke-linecap: round;
              stroke-linejoin: round;
            }

            .signup-reference-mini-chart {
              position: absolute;
              left: 20px;
              right: 20px;
              bottom: 24px;
              height: 70px;
            }

            .signup-reference-mini-chart svg {
              width: 100%;
              height: 100%;
            }

            .signup-reference-mini-chart path {
              fill: none;
              stroke: #a64b2a;
              stroke-width: 3.4;
              stroke-linecap: round;
            }

            .signup-reference-mini-badge {
              position: absolute;
              left: 50%;
              top: 30px;
              transform: translateX(-50%);
              width: 32px;
              height: 32px;
              border-radius: 50%;
              background: #c9c1b6;
              color: #ffffff;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              font-size: 0.74rem;
            }

            .signup-reference-info-card {
              right: 68px;
              bottom: 158px;
              width: min(100% - 104px, 286px);
              padding: 26px 24px 20px;
              display: grid;
              grid-template-columns: 74px 1fr;
              gap: 16px;
            }

            .signup-reference-info-lines {
              display: grid;
              gap: 10px;
              align-content: start;
              padding-top: 4px;
            }

            .signup-reference-info-lines span {
              display: block;
              height: 7px;
              border-radius: 999px;
              background: linear-gradient(180deg, rgba(220, 214, 203, 0.88), rgba(196, 189, 176, 0.66));
            }

            .signup-reference-info-lines span:nth-child(1) {
              width: 54px;
              height: 12px;
              background: linear-gradient(180deg, rgba(214, 209, 198, 0.95), rgba(196, 189, 176, 0.8));
            }

            .signup-reference-info-lines span:nth-child(2) {
              width: 68px;
            }

            .signup-reference-info-lines span:nth-child(3) {
              width: 42px;
            }

            .signup-reference-info-lines span:nth-child(4) {
              width: 56px;
            }

            .signup-reference-info-copy h3 {
              margin: 18px 0 10px;
              color: #20232b;
              font-size: 0.98rem;
              line-height: 1.25;
              font-family: "Playfair Display", Georgia, serif;
            }

            .signup-reference-info-copy p {
              margin: 0;
              color: rgba(32, 35, 43, 0.78);
              font-size: 0.87rem;
              line-height: 1.45;
            }

            @media (max-width: 1080px) {
              .signup-reference-card {
                grid-template-columns: 1fr;
              }

              .signup-reference-right {
                min-height: 420px;
              }

              .signup-reference-left::after {
                display: none;
              }
            }

            @media (max-width: 720px) {
              .signup-reference-page {
                padding: 16px;
              }

              .signup-reference-shell {
                padding: 14px;
              }

              .signup-reference-left {
                padding: 24px 18px;
              }

              .signup-reference-topbar {
                margin-bottom: 28px;
              }

              .signup-reference-title {
                font-size: 2.6rem;
              }

              .signup-reference-right {
                min-height: 340px;
              }

              .signup-reference-stat-card {
                top: 48px;
                left: 22px;
                width: 132px;
                min-height: 170px;
              }

              .signup-reference-info-card {
                right: 18px;
                bottom: 42px;
                width: calc(100% - 36px);
              }
            }
          `
        }}
      />

      <div className="signup-reference-shell">
        <section className="signup-reference-card">
          <div className="signup-reference-left">
            <div className="signup-reference-form-wrap">
              <div className="signup-reference-topbar">
                <Link href="/" className="signup-reference-back">
                  <span className="signup-reference-back-badge">
                    <BackIcon />
                  </span>
                  Back
                </Link>
                <Link href="/" className="signup-reference-signin">
                  Already a client? <span>Return to sign in.</span>
                </Link>
              </div>

              {error ? <p className="signup-reference-feedback is-error">{error}</p> : null}
              {status ? <p className="signup-reference-feedback">{status}</p> : null}

              <p className="signup-reference-kicker">Client Sign Up</p>
              <h1 className="signup-reference-title">New client</h1>

              <form className="signup-reference-form" onSubmit={handleSignup}>
                <div className="signup-reference-field">
                  <input
                    className="signup-reference-input"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Full name"
                    required
                  />
                  {name.trim() ? (
                    <span className="signup-reference-field-state" aria-hidden="true">
                      <CheckIcon />
                    </span>
                  ) : null}
                </div>

                <div className="signup-reference-field">
                  <input
                    className="signup-reference-input"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Email address"
                    type="email"
                    required
                  />
                  {/\S+@\S+\.\S+/.test(email) ? (
                    <span className="signup-reference-field-state" aria-hidden="true">
                      <CheckIcon />
                    </span>
                  ) : null}
                </div>

                <div className="signup-reference-field">
                  <input
                    className="signup-reference-input"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Password with at least 6 characters"
                    required
                  />
                  <button
                    className="signup-reference-password-toggle"
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((current) => !current)}
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>

                <ul className="signup-reference-rules">
                  <RuleItem active={passwordChecks.minLength}>At least 6 characters</RuleItem>
                  <RuleItem active={passwordChecks.hasNumber}>At least one number (0-9)</RuleItem>
                  <RuleItem active={passwordChecks.hasMixedCase} dimmed={!passwordChecks.hasMixedCase}>
                    Lowercase and uppercase letters
                  </RuleItem>
                </ul>

                <div className="signup-reference-divider">
                  <EyeOffIcon />
                  Secure client access
                </div>

                <button className="signup-reference-submit" type="submit">
                  Create account
                </button>
              </form>

              <div className="signup-reference-footer">
                <span className="signup-reference-footer-flag">EN</span>
                Client portal
                <span className="signup-reference-chevron">^</span>
              </div>
            </div>
          </div>

          <div className="signup-reference-right" aria-hidden="true">
            <div className="signup-reference-shape-a" />
            <div className="signup-reference-shape-b" />
            <div className="signup-reference-shape-c" />

            <div className="signup-reference-stat-card">
              <div className="signup-reference-stat-head">
                <div>
                  Clients
                  <strong>176,18</strong>
                </div>
                <KeyIcon />
              </div>

              <div className="signup-reference-mini-chart">
                <span className="signup-reference-mini-badge">45</span>
                <svg viewBox="0 0 120 70">
                  <path d="M4 52c10-18 17-18 26 4 8 18 18 18 27-1 9-19 16-19 25 1 9 18 16 18 23-2 5-12 9-14 15-2" />
                </svg>
              </div>
            </div>

            <div className="signup-reference-info-card">
              <div className="signup-reference-info-lines">
                <span />
                <span />
                <span />
                <span />
              </div>
              <div className="signup-reference-info-copy">
                <KeyIcon />
                <h3>Your case data stays protected</h3>
                <p>Private client records stay scoped to your account with secure access across the portal.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
