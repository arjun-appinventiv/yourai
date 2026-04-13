import React from 'react';
import { useLocation } from 'react-router-dom';
import { LayoutDashboard, Search, Bell, Building2, Users, CreditCard, BarChart3, Shield, BookOpen, FileText, Plug, Database, Workflow, FileBarChart, Settings, BookMarked } from 'lucide-react';

const pageConfig = {
  '/super-admin/dashboard': { title: 'Dashboard', icon: LayoutDashboard },
  '/super-admin/tenants': { title: 'Tenant Management', icon: Building2 },
  '/super-admin/users': { title: 'Platform Users', icon: Users },
  '/super-admin/billing': { title: 'Billing & Subscriptions', icon: CreditCard },
  '/super-admin/usage': { title: 'Usage & Analytics', icon: BarChart3 },
  '/super-admin/compliance': { title: 'Compliance & Audit', icon: Shield },
  '/super-admin/static-content': { title: 'Static Content', icon: BookOpen },
  '/super-admin/integrations': { title: 'Integrations', icon: Plug },
  '/super-admin/knowledge-base': { title: 'Knowledge Base', icon: Database },
  '/super-admin/workflows': { title: 'Workflow Templates', icon: Workflow },
  '/super-admin/notifications': { title: 'Notifications', icon: Bell },
  '/super-admin/settings': { title: 'Platform Settings', icon: Settings },
  '/super-admin/user-stories': { title: 'User Stories', icon: BookMarked },
};

export default function TopBar() {
  const location = useLocation();
  const config = pageConfig[location.pathname] || { title: 'Super Admin', icon: Building2 };
  const PageIcon = config.icon;

  return (
    <div
      className="fixed top-0 right-0 flex items-center justify-between px-6 bg-white z-30"
      style={{ left: 240, height: 52, borderBottom: '1px solid var(--border)' }}
    >
      {/* Breadcrumb */}
      <div className="flex items-center gap-2" style={{ fontSize: '13px' }}>
        <PageIcon size={15} style={{ color: 'var(--text-muted)' }} />
        <span style={{ color: 'var(--text-muted)' }}>Super Admin</span>
        <span style={{ color: 'var(--text-muted)' }}>›</span>
        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{config.title}</span>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search..."
            className="pl-8 pr-3 rounded-lg"
            style={{
              width: 140,
              height: 32,
              border: '1px solid var(--border)',
              backgroundColor: 'var(--ice-warm)',
              fontSize: '13px',
              color: 'var(--text-primary)',
              outline: 'none',
            }}
          />
        </div>

        <button className="relative p-1.5 rounded-md hover:bg-gray-50 transition-colors">
          <Bell size={17} style={{ color: 'var(--text-muted)' }} />
          <span
            className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-white"
            style={{ backgroundColor: '#DC2626', fontSize: '9px', fontWeight: 600 }}
          >
            3
          </span>
        </button>

        <div
          className="rounded-full flex items-center justify-center text-white"
          style={{ width: 30, height: 30, backgroundColor: 'var(--navy)', fontSize: '11px', fontWeight: 600 }}
        >
          AO
        </div>
      </div>
    </div>
  );
}
