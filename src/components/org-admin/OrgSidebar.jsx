import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Briefcase, Users, FileText, FileBarChart, Workflow,
  Database, Sparkles, Clock, Shield, BarChart3, UserCog, CreditCard,
  Settings, User
} from 'lucide-react';
import { useRole } from './RoleContext';
import { currentUser } from '../../data/mockData';

const allNavSections = [
  {
    label: 'MAIN',
    items: [
      { label: 'Dashboard',      icon: LayoutDashboard, path: '/app/dashboard',   roles: ['Admin','Manager','Team'] },
      { label: 'Workspaces',     icon: Briefcase,       path: '/app/workspaces',  roles: ['Admin','Manager','Team'] },
      { label: 'Clients',        icon: Users,           path: '/app/clients',     roles: ['Admin','Manager'] },
    ],
  },
  {
    label: 'LIBRARY',
    items: [
      { label: 'Document Vault',   icon: FileText,     path: '/app/vault',             roles: ['Admin','Manager','Team'] },
      { label: 'Workflows',        icon: Workflow,      path: '/app/workflows',         roles: ['Admin','Manager','Team'] },
      { label: 'Knowledge Packs',  icon: Database,      path: '/app/knowledge-packs',  roles: ['Admin'] },
      { label: 'Prompt Templates', icon: Sparkles,      path: '/app/prompt-templates', roles: ['Admin','Manager','Team'] },
    ],
  },
  {
    label: 'SYSTEM',
    items: [
      { label: 'Reminders',     icon: Clock,     path: '/app/reminders',  roles: ['Admin','Manager','Team'] },
      { label: 'Audit Logs',    icon: Shield,    path: '/app/audit-logs', roles: ['Admin','Manager'], limited: ['Manager'] },
      { label: 'Usage & Costs', icon: BarChart3,  path: '/app/usage',      roles: ['Admin','Manager'], limited: ['Manager'] },
    ],
  },
  {
    label: 'ADMIN',
    items: [
      { label: 'User Management', icon: UserCog,    path: '/app/users',    roles: ['Admin'] },
      { label: 'Billing',         icon: CreditCard, path: '/app/billing',  roles: ['Admin'] },
      { label: 'Org Settings',    icon: Settings,   path: '/app/settings', roles: ['Admin'] },
    ],
  },
];

const roleBadgeColors = {
  Admin:   { bg: '#0B1D3A', color: 'white' },
  Manager: { bg: '#FEF9C3', color: '#92400E' },
  Team:    { bg: '#F0FDF4', color: '#166534' },
};

export default function OrgSidebar() {
  const { role } = useRole();

  const visibleSections = allNavSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => item.roles.includes(role)),
    }))
    .filter((section) => section.items.length > 0);

  const badgeStyle = roleBadgeColors[role] || roleBadgeColors.Team;

  return (
    <div
      className="fixed left-0 top-0 bottom-0 flex flex-col z-40"
      style={{
        width: 240,
        backgroundColor: '#FFFFFF',
        borderRight: '1px solid #E8EEF4',
      }}
    >
      {/* Logo — prominent company name */}
      <div style={{ padding: '18px 18px 14px', borderBottom: '1px solid #E8EEF4' }}>
        <div className="flex items-center gap-3">
          {/* Logo mark — navy square with gold "Y" */}
          <div className="flex-shrink-0 rounded-lg flex items-center justify-center" style={{ width: 36, height: 36, backgroundColor: '#0B1D3A' }}>
            <span style={{ fontFamily: "'DM Serif Display', serif", color: '#C9A84C', fontSize: '18px', fontWeight: 700 }}>Y</span>
          </div>
          <div>
            <div style={{ fontSize: '17px', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              <span style={{ fontFamily: "'DM Serif Display', serif", color: '#0B1D3A', fontWeight: 700 }}>Your</span>
              <span style={{ fontFamily: "'DM Serif Display', serif", color: '#C9A84C', fontWeight: 700 }}>AI</span>
            </div>
            <div style={{ color: '#8899AB', fontSize: '10px', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', marginTop: 1 }}>
              {currentUser.org}
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 pt-2 px-2.5 overflow-y-auto">
        {visibleSections.map((section) => (
          <div key={section.label}>
            <div
              style={{
                fontSize: '10px',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#8899AB',
                padding: '16px 14px 6px',
                fontWeight: 600,
              }}
            >
              {section.label}
            </div>
            {section.items.map(({ label, icon: Icon, path, limited }) => (
              <NavLink
                key={label}
                to={path}
                className="flex items-center gap-2.5"
                style={({ isActive }) => ({
                  padding: '8px 14px',
                  borderRadius: '8px',
                  backgroundColor: isActive ? 'rgba(201,168,76,0.08)' : 'transparent',
                  borderLeft: isActive ? '3px solid #C9A84C' : '3px solid transparent',
                  color: isActive ? '#0B1D3A' : '#3D5A80',
                  fontSize: '13px',
                  fontWeight: isActive ? 600 : 400,
                  lineHeight: '1.5',
                  display: 'flex',
                  marginBottom: '1px',
                  transition: 'all 150ms',
                })}
                onMouseEnter={(e) => {
                  const isActive = e.currentTarget.getAttribute('aria-current') === 'page';
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = '#F4F6F9';
                    e.currentTarget.style.color = '#0B1D3A';
                  }
                }}
                onMouseLeave={(e) => {
                  const isActive = e.currentTarget.getAttribute('aria-current') === 'page';
                  e.currentTarget.style.backgroundColor = isActive ? 'rgba(201,168,76,0.08)' : 'transparent';
                  e.currentTarget.style.color = isActive ? '#0B1D3A' : '#3D5A80';
                }}
              >
                <Icon size={16} />
                <span className="flex-1">{label}</span>
                {limited && limited.includes(role) && (
                  <span style={{ fontSize: '9px', backgroundColor: '#E8EEF4', color: '#8899AB', padding: '1px 6px', borderRadius: '8px', fontWeight: 500 }}>
                    Limited
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Bottom: Profile */}
      <NavLink
        to="/app/profile"
        style={({ isActive }) => ({
          borderTop: '1px solid #E8EEF4',
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          textDecoration: 'none',
          backgroundColor: isActive ? '#F4F6F9' : 'transparent',
          transition: 'background-color 150ms',
        })}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F4F6F9'; }}
        onMouseLeave={(e) => {
          const isActive = e.currentTarget.getAttribute('aria-current') === 'page';
          e.currentTarget.style.backgroundColor = isActive ? '#F4F6F9' : 'transparent';
        }}
      >
        <div
          className="rounded-full flex items-center justify-center text-white"
          style={{ width: 32, height: 32, backgroundColor: '#0B1D3A', fontSize: '11px', fontWeight: 600 }}
        >
          {currentUser.avatar}
        </div>
        <div className="flex-1">
          <div style={{ fontSize: '13px', fontWeight: 500, color: '#0B1D3A' }}>
            {currentUser.name}
          </div>
          <span
            style={{
              fontSize: '9px',
              fontWeight: 600,
              letterSpacing: '0.04em',
              padding: '1px 8px',
              borderRadius: '8px',
              backgroundColor: badgeStyle.bg,
              color: badgeStyle.color,
            }}
          >
            {role}
          </span>
        </div>
      </NavLink>
    </div>
  );
}
