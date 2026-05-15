"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createLawyerAccount } from "../lib/api";

export default function AdminLawyerCreateClient() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    firm: "",
    specialty: "",
    city: "",
    phone: "",
    bio: ""
  });
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setStatus("Creating account...");

    try {
      await createLawyerAccount(formData);
      setStatus("Lawyer account created successfully!");
      setFormData({ name: "", email: "", password: "", firm: "", specialty: "", city: "", phone: "", bio: "" });
    } catch (err) {
      setError(err.message || "Failed to create lawyer account.");
      setStatus("");
    }
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  return (
    <main className="login-home-page">
      <section className="login-home-action-section">
        <div style={{ maxWidth: "600px", margin: "0 auto 2rem auto" }}>
          <h1 style={{ margin: 0 }}>Create Lawyer Account</h1>
          <p style={{ margin: "0.75rem 0 0 0", color: "#6b7280" }}>Add a new legal professional to the platform.</p>
        </div>
        <form className="referral-form new-case-form" onSubmit={handleSubmit} style={{ maxWidth: "600px", margin: "0 auto" }}>
          {error && <p className="feedback error">{error}</p>}
          {status && <p className="feedback">{status}</p>}

          <div className="new-case-textarea-shell" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '2rem' }}>
            <input name="name" value={formData.name} onChange={handleChange} placeholder="Full Name" required />
            <input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="Email" required />
            <input name="password" type="password" value={formData.password} onChange={handleChange} placeholder="Temporary Password" required />
            <input name="firm" value={formData.firm} onChange={handleChange} placeholder="Firm Name" required />
            <input name="specialty" value={formData.specialty} onChange={handleChange} placeholder="Specialty" required />
            <input name="city" value={formData.city} onChange={handleChange} placeholder="City" required />
            <input name="phone" value={formData.phone} onChange={handleChange} placeholder="Phone Number" required />
            <textarea name="bio" value={formData.bio} onChange={handleChange} placeholder="Professional Bio" required style={{ minHeight: '100px' }} />
            
            <div className="new-case-form-footer" style={{ justifyContent: 'flex-end', borderTop: 'none', padding: 0 }}>
              <button type="submit">Create Account</button>
            </div>
          </div>
        </form>
      </section>
    </main>
  );
}
