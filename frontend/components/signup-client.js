"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { signupUser } from "../lib/api";
import { saveSession } from "../lib/session";

export default function SignupClient() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  async function handleSignup(event) {
    event.preventDefault();
    setError("");
    setStatus("Creating account...");

    try {
      const session = await signupUser({ name, email, password });
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
          <p className="eyebrow">Account Setup</p>
          <h1>Create a client account</h1>
          <p className="hero-copy">
            This page is separate now, so the main entry screen stays focused on login or guest access.
          </p>
        </div>
      </section>

      {error ? <p className="feedback error">{error}</p> : null}
      {status ? <p className="feedback">{status}</p> : null}

      <section className="auth-grid single">
        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">Sign Up</p>
              <h2>New account</h2>
            </div>
          </div>
          <form className="referral-form" onSubmit={handleSignup}>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Full name" />
            <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email address" />
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password with at least 6 characters"
            />
            <button type="submit">Create account</button>
          </form>
          <p className="muted auth-copy">
            Already registered? <Link href="/">Return to login</Link>.
          </p>
        </article>
      </section>
    </main>
  );
}
