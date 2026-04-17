import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  // While checking session, show nothing (avoids flash of login page)
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="animate-spin" style={{ width: 24, height: 24, border: '3px solid #F0F3F6', borderTopColor: 'var(--navy)', borderRadius: '50%' }} />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/super-admin/login" replace />;
  return children;
}
