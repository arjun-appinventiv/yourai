import React, { useState, useMemo } from 'react';
import { Send, Download, ChevronDown, ChevronUp, Search, Bell } from 'lucide-react';
import { notifications as initialNotifications } from '../../data/mockData';
import PageHeader from '../../components/PageHeader';
import Table from '../../components/Table';
import { useToast } from '../../components/Toast';

const totalAdmins = 45;

const notifMessages = {
  1: 'We are excited to announce the new Deliverables Module. You can now generate structured deliverables directly from your AI-powered reports, including SOWs, action items, and compliance checklists. Access it from your workspace sidebar.',
  2: 'YourAI will undergo scheduled maintenance on April 5, 2026 at 02:00 UTC. Expected downtime is approximately 30 minutes. All active sessions will be saved. No action is required from your side.',
  3: 'This is a reminder to complete your SOC 2 evidence collection for Q1 2026. Please ensure all audit trail exports and access logs have been submitted to your compliance team by end of this week.',
};

export default function BroadcastNotifications() {
  const [notifList, setNotifList] = useState(
    initialNotifications.map((n) => ({ ...n, status: 'Sent', message: notifMessages[n.id] || '' }))
  );
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState('All Org Admins');
  const [delivery, setDelivery] = useState('in-app');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [expandedId, setExpandedId] = useState(null);
  const showToast = useToast();

  const handleSend = () => {
    if (!title.trim()) return;
    const newNotif = {
      id: Date.now(),
      title: title.trim(),
      target,
      sent: 'Just now',
      reads: 0,
      status: 'Sent',
      message: message.trim(),
    };
    setNotifList([newNotif, ...notifList]);
    showToast(`Notification sent to ${target}`);
    setTitle('');
    setMessage('');
  };

  const filteredNotifs = useMemo(() => {
    return notifList.filter((n) => {
      if (searchQuery && !n.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (statusFilter !== 'All' && n.status !== statusFilter) return false;
      return true;
    });
  }, [notifList, searchQuery, statusFilter]);

  const handleExportCSV = () => {
    const header = 'Title,Target,Sent,Reads,Status';
    const rows = notifList.map((n) => `"${n.title}","${n.target}","${n.sent}",${n.reads},${n.status}`);
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'notifications_export.csv';
    a.click();
    showToast('Notifications CSV exported');
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
    width: '100%',
  };

  return (
    <div className="space-y-6">
      <PageHeader icon={Bell} title="Notifications" subtitle="Send broadcasts and manage notification history" />
      <div className="flex gap-6">
      {/* Left: Compose — 40% */}
      <div className="w-2/5">
        <div className="bg-white rounded-xl p-6" style={{ border: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <h2 className="mb-5" style={{ fontFamily: "'DM Serif Display', serif", color: 'var(--text-primary)', fontSize: '16px' }}>
            Send Broadcast
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Notification Title</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter notification title..." style={inputStyle} onFocus={(e) => (e.target.style.borderColor = 'var(--navy)')} onBlur={(e) => (e.target.style.borderColor = 'var(--border)')} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Message</label>
              <textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Write your message..." style={{ ...inputStyle, resize: 'none' }} onFocus={(e) => (e.target.style.borderColor = 'var(--navy)')} onBlur={(e) => (e.target.style.borderColor = 'var(--border)')} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Target Audience</label>
              <select value={target} onChange={(e) => setTarget(e.target.value)} style={inputStyle}>
                <option>All Org Admins</option>
                <option>Team and Enterprise Admins</option>
                <option>Enterprise Admins Only</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Delivery</label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" name="delivery" value="in-app" checked={delivery === 'in-app'} onChange={() => setDelivery('in-app')} style={{ accentColor: 'var(--navy)' }} /> In-app only
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" name="delivery" value="in-app-email" checked={delivery === 'in-app-email'} onChange={() => setDelivery('in-app-email')} style={{ accentColor: 'var(--navy)' }} /> In-app + Email
                </label>
              </div>
            </div>
            <button onClick={handleSend} className="w-full py-2.5 rounded-lg text-sm font-medium text-white flex items-center justify-center gap-2" style={{ backgroundColor: 'var(--navy)' }}>
              <Send size={16} /> Send Notification
            </button>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Notifications are delivered immediately and cannot be unsent.</p>
          </div>
        </div>
      </div>

      {/* Right: History — 60% */}
      <div className="w-3/5">
        <div className="flex items-center justify-between mb-4">
          <h2 style={{ fontFamily: "'DM Serif Display', serif", color: 'var(--text-primary)', fontSize: '16px' }}>
            Notification History
          </h2>
          <button onClick={handleExportCSV} className="px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5" style={{ border: '1px solid var(--border)', color: 'var(--slate)', backgroundColor: 'white' }}>
            <Download size={14} /> Export CSV
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input type="text" placeholder="Search notifications..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-8" style={{ ...inputStyle, padding: '6px 12px 6px 32px', fontSize: '13px' }} />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ ...inputStyle, width: 'auto', padding: '6px 12px', fontSize: '13px' }}>
            <option>All</option>
            <option>Sent</option>
            <option>Draft</option>
          </select>
        </div>

        <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: 'var(--ice-warm)' }}>
                {['', 'Title', 'Target', 'Sent', 'Read / Total'].map((c) => (
                  <th key={c} className="text-left px-4 py-3" style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredNotifs.map((n) => (
                <React.Fragment key={n.id}>
                  <tr className="transition-colors cursor-pointer" style={{ borderBottom: expandedId === n.id ? 'none' : '1px solid var(--ice)' }} onClick={() => setExpandedId(expandedId === n.id ? null : n.id)} onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--ice-warm)')} onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'white')}>
                    <td className="px-4 py-3 w-8">
                      {expandedId === n.id ? <ChevronUp size={16} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{n.title}</td>
                    <td className="px-4 py-3 text-sm">{n.target}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>{n.sent}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--ice)', maxWidth: 80 }}>
                          <div className="h-full rounded-full" style={{ width: `${Math.round((n.reads / totalAdmins) * 100)}%`, backgroundColor: n.reads / totalAdmins > 0.5 ? '#22C55E' : 'var(--gold)' }} />
                        </div>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{n.reads}/{totalAdmins}</span>
                      </div>
                    </td>
                  </tr>
                  {expandedId === n.id && (
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <td colSpan={5} className="px-4 py-3" style={{ backgroundColor: 'var(--ice-warm)' }}>
                        <div className="pl-8">
                          <div className="text-xs font-semibold uppercase mb-1" style={{ color: 'var(--text-muted)' }}>Message Body</div>
                          <p className="text-sm" style={{ color: 'var(--slate)', lineHeight: '1.6' }}>
                            {n.message || 'No message body recorded.'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </div>
  );
}
