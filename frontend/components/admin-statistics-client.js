"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAdminStats } from "../lib/api";

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 4,
    maximumFractionDigits: 4
  }).format(Number(value || 0));
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(Number(value || 0));
}

function renderStatCard(label, value, helper, options = {}) {
  return (
    <div
      className="login-home-action-card"
      style={{
        textAlign: "center",
        padding: "2rem",
        cursor: options.onClick ? "pointer" : "default",
        border: options.active ? "2px solid var(--color-primary)" : ""
      }}
      onClick={options.onClick}
      title={options.title}
    >
      <h3 style={{ fontSize: "2.7rem", margin: "0 0 0.5rem 0", color: "var(--color-primary)" }}>{value}</h3>
      <p style={{ margin: 0, fontWeight: "bold" }}>{label}</p>
      {helper ? <p style={{ margin: "0.4rem 0 0 0", fontSize: "0.9rem", opacity: 0.75 }}>{helper}</p> : null}
    </div>
  );
}

function renderTableShell(title, children) {
  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto 2rem auto", overflowX: "auto", backgroundColor: "white", padding: "2rem", borderRadius: "8px", boxShadow: "0 4px 6px rgba(0,0,0,0.05)" }}>
      <h2 style={{ marginTop: 0, marginBottom: "1.5rem", textAlign: "center" }}>{title}</h2>
      {children}
    </div>
  );
}

