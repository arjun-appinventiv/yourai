import React, { useState } from 'react';
import { Settings, Shield, Key, Globe, Bell, Database, Save } from 'lucide-react';
import { useToast } from '../../components/Toast';
import PageHeader from '../../components/PageHeader';

const Toggle = ({ enabled, onChange }) => (
  <button
    onClick={onChange}
    className="relative w-11 h-6 rounded-full transition-colors"
    style={{ backgroundColor: enabled ? 'var(--navy)' : 'var(--ice)' }}
  >
    <div
      className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform"
      style={{ left: enabled ? '22px' : '2px', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}
    />
  </button>
);

export default function PlatformSettings() {
  const showToast = useToast();

  const [settings, setSettings] = useState({
    maintenanceMode: false,
    signupsEnabled: true,
    aiEnabled: true,
    maxFileSize: '100',
    sessionTimeout: '480',
    defaultPlan: 'Free',
    supportEmail: 'support@yourai.com',
    fromEmail: 'noreply@yourai.com',
    smtpHost: 'smtp.yourai.com',
    enforceSSO: false,
    twoFactor: true,
    ipWhitelist: false,
    auditRetention: '365',
    emailNotifs: true,
    slackNotifs: false,
    webhookUrl: '',
  });

  const update = (key, val) => setSettings((s) => ({ ...s, [key]: val }));

  const handleSave = () => showToast('Platform settings saved successfully');

  const inputStyle = {
    border: '1px solid var(--border)',
    borderRadius: '8px',
    height: 36,
    padding: '0 12px',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '13px',
    color: 'var(--text-primary)',
    outline: 'none',
  };

  const SectionTitle = ({ icon: Icon, title }) => (
    <div className="flex items-center gap-2 mb-4 pb-2" style={{ borderBottom: '1px solid var(--border)' }}>
      <Icon size={18} style={{ color: 'var(--text-primary)' }} />
      <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
    </div>
  );

  const SettingRow = ({ label, description, children }) => (
    <div className="flex items-start justify-between py-3">
      <div className="flex-1 mr-4">
        <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</div>
        {description && <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{description}</div>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader icon={Settings} title="Platform Settings" subtitle="Configure global platform settings, security, and integrations" />

      {/* General */}
      <div className="bg-white rounded-xl p-6" style={{ border: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <SectionTitle icon={Settings} title="General Settings" />
        <SettingRow label="Maintenance Mode" description="Disables access for all non-operator users">
          <Toggle enabled={settings.maintenanceMode} onChange={() => update('maintenanceMode', !settings.maintenanceMode)} />
        </SettingRow>
        <SettingRow label="New Sign-ups" description="Allow new organisations to register">
          <Toggle enabled={settings.signupsEnabled} onChange={() => update('signupsEnabled', !settings.signupsEnabled)} />
        </SettingRow>
        <SettingRow label="AI Features" description="Enable AI-powered features across the platform">
          <Toggle enabled={settings.aiEnabled} onChange={() => update('aiEnabled', !settings.aiEnabled)} />
        </SettingRow>
        <SettingRow label="Default Plan" description="Plan assigned to new organisations">
          <select value={settings.defaultPlan} onChange={(e) => update('defaultPlan', e.target.value)} style={{ ...inputStyle, width: 160 }}>
            <option>Free</option>
            <option>Professional</option>
            <option>Team</option>
            <option>Enterprise</option>
          </select>
        </SettingRow>
      </div>

      {/* Limits */}
      <div className="bg-white rounded-xl p-6" style={{ border: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <SectionTitle icon={Database} title="Platform Limits" />
        <SettingRow label="Max File Upload Size" description="Maximum file size in MB">
          <div className="flex items-center gap-2">
            <input type="number" value={settings.maxFileSize} onChange={(e) => update('maxFileSize', e.target.value)} style={{ ...inputStyle, width: 100, textAlign: 'right' }} />
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>MB</span>
          </div>
        </SettingRow>
        <SettingRow label="Session Timeout" description="Auto-logout after inactivity (minutes)">
          <div className="flex items-center gap-2">
            <input type="number" value={settings.sessionTimeout} onChange={(e) => update('sessionTimeout', e.target.value)} style={{ ...inputStyle, width: 100, textAlign: 'right' }} />
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>min</span>
          </div>
        </SettingRow>
        <SettingRow label="Audit Log Retention" description="Days to retain audit log entries">
          <div className="flex items-center gap-2">
            <input type="number" value={settings.auditRetention} onChange={(e) => update('auditRetention', e.target.value)} style={{ ...inputStyle, width: 100, textAlign: 'right' }} />
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>days</span>
          </div>
        </SettingRow>
      </div>

      {/* Security */}
      <div className="bg-white rounded-xl p-6" style={{ border: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <SectionTitle icon={Shield} title="Security" />
        <SettingRow label="Enforce SSO" description="Require single sign-on for all organisations">
          <Toggle enabled={settings.enforceSSO} onChange={() => update('enforceSSO', !settings.enforceSSO)} />
        </SettingRow>
        <SettingRow label="Two-Factor Authentication" description="Require 2FA for admin accounts">
          <Toggle enabled={settings.twoFactor} onChange={() => update('twoFactor', !settings.twoFactor)} />
        </SettingRow>
        <SettingRow label="IP Whitelist" description="Restrict platform access to approved IPs">
          <Toggle enabled={settings.ipWhitelist} onChange={() => update('ipWhitelist', !settings.ipWhitelist)} />
        </SettingRow>
      </div>

      {/* Email */}
      <div className="bg-white rounded-xl p-6" style={{ border: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <SectionTitle icon={Globe} title="Email Configuration" />
        <SettingRow label="Support Email">
          <input type="email" value={settings.supportEmail} onChange={(e) => update('supportEmail', e.target.value)} style={{ ...inputStyle, width: 260 }} />
        </SettingRow>
        <SettingRow label="From Email">
          <input type="email" value={settings.fromEmail} onChange={(e) => update('fromEmail', e.target.value)} style={{ ...inputStyle, width: 260 }} />
        </SettingRow>
        <SettingRow label="SMTP Host">
          <input type="text" value={settings.smtpHost} onChange={(e) => update('smtpHost', e.target.value)} style={{ ...inputStyle, width: 260 }} />
        </SettingRow>
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-xl p-6" style={{ border: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <SectionTitle icon={Bell} title="Operator Notifications" />
        <SettingRow label="Email Notifications" description="Send alerts to operator emails">
          <Toggle enabled={settings.emailNotifs} onChange={() => update('emailNotifs', !settings.emailNotifs)} />
        </SettingRow>
        <SettingRow label="Slack Notifications" description="Post alerts to Slack channel">
          <Toggle enabled={settings.slackNotifs} onChange={() => update('slackNotifs', !settings.slackNotifs)} />
        </SettingRow>
        <SettingRow label="Webhook URL" description="Custom webhook for platform events">
          <input type="url" value={settings.webhookUrl} onChange={(e) => update('webhookUrl', e.target.value)} placeholder="https://..." style={{ ...inputStyle, width: 260 }} />
        </SettingRow>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="px-6 py-2.5 rounded-lg text-sm font-medium text-white flex items-center gap-2"
          style={{ backgroundColor: 'var(--navy)' }}
        >
          <Save size={16} />
          Save Settings
        </button>
      </div>
    </div>
  );
}
