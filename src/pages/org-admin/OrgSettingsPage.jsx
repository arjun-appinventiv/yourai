import React, { useState } from 'react';
import { Settings, Save, Shield, Plug } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import Badge from '../../components/Badge';
import { useToast } from '../../components/Toast';
import { currentUser } from '../../data/mockData';
import PermissionGate from '../../components/org-admin/PermissionGate';

const inputStyle = {
  border: '1px solid var(--border)', borderRadius: '8px', height: 36,
  padding: '0 12px', fontSize: '13px', color: 'var(--text-primary)', width: '100%', outline: 'none',
};

const settingsTabs = [
  { key: 'general', label: 'General', icon: Settings },
  { key: 'security', label: 'Security', icon: Shield },
  { key: 'integrations', label: 'Integrations', icon: Plug },
];

const integrations = [
  { name: 'Google Drive', status: 'Connected', icon: 'GD', desc: 'Sync documents from Google Drive' },
  { name: 'Dropbox', status: 'Not Connected', icon: 'DB', desc: 'Import files from Dropbox' },
  { name: 'Slack', status: 'Connected', icon: 'SL', desc: 'Send notifications to Slack channels' },
  { name: 'Microsoft 365', status: 'Not Connected', icon: 'MS', desc: 'Integrate with Microsoft Office suite' },
];

export default function OrgSettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [orgName, setOrgName] = useState(currentUser.org);
  const showToast = useToast();

  const [security, setSecurity] = useState({
    twoFactor: true,
    sso: false,
    ipWhitelist: false,
    sessionTimeout: '8',
  });

  return (
    <PermissionGate allowedRoles={['Admin']}>
      <div>
        <PageHeader icon={Settings} title="Org Settings" subtitle="Configure organization-wide settings." />

        {/* Tabs */}
        <div className="flex items-center gap-0 mb-6" style={{ borderBottom: '1px solid var(--border)' }}>
          {settingsTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex items-center gap-1.5 px-4 py-3"
              style={{
                fontSize: '13px',
                fontWeight: activeTab === tab.key ? 500 : 400,
                color: activeTab === tab.key ? 'var(--navy)' : 'var(--text-muted)',
                borderBottom: `2px solid ${activeTab === tab.key ? 'var(--navy)' : 'transparent'}`,
                background: 'none',
                border: 'none',
                borderBottomWidth: 2,
                borderBottomStyle: 'solid',
                borderBottomColor: activeTab === tab.key ? 'var(--navy)' : 'transparent',
                cursor: 'pointer',
                marginBottom: -1,
              }}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'general' && (
          <div className="bg-white p-6 rounded-xl" style={{ border: '1px solid var(--border)', maxWidth: 600 }}>
            <h4 style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: 16 }}>Organization Details</h4>
            <div className="flex flex-col gap-4">
              <div>
                <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Organization Name</label>
                <input type="text" value={orgName} onChange={(e) => setOrgName(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Industry</label>
                <select style={{ ...inputStyle, cursor: 'pointer', backgroundColor: 'white' }}>
                  <option>Legal</option>
                  <option>Finance</option>
                  <option>Healthcare</option>
                  <option>Technology</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Default Timezone</label>
                <select style={{ ...inputStyle, cursor: 'pointer', backgroundColor: 'white' }}>
                  <option>America/New_York (EST)</option>
                  <option>America/Chicago (CST)</option>
                  <option>America/Denver (MST)</option>
                  <option>America/Los_Angeles (PST)</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Default Language</label>
                <select style={{ ...inputStyle, cursor: 'pointer', backgroundColor: 'white' }}>
                  <option>English</option>
                  <option>Spanish</option>
                  <option>French</option>
                </select>
              </div>
              <button
                onClick={() => showToast('Settings saved')}
                className="flex items-center gap-2 px-4 py-2 rounded-lg self-start"
                style={{ backgroundColor: 'var(--navy)', color: 'white', fontSize: '13px', fontWeight: 500, border: 'none', cursor: 'pointer' }}
              >
                <Save size={14} /> Save Changes
              </button>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="bg-white p-6 rounded-xl" style={{ border: '1px solid var(--border)', maxWidth: 600 }}>
            <h4 style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: 16 }}>Security Settings</h4>
            {[
              { key: 'twoFactor', label: 'Two-Factor Authentication', desc: 'Require 2FA for all team members' },
              { key: 'sso', label: 'Single Sign-On (SSO)', desc: 'Enable SSO via SAML or OAuth' },
              { key: 'ipWhitelist', label: 'IP Whitelist', desc: 'Restrict access to approved IP addresses' },
            ].map((setting) => (
              <div key={setting.key} className="flex items-center justify-between py-4" style={{ borderBottom: '1px solid var(--border)' }}>
                <div>
                  <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>{setting.label}</span>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>{setting.desc}</p>
                </div>
                <button
                  onClick={() => setSecurity({ ...security, [setting.key]: !security[setting.key] })}
                  className="relative"
                  style={{
                    width: 40, height: 22, borderRadius: 11,
                    backgroundColor: security[setting.key] ? 'var(--navy)' : 'var(--border)',
                    border: 'none', cursor: 'pointer',
                    transition: 'background-color 200ms',
                  }}
                >
                  <div
                    className="absolute rounded-full bg-white"
                    style={{
                      width: 16, height: 16, top: 3,
                      left: security[setting.key] ? 21 : 3,
                      transition: 'left 200ms',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    }}
                  />
                </button>
              </div>
            ))}
            <div className="mt-4">
              <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Session Timeout (hours)</label>
              <select
                value={security.sessionTimeout}
                onChange={(e) => setSecurity({ ...security, sessionTimeout: e.target.value })}
                style={{ ...inputStyle, width: 160, cursor: 'pointer', backgroundColor: 'white' }}
              >
                <option value="1">1 hour</option>
                <option value="4">4 hours</option>
                <option value="8">8 hours</option>
                <option value="24">24 hours</option>
              </select>
            </div>
            <button
              onClick={() => showToast('Security settings saved')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg mt-6"
              style={{ backgroundColor: 'var(--navy)', color: 'white', fontSize: '13px', fontWeight: 500, border: 'none', cursor: 'pointer' }}
            >
              <Save size={14} /> Save Changes
            </button>
          </div>
        )}

        {activeTab === 'integrations' && (
          <div className="grid grid-cols-2 gap-4" style={{ maxWidth: 700 }}>
            {integrations.map((int) => (
              <div key={int.name} className="bg-white p-5 rounded-xl" style={{ border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="rounded-lg flex items-center justify-center"
                      style={{ width: 36, height: 36, backgroundColor: 'var(--ice-warm)', fontSize: '12px', fontWeight: 600, color: 'var(--navy)' }}
                    >
                      {int.icon}
                    </div>
                    <div>
                      <h4 style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>{int.name}</h4>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>{int.desc}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3" style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                  <Badge variant={int.status === 'Connected' ? 'Active' : 'Archived'}>
                    {int.status}
                  </Badge>
                  <button
                    onClick={() => showToast(int.status === 'Connected' ? `${int.name} disconnected` : `${int.name} connected`)}
                    className="px-3 py-1.5 rounded-lg"
                    style={{
                      fontSize: '12px',
                      fontWeight: 500,
                      border: '1px solid var(--border)',
                      backgroundColor: int.status === 'Connected' ? 'white' : 'var(--navy)',
                      color: int.status === 'Connected' ? 'var(--text-secondary)' : 'white',
                      cursor: 'pointer',
                    }}
                  >
                    {int.status === 'Connected' ? 'Disconnect' : 'Connect'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PermissionGate>
  );
}