export default function AdminStatisticsClient() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [showLawyerStats, setShowLawyerStats] = useState(false);
  const [showAIStats, setShowAIStats] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const data = await getAdminStats();
        setStats(data);
      } catch (err) {
        setError(err.message || "Failed to load statistics.");
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  return (
    <main className="login-home-page">
      <section className="login-home-hero">
        <div className="login-home-hero-copy">
          <h1>Platform Statistics</h1>
          <p>View platform performance, AI usage, and cost visibility in one place.</p>
          <div style={{ marginTop: "1.5rem" }}>
            <Link href="/home" className="login-home-button login-home-button-secondary" style={{ minHeight: "auto", minWidth: "auto", padding: "10px 20px" }}>
              Back to Dashboard
            </Link>
          </div>
        </div>
      </section>

      <section className="login-home-action-section">
        {error ? <p className="feedback error">{error}</p> : null}

        {loading ? (
          <p style={{ textAlign: "center" }}>Loading statistics...</p>
        ) : stats ? (
          <>
            <div className="login-home-action-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem", maxWidth: "1100px", margin: "0 auto", marginBottom: "2rem" }}>
              {renderStatCard("Total Users", formatNumber(stats.totalUsers))}
              {renderStatCard("Total Lawyers", formatNumber(stats.totalLawyers))}
              {renderStatCard("Total Cases", formatNumber(stats.totalCases))}
              {renderStatCard("Active Cases", formatNumber(stats.activeCases))}
              {renderStatCard("Completed Cases", formatNumber(stats.completedCases), "Click for lawyer breakdown", {
                onClick: () => setShowLawyerStats((current) => !current),
                active: showLawyerStats,
                title: "Click to view completed case breakdown by lawyer"
              })}
              {renderStatCard("AI Requests", formatNumber(stats.aiUsage?.totalRequests), `${formatNumber(stats.aiUsage?.caseLinkedRequests)} linked to cases`, {
                onClick: () => setShowAIStats((current) => !current),
                active: showAIStats,
                title: "Click to show AI usage breakdowns"
              })}
              {renderStatCard("AI Prompt Tokens", formatNumber(stats.aiUsage?.promptTokens))}
              {renderStatCard("AI Completion Tokens", formatNumber(stats.aiUsage?.completionTokens))}
              {renderStatCard("AI Total Tokens", formatNumber(stats.aiUsage?.totalTokens))}
              {renderStatCard("Estimated AI Cost", formatCurrency(stats.aiUsage?.estimatedCostUsd), `${formatCurrency(stats.aiUsage?.averageCostPerRequest)} per request`)}
              {renderStatCard("Tracked AI Users", formatNumber(stats.aiUsage?.trackedUsers))}
            </div>

            {showLawyerStats ? renderTableShell(
              "Completed Cases Breakdown by Lawyer",
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "center" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f4f4f5", borderBottom: "2px solid #e4e4e7" }}>
                    <th style={{ padding: "1rem", textAlign: "left" }}>Lawyer Name</th>
                    <th style={{ padding: "1rem" }}>Total Completed</th>
                    <th style={{ padding: "1rem", color: "#16a34a" }}>Won</th>
                    <th style={{ padding: "1rem", color: "#dc2626" }}>Lost</th>
                    <th style={{ padding: "1rem", color: "#6b7280" }}>Not Decided</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.lawyerStats && stats.lawyerStats.length > 0 ? (
                    stats.lawyerStats.map((ls) => (
                      <tr key={ls.lawyerId} style={{ borderBottom: "1px solid #e4e4e7" }}>
                        <td style={{ padding: "1rem", textAlign: "left", fontWeight: "bold" }}>{ls.lawyerName}</td>
                        <td style={{ padding: "1rem", fontWeight: "bold" }}>{formatNumber(ls.totalCompleted)}</td>
                        <td style={{ padding: "1rem" }}>{formatNumber(ls.won)}</td>
                        <td style={{ padding: "1rem" }}>{formatNumber(ls.lost)}</td>
                        <td style={{ padding: "1rem" }}>{formatNumber(ls.notDecided)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" style={{ padding: "2rem", color: "#666" }}>No completed cases found for any lawyer.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : null}

            {showAIStats ? (
              <>
                {renderTableShell(
                  "AI Usage by User",
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "center" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#f4f4f5", borderBottom: "2px solid #e4e4e7" }}>
                        <th style={{ padding: "1rem", textAlign: "left" }}>User</th>
                        <th style={{ padding: "1rem" }}>Role</th>
                        <th style={{ padding: "1rem" }}>Requests</th>
                        <th style={{ padding: "1rem" }}>Prompt Tokens</th>
                        <th style={{ padding: "1rem" }}>Completion Tokens</th>
                        <th style={{ padding: "1rem" }}>Total Tokens</th>
                        <th style={{ padding: "1rem" }}>Estimated Cost</th>
                        <th style={{ padding: "1rem" }}>Last Used</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.aiUsageByUser && stats.aiUsageByUser.length > 0 ? (
                        stats.aiUsageByUser.map((entry, index) => (
                          <tr key={`${entry.userId || entry.userName}-${index}`} style={{ borderBottom: "1px solid #e4e4e7" }}>
                            <td style={{ padding: "1rem", textAlign: "left", fontWeight: "bold" }}>{entry.userName}</td>
                            <td style={{ padding: "1rem", textTransform: "capitalize" }}>{entry.userRole}</td>
                            <td style={{ padding: "1rem" }}>{formatNumber(entry.requestCount)}</td>
                            <td style={{ padding: "1rem" }}>{formatNumber(entry.promptTokens)}</td>
                            <td style={{ padding: "1rem" }}>{formatNumber(entry.completionTokens)}</td>
                            <td style={{ padding: "1rem", fontWeight: "bold" }}>{formatNumber(entry.totalTokens)}</td>
                            <td style={{ padding: "1rem", color: "var(--color-primary)", fontWeight: "bold" }}>{formatCurrency(entry.estimatedCostUsd)}</td>
                            <td style={{ padding: "1rem" }}>{entry.lastUsedAt || "N/A"}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="8" style={{ padding: "2rem", color: "#666" }}>No AI usage has been logged yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}

                {renderTableShell(
                  "AI Usage by Case",
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "center" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#f4f4f5", borderBottom: "2px solid #e4e4e7" }}>
                        <th style={{ padding: "1rem", textAlign: "left" }}>Case</th>
                        <th style={{ padding: "1rem", textAlign: "left" }}>Client</th>
                        <th style={{ padding: "1rem", textAlign: "left" }}>Lawyer</th>
                        <th style={{ padding: "1rem" }}>Requests</th>
                        <th style={{ padding: "1rem" }}>Total Tokens</th>
                        <th style={{ padding: "1rem" }}>Estimated Cost</th>
                        <th style={{ padding: "1rem" }}>Last Used</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.aiUsageByCase && stats.aiUsageByCase.length > 0 ? (
                        stats.aiUsageByCase.map((entry) => (
                          <tr key={entry.caseId} style={{ borderBottom: "1px solid #e4e4e7" }}>
                            <td style={{ padding: "1rem", textAlign: "left", fontWeight: "bold" }}>
                              #{entry.caseId} {entry.caseTitle}
                            </td>
                            <td style={{ padding: "1rem", textAlign: "left" }}>{entry.clientName || "N/A"}</td>
                            <td style={{ padding: "1rem", textAlign: "left" }}>{entry.lawyerName || "N/A"}</td>
                            <td style={{ padding: "1rem" }}>{formatNumber(entry.requestCount)}</td>
                            <td style={{ padding: "1rem", fontWeight: "bold" }}>{formatNumber(entry.totalTokens)}</td>
                            <td style={{ padding: "1rem", color: "var(--color-primary)", fontWeight: "bold" }}>{formatCurrency(entry.estimatedCostUsd)}</td>
                            <td style={{ padding: "1rem" }}>{entry.lastUsedAt || "N/A"}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="7" style={{ padding: "2rem", color: "#666" }}>No case-linked AI usage has been logged yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </>
            ) : null}
          </>
        ) : null}
      </section>
    </main>
  );
}
