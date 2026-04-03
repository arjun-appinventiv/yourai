import React, { useState } from 'react';
import { Plug, CheckCircle, AlertCircle, Settings, ExternalLink, RefreshCw, Key, Zap } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import Modal from '../../components/Modal';
import { useToast } from '../../components/Toast';

const initialIntegrations = [
  { id: 1, name: 'OpenAI', description: 'GPT-4o and GPT-4o-mini models for AI queries', category: 'AI Models', status: 'Connected', lastSync: 'Live', icon: '🤖', apiCalls: '4,900/day', healthPct: 99.8 },
  { id: 2, name: 'Anthropic', description: 'Claude 3.5 Sonnet for document analysis', category: 'AI Models', status: 'Connected', lastSync: 'Live', icon: '🧠', apiCalls: '1,420/day', healthPct: 99.9 },
  { id: 3, name: 'Stripe', description: 'Payment processing and subscription management', category: 'Payments', status: 'Connected', lastSync: '2 min ago', icon: '💳', apiCalls: '120/day', healthPct: 100 },
  { id: 4, name: 'AWS S3', description: 'Document storage and knowledge base files', category: 'Storage', status: 'Connected', lastSync: 'Live', icon: '☁️', apiCalls: '8,200/day', healthPct: 99.5 },
  { id: 5, name: 'SendGrid', description: 'Transactional and notification emails', category: 'Communication', status: 'Connected', lastSync: '5 min ago', icon: '📧', apiCalls: '340/day', healthPct: 98.2 },
  { id: 6, name: 'Slack', description: 'Operator alerts and notifications', category: 'Communication', status: 'Disconnected', lastSync: 'Never', icon: '💬', apiCalls: '—', healthPct: 0 },
  { id: 7, name: 'Pinecone', description: 'Vector database for semantic search', category: 'AI Infrastructure', status: 'Connected', lastSync: 'Live', icon: '🌲', apiCalls: '6,100/day', healthPct: 99.7 },
  { id: 8, name: 'Datadog', description: 'Platform monitoring and alerting', category: 'Monitoring', status: 'Connected', lastSync: 'Live', icon: '📊', apiCalls: '—', healthPct: 100 },
  { id: 9, name: 'Auth0', description: 'SSO and authentication provider', category: 'Security', status: 'Connected', lastSync: 'Live', icon: '🔐', apiCalls: '890/day', healthPct: 99.9 },
  { id: 10, name: 'Zapier', description: 'Workflow automation webhooks', category: 'Automation', status: 'Error', lastSync: '2 hrs ago', icon: '⚡', apiCalls: '45/day', healthPct: 0 },
];

const statusStyles = {
  Connected: { bg: '#DCFCE7', color: '#166534', dot: '#22C55E' },
  Disconnected: { bg: '#F3F4F6', color: '#374151', dot: '#94A3B8' },
  Error: { bg: '#FEE2E2', color: '#991B1B', dot: '#EF4444' },
};

export default function IntegrationManagement() {
  const [integrations, setIntegrations] = useState(initialIntegrations);
  const [selectedInt, setSelectedInt] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const showToast = useToast();

  const connected = integrations.filter((i) => i.status === 'Connected').length;
  const errorCount = integrations.filter((i) => i.status === 'Error').length;
  const categories = ['All', ...new Set(integrations.map((i) => i.category))];

  const filtered = categoryFilter === 'All' ? integrations : integrations.filter((i) => i.category === categoryFilter);

  const handleReconnect = (id) => {
    setIntegrations((prev) => prev.map((i) => i.id === id ? { ...i, status: 'Connected', lastSync: 'Just now', healthPct: 99.0 } : i));
    showToast('Integration reconnected successfully');
  };

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

  return (
    <div className="space-y-6">
      <PageHeader icon={Plug} title="Integrations" subtitle="Manage platform integrations and monitor health" />

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={Plug} value={integrations.length} label="Total Integrations" />
        <StatCard icon={CheckCircle} value={connected} label="Connected" />
        <StatCard icon={AlertCircle} value={errorCount} label="Errors" accentColor="#991B1B" />
        <StatCard icon={Zap} value="99.6%" label="Avg Uptime" accentColor="var(--gold)" />
      </div>

      {/* Filter */}
      <div className="flex items-center gap-4">
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={inputStyle}>
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* Integration Cards Grid */}
      <div className="grid grid-cols-2 gap-4">
        {filtered.map((intg) => {
          const st = statusStyles[intg.status];
          return (
            <div
              key={intg.id}
              className="bg-white rounded-xl p-5 transition-all hover:shadow-md cursor-pointer"
              style={{ border: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
              onClick={() => setSelectedInt(intg)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{intg.icon}</span>
                  <div>
                    <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{intg.name}</div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{intg.category}</div>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: st.bg, color: st.color }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: st.dot }} />
                  {intg.status}
                </span>
              </div>
              <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>{intg.description}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Last sync: {intg.lastSync}</span>
                  {intg.apiCalls !== '—' && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{intg.apiCalls}</span>}
                </div>
                {intg.healthPct > 0 && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--ice)' }}>
                      <div className="h-full rounded-full" style={{ width: `${intg.healthPct}%`, backgroundColor: intg.healthPct > 99 ? '#22C55E' : intg.healthPct > 95 ? 'var(--gold)' : '#EF4444' }} />
                    </div>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{intg.healthPct}%</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail Modal */}
      <Modal open={!!selectedInt} onClose={() => setSelectedInt(null)} title={selectedInt?.name || ''}>
        {selectedInt && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">{selectedInt.icon}</span>
              <div>
                <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{selectedInt.name}</div>
                <div className="text-sm" style={{ color: 'var(--text-muted)' }}>{selectedInt.description}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Status', selectedInt.status],
                ['Category', selectedInt.category],
                ['Last Sync', selectedInt.lastSync],
                ['API Calls', selectedInt.apiCalls],
                ['Health', selectedInt.healthPct > 0 ? `${selectedInt.healthPct}%` : 'N/A'],
              ].map(([label, value]) => (
                <div key={label} className="p-3 rounded-lg" style={{ backgroundColor: 'var(--ice-warm)' }}>
                  <div className="text-xs font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>{label}</div>
                  <div className="text-sm font-medium mt-1" style={{ color: 'var(--text-primary)' }}>{value}</div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              {(selectedInt.status === 'Disconnected' || selectedInt.status === 'Error') && (
                <button
                  onClick={() => { handleReconnect(selectedInt.id); setSelectedInt(null); }}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white flex items-center gap-2"
                  style={{ backgroundColor: '#166534' }}
                >
                  <RefreshCw size={14} />
                  Reconnect
                </button>
              )}
              <button
                className="px-4 py-2 rounded-lg text-sm font-medium text-white flex items-center gap-2"
                style={{ backgroundColor: 'var(--navy)' }}
              >
                <Settings size={14} />
                Configure
              </button>
              <button onClick={() => setSelectedInt(null)} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ border: '1px solid var(--border)', color: 'var(--slate)' }}>
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
