"use client";

import { useEffect, useState } from "react";
import { getAdminUsers, updateAdminUser, deleteAdminUser } from "../lib/api";

const ROLES = ["client", "lawyer", "admin"];

export default function AdminUsersClient() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", role: "" });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    setLoading(true);
    try {
      const data = await getAdminUsers();
      setUsers(data || []);
    } catch (err) {
      setError(err.message || "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }

  function openEdit(user) {
    setEditUser(user);
    setEditForm({ name: user.name, email: user.email, role: user.role });
    setEditError("");
  }

  function closeEdit() {
    setEditUser(null);
    setEditError("");
  }

  async function handleEditSave() {
    if (!editForm.name.trim() || !editForm.email.trim()) {
      setEditError("Name and email are required.");
      return;
    }
    setEditLoading(true);
    setEditError("");
    try {
      const updated = await updateAdminUser(editUser.id, editForm);
      setUsers((prev) => prev.map((u) => (u.id === editUser.id ? { ...u, ...updated } : u)));
      closeEdit();
    } catch (err) {
      setEditError(err.message || "Failed to update user.");
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDeleteConfirm() {
    setDeleteLoading(true);
    try {
      await deleteAdminUser(deleteTarget.id);
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setError(err.message || "Failed to delete user.");
      setDeleteTarget(null);
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <main className="login-home-page">
      <section className="login-home-action-section">
        <div style={{ maxWidth: "1000px", margin: "0 auto 2rem auto" }}>
          <h1 style={{ margin: 0 }}>User Management</h1>
          <p style={{ margin: "0.75rem 0 0 0", color: "#6b7280" }}>
            Manage clients and lawyers on the platform.
          </p>
        </div>

        {error ? <p className="feedback error">{error}</p> : null}

        {loading ? (
          <p style={{ textAlign: "center" }}>Loading users...</p>
        ) : (
          <div style={{ maxWidth: "1000px", margin: "0 auto", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "white", borderRadius: "8px", overflow: "hidden", boxShadow: "0 4px 6px rgba(0,0,0,0.05)" }}>
              <thead>
                <tr style={{ backgroundColor: "#f4f4f5", borderBottom: "2px solid #e4e4e7", textAlign: "left" }}>
                  <th style={{ padding: "1rem" }}>ID</th>
                  <th style={{ padding: "1rem" }}>Name</th>
                  <th style={{ padding: "1rem" }}>Email</th>
                  <th style={{ padding: "1rem" }}>Role</th>
                  <th style={{ padding: "1rem" }}>Created At</th>
                  <th style={{ padding: "1rem" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} style={{ borderBottom: "1px solid #e4e4e7" }}>
                    <td style={{ padding: "1rem" }}>{user.id}</td>
                    <td style={{ padding: "1rem", fontWeight: "bold" }}>{user.name}</td>
                    <td style={{ padding: "1rem" }}>{user.email}</td>
                    <td style={{ padding: "1rem" }}>
                      <span
                        className={`badge ${user.role === "admin" ? "admin" : user.role === "lawyer" ? "lawyer" : "client"}`}
                        style={{ textTransform: "capitalize" }}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td style={{ padding: "1rem", color: "#666" }}>{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td style={{ padding: "1rem" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                        <button
                          onClick={() => openEdit(user)}
                          onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
                          onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                          style={{
                            padding: "0.4rem 0",
                            width: "90px",
                            fontSize: "0.78rem",
                            borderRadius: "20px",
                            border: "none",
                            background: "#852d0e",
                            color: "white",
                            cursor: "pointer",
                            fontWeight: "600",
                            letterSpacing: "0.03em",
                            boxShadow: "0 2px 8px rgba(99,102,241,0.35)",
                            transition: "opacity 0.15s",
                            textAlign: "center",
                          }}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => setDeleteTarget(user)}
                          onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
                          onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                          style={{
                            padding: "0.4rem 0",
                            width: "90px",
                            fontSize: "0.78rem",
                            borderRadius: "20px",
                            border: "none",
                            background: "white",
                            color: "#852d0e",
                            cursor: "pointer",
                            fontWeight: "600",
                            letterSpacing: "0.03em",
                            boxShadow: "0 2px 8px rgba(239,68,68,0.35)",
                            transition: "opacity 0.15s",
                            textAlign: "center",
                          }}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ padding: "2rem", textAlign: "center", color: "#666" }}>No users found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      
      {editUser && (
        <div
          onClick={closeEdit}
          style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ backgroundColor: "white", borderRadius: "12px", padding: "2rem", width: "100%", maxWidth: "440px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}
          >
            <h2 style={{ margin: "0 0 1.5rem 0", fontSize: "1.25rem" }}>Edit User</h2>

            {editError && (
              <p style={{ color: "#ef4444", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", padding: "0.6rem 0.9rem", marginBottom: "1rem", fontSize: "0.875rem" }}>
                {editError}
              </p>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <label style={labelStyle}>
                Name
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  style={inputStyle}
                />
              </label>
              <label style={labelStyle}>
                Email
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                  style={inputStyle}
                />
              </label>
              <label style={labelStyle}>
                Role
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
                  style={{ ...inputStyle, cursor: "pointer" }}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                  ))}
                </select>
              </label>
            </div>

            
            <div style={{ display: "flex", justifyContent: "center", gap: "0.75rem", marginTop: "1.75rem" }}>
              <button onClick={closeEdit} style={cancelBtnStyle}>Cancel</button>
              <button onClick={handleEditSave} disabled={editLoading} style={saveBtnStyle}>
                {editLoading ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      
      {deleteTarget && (
        <div
          onClick={() => setDeleteTarget(null)}
          style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ backgroundColor: "white", borderRadius: "12px", padding: "2rem", width: "100%", maxWidth: "400px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}
          >
            <h2 style={{ margin: "0 0 0.75rem 0", fontSize: "1.2rem" }}>Delete User</h2>
            <p style={{ color: "#374151", marginBottom: "1.5rem" }}>
              Are you sure you want to delete <strong>{deleteTarget.name}</strong>? This action cannot be undone.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button onClick={() => setDeleteTarget(null)} style={cancelBtnStyle}>Cancel</button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteLoading}
                style={{
                  ...saveBtnStyle,
                  background: "linear-gradient(135deg, #ef4444, #f97316)",
                  boxShadow: "0 2px 10px rgba(239,68,68,0.4)",
                }}
              >
                {deleteLoading ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

const labelStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "0.35rem",
  fontSize: "0.875rem",
  fontWeight: "500",
  color: "#374151",
};

const inputStyle = {
  padding: "0.55rem 0.75rem",
  borderRadius: "6px",
  border: "1px solid #d1d5db",
  fontSize: "0.95rem",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

const cancelBtnStyle = {
  padding: "0.55rem 1.3rem",
  borderRadius: "20px",
  border: "1.5px solid #d1d5db",
  backgroundColor: "#852d0e",
  backgroundImage: "none",
  color: "white",
  cursor: "pointer",
  fontWeight: "600",
  fontSize: "0.875rem",
  letterSpacing: "0.02em",
};

const saveBtnStyle = {
  padding: "0.55rem 1.3rem",
  borderRadius: "20px",
  border: "none",
  background: "white",
  color: "#852d0e",
  cursor: "pointer",
  fontWeight: "600",
  fontSize: "0.875rem",
  letterSpacing: "0.02em",
  boxShadow: "0 2px 8px rgba(239,68,68,0.35)",
};