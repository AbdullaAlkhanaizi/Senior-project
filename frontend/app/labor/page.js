"use client";

import PortalShell from "../../components/portal-shell";

export default function LaborCalculator() {
  return (
    <PortalShell 
      title="Labor Cost Calculator" 
      description="Estimate and manage labor expenses for your legal projects."
    >
      <div className="dash-container">
        <div className="panel shadow-lg" style={{ background: 'white', padding: '40px' }}>
          <h2>Project Calculator</h2>
          <p style={{ color: '#6a635a', marginBottom: '32px' }}>This tool helps you estimate the total labor cost based on hourly rates and project duration.</p>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '40px' }}>
            <div className="form-group">
              <label style={{ color: '#2a2826' }}>Hourly Rate (BHD)</label>
              <input type="number" defaultValue="20" style={{ border: '1px solid #e2e8f0' }} />
            </div>
            <div className="form-group">
              <label style={{ color: '#2a2826' }}>Estimated Hours</label>
              <input type="number" defaultValue="40" style={{ border: '1px solid #e2e8f0' }} />
            </div>
            <div className="form-group">
              <label style={{ color: '#2a2826' }}>Number of Employees</label>
              <input type="number" defaultValue="5" style={{ border: '1px solid #e2e8f0' }} />
            </div>
          </div>
          
          <div style={{ borderTop: '1px solid #f2eee8', paddingTop: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.9rem', color: '#8c857d', display: 'block' }}>ESTIMATED TOTAL MO.</span>
              <strong style={{ fontSize: '2rem', color: '#c26942' }}>BHD 21,733</strong>
            </div>
            <button className="btn-primary">Calculate Detailed Report</button>
          </div>
        </div>
      </div>
    </PortalShell>
  );
}
