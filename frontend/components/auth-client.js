"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { continueAsGuest, loginUser } from "../lib/api";
import { saveSession } from "../lib/session";

export default function AuthClient() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [guestName, setGuestName] = useState("Guest User");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  async function handleLogin(event) {
    event.preventDefault();
    setError("");
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
      const session = await continueAsGuest({ name: guestName });
      saveSession(session);
      router.push("/home");
    } catch (requestError) {
      setError(requestError.message);
      setStatus("");
    }
  }

  return (
    <main className="page-shell auth-shell">
      <section className="hero auth-hero">
        <div>
          <p className="eyebrow">Legal Portal</p>
          <h1>Start with login or continue as guest</h1>
          <p className="hero-copy">
            This project now starts with a dedicated entry page. Signed-in users and guests can both
            reach the AI, FAQ, and lawyer messaging areas from the home hub.
          </p>
        </div>
        <div className="hero-card">
          <span>Available paths</span>
          <strong>Login, Sign Up, Guest</strong>
          <p>Use guest mode for demos, or create an account for a full client flow.</p>
        </div>
      </section>

      {error ? <p className="feedback error">{error}</p> : null}
      {status ? <p className="feedback">{status}</p> : null}

      <section className="auth-grid">
        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">Member Login</p>
              <h2>Sign in</h2>
            </div>
          </div>
          <form className="referral-form" onSubmit={handleLogin}>
            <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email address" />
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
            />
            <button type="submit">Login</button>
          </form>
          <p className="muted auth-copy">
            Need an account? <Link href="/signup">Open the sign up page</Link>.
          </p>
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">Guest Access</p>
              <h2>Continue without signup</h2>
            </div>
          </div>
          <div className="referral-form">
            <input value={guestName} onChange={(event) => setGuestName(event.target.value)} placeholder="Guest name" />
            <button type="button" onClick={handleGuest}>
              Continue as guest
            </button>
          </div>
          <p className="muted auth-copy">
            Guest mode is useful for demos and testing the website flow before real auth is added.
          </p>
        </article>
      </section>
    </main>
  );
}
