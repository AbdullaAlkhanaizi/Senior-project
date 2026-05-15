"use client";

import { useEffect, useState } from "react";
import { getAdminStats } from "../lib/api";

export default function AdminStatisticsClient() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [showLawyerStats, setShowLawyerStats] = useState(false);

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
          <p>View high-level metrics for the platform.</p>
        </div>
      </section>

      <section className="login-home-action-section">
        {error ? <p className="feedback error">{error}</p> : null}
        
        {loading ? (
          <p style={{ textAlign: "center" }}>Loading statistics...</p>
        ) : stats ? (
          <>
            <div className="login-home-action-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', maxWidth: '1000px', margin: '0 auto', marginBottom: '2rem' }}>
              <div className="login-home-action-card" style={{ textAlign: 'center', padding: '2rem' }}>
                <h3 style={{ fontSize: '3rem', margin: '0 0 0.5rem 0', color: 'var(--color-primary)' }}>{stats.totalUsers}</h3>
                <p style={{ margin: 0, fontWeight: 'bold' }}>Total Users</p>
              </div>
              
              <div className="login-home-action-card" style={{ textAlign: 'center', padding: '2rem' }}>
                <h3 style={{ fontSize: '3rem', margin: '0 0 0.5rem 0', color: 'var(--color-primary)' }}>{stats.totalLawyers}</h3>
                <p style={{ margin: 0, fontWeight: 'bold' }}>Total Lawyers</p>
              </div>

              <div className="login-home-action-card" style={{ textAlign: 'center', padding: '2rem' }}>
                <h3 style={{ fontSize: '3rem', margin: '0 0 0.5rem 0', color: 'var(--color-primary)' }}>{stats.totalCases}</h3>
                <p style={{ margin: 0, fontWeight: 'bold' }}>Total Cases</p>
              </div>

              <div className="login-home-action-card" style={{ textAlign: 'center', padding: '2rem' }}>
                <h3 style={{ fontSize: '3rem', margin: '0 0 0.5rem 0', color: 'var(--color-primary)' }}>{stats.activeCases}</h3>
                <p style={{ margin: 0, fontWeight: 'bold' }}>Active Cases</p>
              </div>

              <div 
                className="login-home-action-card" 
                style={{ textAlign: 'center', padding: '2rem', cursor: 'pointer', border: showLawyerStats ? '2px solid var(--color-primary)' : '' }}
                onClick={() => setShowLawyerStats(!showLawyerStats)}
                title="Click to view breakdown"
              >
                <h3 style={{ fontSize: '3rem', margin: '0 0 0.5rem 0', color: 'var(--color-primary)' }}>{stats.completedCases}</h3>
                <p style={{ margin: 0, fontWeight: 'bold' }}>Completed Cases <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>(Click to expand)</span></p>
              </div>
            </div>

            {showLawyerStats && (
              <div style={{ maxWidth: '1000px', margin: '0 auto', overflowX: 'auto', backgroundColor: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                <h2 style={{ marginTop: 0, marginBottom: '1.5rem', textAlign: 'center' }}>Completed Cases Breakdown by Lawyer</h2>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f4f4f5', borderBottom: '2px solid #e4e4e7' }}>
                      <th style={{ padding: '1rem', textAlign: 'left' }}>Lawyer Name</th>
                      <th style={{ padding: '1rem' }}>Total Completed</th>
                      <th style={{ padding: '1rem', color: '#16a34a' }}>Won</th>
                      <th style={{ padding: '1rem', color: '#dc2626' }}>Lost</th>
                      <th style={{ padding: '1rem', color: '#6b7280' }}>Not Decided</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.lawyerStats && stats.lawyerStats.length > 0 ? (
                      stats.lawyerStats.map((ls) => (
                        <tr key={ls.lawyerId} style={{ borderBottom: '1px solid #e4e4e7' }}>
                          <td style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold' }}>{ls.lawyerName}</td>
                          <td style={{ padding: '1rem', fontWeight: 'bold' }}>{ls.totalCompleted}</td>
                          <td style={{ padding: '1rem' }}>{ls.won}</td>
                          <td style={{ padding: '1rem' }}>{ls.lost}</td>
                          <td style={{ padding: '1rem' }}>{ls.notDecided}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" style={{ padding: '2rem', color: '#666' }}>No completed cases found for any lawyer.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : null}
      </section>
    </main>
  );
}