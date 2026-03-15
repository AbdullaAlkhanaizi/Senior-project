import Link from "next/link";

export default function PortalShell({ title, description, children }) {
  return (
    <main className="page-shell">
      <header className="topbar">
        <Link href="/" className="brand-mark">
          Legal Consultant
        </Link>
        <nav className="topnav">
          <Link href="/home">Home</Link>
          <Link href="/ai">AI</Link>
          <Link href="/faq">FAQ</Link>
          <Link href="/messaging">Messaging</Link>
        </nav>
      </header>

      <section className="hero compact">
        <div>
          <p className="eyebrow">Senior Project</p>
          <h1>{title}</h1>
          <p className="hero-copy">{description}</p>
        </div>
      </section>

      {children}
    </main>
  );
}
