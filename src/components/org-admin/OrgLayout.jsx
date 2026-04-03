import React from 'react';
import { Outlet } from 'react-router-dom';
import OrgSidebar from './OrgSidebar';
import OrgTopBar from './OrgTopBar';
import { useRole } from './RoleContext';

export default function OrgLayout() {
  const { role, setRole } = useRole();

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F4F6F9' }}>
      <OrgSidebar />
      <OrgTopBar />

      <main className="pb-12" style={{ marginLeft: 240, paddingTop: 52 }}>
        <div style={{ padding: '28px 32px' }}>
          <Outlet />
        </div>
      </main>

      {/* Demo banner — uses brand navy + gold */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between"
        style={{
          height: 36,
          backgroundColor: '#0B1D3A',
          color: 'rgba(255,255,255,0.7)',
          padding: '0 24px',
          fontSize: '12px',
        }}
      >
        <span>YourAI Org Admin — Prototype v1.0 — For stakeholder review only</span>
        <div className="flex items-center gap-2">
          <span style={{ marginRight: 8, color: 'rgba(255,255,255,0.4)' }}>Switch role:</span>
          {['Admin', 'Manager', 'Team'].map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              style={{
                fontSize: '11px',
                fontWeight: role === r ? 600 : 400,
                padding: '2px 10px',
                borderRadius: '10px',
                border: role === r ? '1px solid #C9A84C' : '1px solid rgba(255,255,255,0.2)',
                backgroundColor: role === r ? 'rgba(201,168,76,0.15)' : 'transparent',
                color: role === r ? '#C9A84C' : 'rgba(255,255,255,0.5)',
                cursor: 'pointer',
                transition: 'all 150ms',
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
