import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Bell, ChevronDown, Check, Search,
  LayoutDashboard, Briefcase, Users, FileText, FileBarChart, Workflow,
  Database, Sparkles, Clock, Shield, BarChart3, UserCog, CreditCard,
  Settings, User
} from 'lucide-react';
import { useRole } from './RoleContext';
import { currentUser } from '../../data/mockData';

const pageConfig = {
  '/app/dashboard':        { title: 'Dashboard',        icon: LayoutDashboard },
  '/app/workspaces':       { title: 'Workspaces',       icon: Briefcase },
  '/app/clients':          { title: 'Clients',          icon: Users },
  '/app/vault':            { title: 'Document Vault',   icon: FileText },
  '/app/reports':          { title: 'Reports',          icon: FileBarChart },
  '/app/workflows':        { title: 'Workflows',        icon: Workflow },
  '/app/knowledge-packs':  { title: 'Knowledge Packs',  icon: Database },
  '/app/prompt-templates': { title: 'Prompt Templates', icon: Sparkles },
  '/app/reminders':        { title: 'Reminders',        icon: Clock },
  '/app/audit-logs':       { title: 'Audit Logs',       icon: Shield },
  '/app/usage':            { title: 'Usage & Costs',    icon: BarChart3 },
  '/app/users':            { title: 'User Management',  icon: UserCog },
  '/app/billing':          { title: 'Billing',          icon: CreditCard },
  '/app/settings':         { title: 'Org Settings',     icon: Settings },
  '/app/profile':          { title: 'My Profile',       icon: User },
  '/app/messages':         { title: 'Messages',         icon: Bell },
};

const roles = ['Admin', 'Manager', 'Team'];

export default function OrgTopBar() {
  const location = useLocation();
  const { role, setRole } = useRole();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const pathKey = Object.keys(pageConfig).find((key) => location.pathname.startsWith(key));
  const config = pageConfig[pathKey] || { title: 'Page', icon: LayoutDashboard };

  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div
      className="fixed top-0 right-0 flex items-center justify-between px-6 z-30"
      style={{ left: 240, height: 52, backgroundColor: '#FFFFFF', borderBottom: '1px solid #E8EEF4' }}
    >
      {/* Breadcrumb */}
      <div className="flex items-center gap-2" style={{ fontSize: '13px' }}>
        <span style={{ color: '#8899AB' }}>{currentUser.org}</span>
        <span style={{ color: '#E8EEF4' }}>›</span>
        <span style={{ color: '#0B1D3A', fontWeight: 500 }}>{config.title}</span>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: '#8899AB' }} />
          <input
            type="text"
            placeholder="Search..."
            className="pl-8 pr-3 rounded-lg"
            style={{ width: 160, height: 34, border: '1px solid #E8EEF4', backgroundColor: '#F4F6F9', fontSize: '13px', color: '#0B1D3A', outline: 'none' }}
          />
        </div>

        {/* Bell */}
        <button className="relative p-1.5 rounded-lg hover:bg-gray-50 transition-colors">
          <Bell size={18} style={{ color: '#3D5A80' }} />
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: '#C44F4F', fontSize: '9px', fontWeight: 600 }}>
            2
          </span>
        </button>

        {/* Role switcher */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors hover:bg-gray-50"
            style={{ fontSize: '12px', color: '#3D5A80', border: '1px solid #E8EEF4' }}
          >
            {role}
            <ChevronDown size={12} />
          </button>
          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-1 bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #E8EEF4', boxShadow: '0 8px 24px rgba(11,29,58,0.08)', minWidth: 140, zIndex: 50 }}>
              {roles.map((r) => (
                <button key={r} onClick={() => { setRole(r); setDropdownOpen(false); }} className="flex items-center justify-between w-full px-3 py-2.5 text-left hover:bg-gray-50 transition-colors" style={{ fontSize: '13px', color: '#0B1D3A', border: 'none', cursor: 'pointer', backgroundColor: 'transparent' }}>
                  {r}
                  {role === r && <Check size={14} style={{ color: '#C9A84C' }} />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Avatar */}
        <div className="rounded-full flex items-center justify-center text-white" style={{ width: 32, height: 32, backgroundColor: '#0B1D3A', fontSize: '11px', fontWeight: 600 }}>
          {currentUser.avatar}
        </div>
      </div>
    </div>
  );
}
