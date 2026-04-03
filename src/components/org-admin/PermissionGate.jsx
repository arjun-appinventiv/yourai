import React from 'react';
import { Lock, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRole } from './RoleContext';

const roleHierarchy = { Admin: 3, Manager: 2, Team: 1 };

export default function PermissionGate({ allowedRoles, children }) {
  const { role } = useRole();
  const navigate = useNavigate();

  if (allowedRoles.includes(role)) {
    return children;
  }

  return (
    <div className="flex flex-col items-center justify-center" style={{ minHeight: '60vh' }}>
      <div
        className="flex items-center justify-center rounded-full mb-6"
        style={{ width: 64, height: 64, backgroundColor: 'var(--ice-warm)', border: '1px solid var(--border)' }}
      >
        <Lock size={28} style={{ color: 'var(--text-muted)' }} />
      </div>
      <h2
        style={{
          fontFamily: "'DM Serif Display', serif",
          fontSize: '22px',
          color: 'var(--text-primary)',
          marginBottom: 8,
        }}
      >
        Access Restricted
      </h2>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: 24, textAlign: 'center', maxWidth: 360 }}>
        You don't have permission to view this page. This section requires{' '}
        {allowedRoles.join(' or ')} access.
      </p>
      <button
        onClick={() => navigate('/app/dashboard')}
        className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
        style={{
          backgroundColor: 'var(--navy)',
          color: 'white',
          fontSize: '13px',
          fontWeight: 500,
          border: 'none',
          cursor: 'pointer',
        }}
      >
        <ArrowLeft size={14} />
        Back to Dashboard
      </button>
    </div>
  );
}
