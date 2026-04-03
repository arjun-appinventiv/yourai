import React, { useState } from 'react';
import { User, Save } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import Badge from '../../components/Badge';
import { useToast } from '../../components/Toast';
import { currentUser } from '../../data/mockData';
import { useRole } from '../../components/org-admin/RoleContext';

const inputStyle = {
  border: '1px solid var(--border)', borderRadius: '8px', height: 36,
  padding: '0 12px', fontSize: '13px', color: 'var(--text-primary)', width: '100%', outline: 'none',
};

export default function ProfilePage() {
  const { role } = useRole();
  const showToast = useToast();
  const [name, setName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email);

  const [notifications, setNotifications] = useState({
    email: true,
    workflow: true,
    classification: false,
    reports: true,
  });

  return (
    <div>
      <PageHeader icon={User} title="My Profile" subtitle="Manage your personal settings and preferences." />

      <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 1fr', maxWidth: 900 }}>
        {/* Profile card */}
        <div className="bg-white p-6 rounded-xl" style={{ border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center gap-4 mb-6">
            <div
              className="rounded-full flex items-center justify-center text-white"
              style={{ width: 56, height: 56, backgroundColor: 'var(--navy)', fontSize: '18px', fontWeight: 600 }}
            >
              {currentUser.avatar}
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text-primary)' }}>{currentUser.name}</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{currentUser.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={role === 'Admin' ? 'Enterprise' : role === 'Manager' ? 'Professional' : 'Team'}>
                  {role}
                </Badge>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{currentUser.org}</span>
              </div>
            </div>
          </div>

          <div style={{ height: 1, backgroundColor: 'var(--border)', marginBottom: 20 }} />

          <div className="flex flex-col gap-4">
            <div>
              <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Full Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Organization</label>
              <input type="text" value={currentUser.org} disabled style={{ ...inputStyle, backgroundColor: 'var(--ice-warm)', color: 'var(--text-muted)' }} />
            </div>
            <button
              onClick={() => showToast('Profile updated')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg self-start"
              style={{ backgroundColor: 'var(--navy)', color: 'white', fontSize: '13px', fontWeight: 500, border: 'none', cursor: 'pointer' }}
            >
              <Save size={14} /> Save Changes
            </button>
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-6">
          {/* Password */}
          <div className="bg-white p-6 rounded-xl" style={{ border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: 16 }}>Change Password</h4>
            <div className="flex flex-col gap-4">
              <div>
                <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Current Password</label>
                <input type="password" placeholder="Enter current password" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>New Password</label>
                <input type="password" placeholder="Enter new password" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Confirm New Password</label>
                <input type="password" placeholder="Confirm new password" style={inputStyle} />
              </div>
              <button
                onClick={() => showToast('Password updated')}
                className="px-4 py-2 rounded-lg self-start"
                style={{ fontSize: '13px', border: '1px solid var(--border)', backgroundColor: 'white', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                Update Password
              </button>
            </div>
          </div>

          {/* Notification Preferences */}
          <div className="bg-white p-6 rounded-xl" style={{ border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: 16 }}>Notification Preferences</h4>
            {[
              { key: 'email', label: 'Email notifications', desc: 'Receive notifications via email' },
              { key: 'workflow', label: 'Workflow completions', desc: 'Alert when workflows finish running' },
              { key: 'classification', label: 'Classification alerts', desc: 'Flagged documents needing review' },
              { key: 'reports', label: 'Report generation', desc: 'Notify when reports are ready' },
            ].map((pref) => (
              <div key={pref.key} className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                <div>
                  <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>{pref.label}</span>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>{pref.desc}</p>
                </div>
                <button
                  onClick={() => setNotifications({ ...notifications, [pref.key]: !notifications[pref.key] })}
                  className="relative"
                  style={{
                    width: 40, height: 22, borderRadius: 11,
                    backgroundColor: notifications[pref.key] ? 'var(--navy)' : 'var(--border)',
                    border: 'none', cursor: 'pointer',
                    transition: 'background-color 200ms',
                  }}
                >
                  <div
                    className="absolute rounded-full bg-white"
                    style={{
                      width: 16, height: 16, top: 3,
                      left: notifications[pref.key] ? 21 : 3,
                      transition: 'left 200ms',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    }}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
