"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAdminUsers } from "../lib/api";

export default function AdminUsersClient() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUsers() {
      try {
        const data = await getAdminUsers();
        setUsers(data || []);
      } catch (err) {
        setError(err.message || "Failed to load users.");
      } finally {
        setLoading(false);
      }
    }
    loadUsers();
  }, []);

  return (
    <main className="login-home-page">
      <section className="login-home-hero">
        <div className="login-home-hero-copy">
          <h1>User Management</h1>
          <p>Manage clients and lawyers on the platform.</p>
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
          <p style={{ textAlign: "center" }}>Loading users...</p>
        ) : (
          <div style={{ maxWidth: '1000px', margin: '0 auto', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
              <thead>
                <tr style={{ backgroundColor: '#f4f4f5', borderBottom: '2px solid #e4e4e7', textAlign: 'left' }}>
                  <th style={{ padding: '1rem' }}>ID</th>
                  <th style={{ padding: '1rem' }}>Name</th>
                  <th style={{ padding: '1rem' }}>Email</th>
                  <th style={{ padding: '1rem' }}>Role</th>
                  <th style={{ padding: '1rem' }}>Created At</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '1rem' }}>{user.id}</td>
                    <td style={{ padding: '1rem', fontWeight: 'bold' }}>{user.name}</td>
                    <td style={{ padding: '1rem' }}>{user.email}</td>
                    <td style={{ padding: '1rem' }}>
                      <span className={`badge ${user.role === 'admin' ? 'admin' : user.role === 'lawyer' ? 'lawyer' : 'client'}`} style={{ textTransform: 'capitalize' }}>
                        {user.role}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', color: '#666' }}>{new Date(user.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>No users found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}