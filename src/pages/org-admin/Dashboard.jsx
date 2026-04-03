import React from 'react';
import { LayoutDashboard, Briefcase, FileText, Users, Workflow, AlertCircle, Upload, CheckCircle, FileBarChart, UserPlus, Share, ExternalLink, LogIn, Plus, ArrowRight } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import Badge from '../../components/Badge';
import { currentUser, workspaces, documents, orgReports, activityFeed, billingData, workflowRuns } from '../../data/mockData';

const iconMap = {
  LogIn, Upload, CheckCircle, FileText: FileBarChart, AlertCircle, UserPlus, Workflow, Share, ExternalLink,
};

export default function Dashboard() {
  const activeWorkspaces = workspaces.filter((w) => w.status === 'Active').length;
  const totalDocs = documents.length;
  const pendingClassification = documents.filter((d) => d.classification === 'Pending' || d.classification === 'Flagged for Review').length;
  const runningWorkflows = workflowRuns.filter((w) => w.status === 'Running').length;

  return (
    <div>
      {/* Greeting */}
      <div className="mb-6">
        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '22px', color: 'var(--text-primary)', fontWeight: 400 }}>
          Good morning, {currentUser.name.split(' ')[0]}
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: 4 }}>
          Here's what's happening at {currentUser.org} today.
        </p>
        <div style={{ height: 1, backgroundColor: 'var(--border)', margin: '16px 0 24px' }} />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard icon={Briefcase} value={activeWorkspaces} label="Active Workspaces" accentColor="var(--navy)" />
        <StatCard icon={FileText} value={totalDocs} label="Total Documents" accentColor="var(--gold)" />
        <StatCard icon={FileBarChart} value={orgReports.length} label="Reports Generated" accentColor="#166534" />
        <StatCard icon={Workflow} value={runningWorkflows} label="Workflows Running" accentColor="#1D4ED8" />
      </div>

      {/* Two column layout */}
      <div className="grid gap-6" style={{ gridTemplateColumns: '1.5fr 1fr' }}>
        {/* Activity Feed */}
        <div
          className="bg-white"
          style={{ border: '1px solid var(--border)', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
        >
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '16px', color: 'var(--text-primary)' }}>
              Activity Feed
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Today & Yesterday</span>
          </div>
          <div style={{ maxHeight: 420, overflowY: 'auto' }}>
            {activityFeed.map((item) => {
              const IconComp = iconMap[item.icon] || CheckCircle;
              return (
                <div
                  key={item.id}
                  className="flex items-start gap-3 px-5 py-3"
                  style={{ borderBottom: '1px solid var(--border)' }}
                >
                  <div
                    className="flex items-center justify-center rounded-full flex-shrink-0 mt-0.5"
                    style={{
                      width: 28, height: 28,
                      backgroundColor: item.user === 'System' ? '#EFF6FF' : 'var(--ice-warm)',
                    }}
                  >
                    <IconComp size={13} style={{ color: item.user === 'System' ? '#1D4ED8' : 'var(--text-muted)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                      <span style={{ fontWeight: 500 }}>{item.user}</span>{' '}
                      <span style={{ color: 'var(--text-secondary)' }}>{item.action}</span>
                    </p>
                    {item.workspace && (
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>{item.workspace}</p>
                    )}
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {item.time}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right column: Usage + Classification alert */}
        <div className="flex flex-col gap-6">
          {/* Classification Alert */}
          {pendingClassification > 0 && (
            <div
              className="bg-white p-5"
              style={{
                border: '1px solid var(--border)',
                borderRadius: 12,
                borderLeft: '3px solid #DC2626',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle size={16} style={{ color: '#DC2626' }} />
                <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Classification Queue
                </h4>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: 12 }}>
                {pendingClassification} document{pendingClassification > 1 ? 's' : ''} need review
              </p>
              <button
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
                style={{
                  fontSize: '12px',
                  fontWeight: 500,
                  backgroundColor: 'var(--navy)',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Review Now <ArrowRight size={12} />
              </button>
            </div>
          )}

          {/* Usage bars */}
          <div
            className="bg-white p-5"
            style={{ border: '1px solid var(--border)', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
          >
            <h4 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '16px', color: 'var(--text-primary)', marginBottom: 16 }}>
              Plan Usage
            </h4>
            {Object.entries(billingData.usage).map(([key, val]) => {
              const pct = Math.round((val.used / val.limit) * 100);
              const labels = { docs: 'Documents', workflows: 'Workflows', reports: 'Reports', knowledgePacks: 'Knowledge Packs' };
              return (
                <div key={key} className="mb-4">
                  <div className="flex items-center justify-between mb-1">
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{labels[key]}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {val.used} / {val.limit.toLocaleString()}
                    </span>
                  </div>
                  <div style={{ height: 6, backgroundColor: 'var(--ice)', borderRadius: 3, overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${pct}%`,
                        backgroundColor: pct > 80 ? '#DC2626' : pct > 50 ? 'var(--gold)' : 'var(--navy)',
                        borderRadius: 3,
                        transition: 'width 300ms',
                      }}
                    />
                  </div>
                </div>
              );
            })}
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 8 }}>
              {billingData.plan} plan — Renews {billingData.nextRenewal}
            </p>
          </div>
        </div>
      </div>

      {/* Quick action cards */}
      <div className="grid grid-cols-3 gap-4 mt-8">
        {[
          { icon: Plus, label: 'New Workspace', desc: 'Create a new workspace for a client or project' },
          { icon: Upload, label: 'Upload Documents', desc: 'Upload files to an existing workspace' },
          { icon: Workflow, label: 'Run Workflow', desc: 'Execute a workflow template on workspace docs' },
        ].map((action) => (
          <button
            key={action.label}
            className="bg-white text-left p-5 rounded-xl transition-all hover:shadow-md"
            style={{
              border: '1px solid var(--border)',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <div
              className="flex items-center justify-center rounded-lg mb-3"
              style={{ width: 36, height: 36, backgroundColor: 'var(--ice-warm)' }}
            >
              <action.icon size={18} style={{ color: 'var(--navy)' }} />
            </div>
            <h4 style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>
              {action.label}
            </h4>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.4 }}>{action.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
