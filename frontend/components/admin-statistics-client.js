"use client";

import { useEffect, useState, useRef } from "react";
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

function renderInfoTile(label, value) {
  return (
    <div style={{ padding: "1rem", borderRadius: "10px", backgroundColor: "#f9f7f4" }}>
      <strong style={{ display: "block", marginBottom: "0.3rem" }}>{label}</strong>
      <span>{value}</span>
    </div>
  );
}

export default function AdminStatisticsClient() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [showLawyerStats, setShowLawyerStats] = useState(false);
  const [showAIStats, setShowAIStats] = useState(false);
  const lawyerSectionRef = useRef(null);
  const aiSectionRef = useRef(null);

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

  useEffect(() => {
  if (showLawyerStats) {
    lawyerSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
}, [showLawyerStats]);

useEffect(() => {
  if (showAIStats) {
    aiSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
}, [showAIStats]);

  return (
    <main className="login-home-page">
      <section className="login-home-action-section">
        <div style={{ maxWidth: "1100px", margin: "0 auto 2rem auto" }}>
          <h1 style={{ margin: 0 }}>Platform Statistics</h1>
          <p style={{ margin: "0.75rem 0 0 0", color: "#6b7280" }}>View platform performance, AI usage, and cost visibility in one place.</p>
        </div>
        {error ? <p className="feedback error">{error}</p> : null}

        {loading && (
          <p style={{ textAlign: "center" }}>Loading statistics...</p>
        )} {!loading && stats && (
          <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
            <div
              className="login-home-action-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "1.5rem",
                marginBottom: "1.5rem"
              }}
            >
              {renderStatCard("Total Users", formatNumber(stats.totalUsers))}
              {renderStatCard("Total Lawyers", formatNumber(stats.totalLawyers))}
              {renderStatCard("Total Cases", formatNumber(stats.totalCases))}
              {renderStatCard("Active Cases", formatNumber(stats.activeCases))}
              {renderStatCard("Completed Cases", formatNumber(stats.completedCases), "Click for lawyer breakdown", {
                onClick: () => setShowLawyerStats((current) => !current),
                active: showLawyerStats,
                title: "Click to view completed case breakdown by lawyer"
              })}
              {renderStatCard("Estimated AI Cost", formatCurrency(stats.aiUsage?.estimatedCostUsd), `${formatCurrency(stats.aiUsage?.averageCostPerRequest)} per request`, {
                onClick: () => setShowAIStats((current) => !current),
                active: showAIStats,
                title: "Click to view AI cost metrics"
              })}
            </div>

            {showLawyerStats && (
                <div ref={lawyerSectionRef} style={{ backgroundColor: "white", borderRadius: "10px", boxShadow: "0 4px 6px rgba(0,0,0,0.05)", padding: "1.5rem", marginBottom: "1.5rem", overflowX: "auto" }}>
                <h2 style={{ marginTop: 0, marginBottom: "1rem" }}>Completed Cases Breakdown</h2>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "center" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#f4f4f5", borderBottom: "2px solid #e4e4e7" }}>
                      <th style={{ padding: "0.85rem", textAlign: "left" }}>Lawyer</th>
                      <th style={{ padding: "0.85rem" }}>Total</th>
                      <th style={{ padding: "0.85rem", color: "#16a34a" }}>Won</th>
                      <th style={{ padding: "0.85rem", color: "#dc2626" }}>Lost</th>
                      <th style={{ padding: "0.85rem", color: "#6b7280" }}>Neither</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.lawyerStats && stats.lawyerStats.length > 0 ? (
                      stats.lawyerStats.map((ls) => (
                        <tr key={ls.lawyerId} style={{ borderBottom: "1px solid #e4e4e7" }}>
                          <td style={{ padding: "0.85rem", textAlign: "left", fontWeight: "bold" }}>{ls.lawyerName}</td>
                          <td style={{ padding: "0.85rem", fontWeight: "bold" }}>{formatNumber(ls.totalCompleted)}</td>
                          <td style={{ padding: "0.85rem" }}>{formatNumber(ls.won)}</td>
                          <td style={{ padding: "0.85rem" }}>{formatNumber(ls.lost)}</td>
                          <td style={{ padding: "0.85rem" }}>{formatNumber(ls.notDecided)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" style={{ padding: "1.5rem", color: "#666" }}>No completed cases found for any lawyer.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) }

            {showAIStats && (
                <div ref={aiSectionRef} style={{ backgroundColor: "white", borderRadius: "10px", boxShadow: "0 4px 6px rgba(0,0,0,0.05)", padding: "1.5rem" }}>
                <h2 style={{ marginTop: 0, marginBottom: "1rem" }}>AI Cost Breakdown</h2>
                <div style={{ display: "grid", gap: "0.85rem", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                  {renderInfoTile("Total AI Requests", formatNumber(stats.aiUsage?.totalRequests))}
                  {renderInfoTile("Case-Linked Requests", formatNumber(stats.aiUsage?.caseLinkedRequests))}
                  {renderInfoTile("Prompt Tokens", formatNumber(stats.aiUsage?.promptTokens))}
                  {renderInfoTile("Completion Tokens", formatNumber(stats.aiUsage?.completionTokens))}
                  {renderInfoTile("Total Tokens", formatNumber(stats.aiUsage?.totalTokens))}
                  {renderInfoTile("Average Cost Per Request", formatCurrency(stats.aiUsage?.averageCostPerRequest))}
                </div>
              </div>
            ) }
          </div>
        )}
      </section>
    </main>
  );
}
