import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { operator } = useAuth();
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--ice-warm)' }}>
      <Sidebar />
      <TopBar />

      <main className="pb-12" style={{ marginLeft: 240, paddingTop: 52 }}>
        <div style={{ padding: '28px 32px' }}>
          <Outlet />
        </div>
      </main>

      {/* Demo banner */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between"
        style={{
          height: 36,
          backgroundColor: 'var(--navy)',
          color: 'rgba(255,255,255,0.7)',
          padding: '0 24px',
          fontSize: '12px',
        }}
      >
        <span>YourAI Super Admin — Prototype v1.0 — Internal use only</span>
        <span>Logged in as {operator?.name || 'Appinventiv Ops'}</span>
      </div>
    </div>
  );
}
