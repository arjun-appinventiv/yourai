import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, DollarSign, Building2, Users, FileText,
  Sparkles, Activity, TrendingUp, Upload, Bell, UserPlus,
  FileBarChart, HardDrive, Server, Shield, Ban, CreditCard,
  UserCheck, Clock, Rocket, Send, ChevronRight, Plus, Calendar
} from 'lucide-react';
import StatCard from '../../components/StatCard';
import Badge from '../../components/Badge';
import Table from '../../components/Table';
import { tenants, dashboardStats } from '../../data/mockData';

/* ─── SVG Line Chart ─── */
function MrrLineChart({ data }) {
  const W = 440, H = 200;
  const padL = 45, padR = 20, padT = 20, padB = 35;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const min = 3000, max = 14000;
  const toX = (i) => padL + (i / (data.length - 1)) * chartW;
  const toY = (v) => padT + chartH - ((v - min) / (max - min)) * chartH;
  const points = data.map((d, i) => `${toX(i)},${toY(d.value)}`).join(' ');
  const areaPoints = `${toX(0)},${toY(data[0].value)} ${points} ${toX(data.length - 1)},${padT + chartH} ${toX(0)},${padT + chartH}`;
  const gridLines = [4000, 8000, 12000];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 200 }}>
      <defs>
        <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(11,29,58,0.18)" />
          <stop offset="100%" stopColor="rgba(11,29,58,0.01)" />
        </linearGradient>
      </defs>
      {gridLines.map((v) => (
        <g key={v}>
          <line x1={padL} y1={toY(v)} x2={W - padR} y2={toY(v)} stroke="var(--border)" strokeDasharray="4 4" />
          <text x={padL - 8} y={toY(v) + 4} textAnchor="end" fontSize="10" fill="var(--text-muted)" fontFamily="DM Sans">${(v / 1000).toFixed(0)}K</text>
        </g>
      ))}
      <polygon points={areaPoints} fill="url(#mrrGrad)" />
      <polyline points={points} fill="none" stroke="var(--navy)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {data.map((d, i) => (
        <g key={d.month}>
          <circle cx={toX(i)} cy={toY(d.value)} r="4" fill="white" stroke="var(--navy)" strokeWidth="2" />
          <text x={toX(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--text-muted)" fontFamily="DM Sans">{d.month}</text>
        </g>
      ))}
      <text x={toX(data.length - 1) + 2} y={toY(data[data.length - 1].value) - 10} fontSize="12" fontWeight="600" fill="var(--text-primary)" fontFamily="DM Sans">${(data[data.length - 1].value / 1000).toFixed(1)}K</text>
    </svg>
  );
}

/* ─── SVG Donut Chart ─── */
function DonutChart({ data, centerValue, centerLabel, size = 180 }) {
  const r = 65, sw = 24;
  const cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  const total = data.reduce((s, d) => s + (d.count || d.pct || 0), 0);
  let cumulative = 0;

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--ice)" strokeWidth={sw} />
        <g transform={`rotate(-90 ${cx} ${cy})`}>
          {data.map((d) => {
            const val = d.count || d.pct || 0;
            const dashLen = (val / total) * circ;
            const dashGap = circ - dashLen;
            const offset = -(cumulative / total) * circ;
            cumulative += val;
            return (
              <circle key={d.plan || d.model} cx={cx} cy={cy} r={r} fill="none" stroke={d.color} strokeWidth={sw} strokeDasharray={`${dashLen} ${dashGap}`} strokeDashoffset={offset} strokeLinecap="butt" />
            );
          })}
        </g>
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="24" fontWeight="400" fill="var(--text-primary)" fontFamily="'DM Serif Display', serif">{centerValue}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize="11" fill="var(--text-muted)" fontFamily="DM Sans">{centerLabel}</text>
      </svg>
      <div className="flex flex-wrap justify-center gap-x-5 gap-y-1.5 mt-3">
        {data.map((d) => (
          <div key={d.plan || d.model} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{d.plan || d.model}</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>({d.count || `${d.pct}%`})</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── CSS Bar Chart ─── */
function DailyBarChart({ data }) {
  const maxVal = Math.max(...data.map((d) => d.value));
  return (
    <div className="flex items-end gap-3" style={{ height: 160, paddingTop: 8 }}>
      {data.map((d) => (
        <div key={d.day} className="flex-1 flex flex-col items-center justify-end h-full">
          <span className="text-xs font-medium mb-1" style={{ color: 'var(--text-primary)', fontSize: '11px' }}>{d.value}</span>
          <div
            className="w-full rounded-t-md transition-all"
            style={{
              height: `${(d.value / maxVal) * 100}%`,
              backgroundColor: d.day === 'Thu' ? 'var(--gold)' : 'var(--navy)',
              opacity: d.day === 'Sat' || d.day === 'Sun' ? 0.35 : 1,
              minHeight: 8,
            }}
          />
          <span className="mt-2" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{d.day}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Activity Timeline ─── */
const planColorsMap = { Free: '#64748B', Professional: '#1D4ED8', Team: '#166534', Enterprise: '#92400E' };
const typeColors = { access: '#1D4ED8', data: '#166534', system: '#94A3B8', comms: '#C9A84C', billing: '#9333EA' };
const typeIcons = { access: UserCheck, data: Upload, system: Server, comms: Bell, billing: CreditCard };

function ActivityTimeline({ events }) {
  return (
    <div style={{ maxHeight: 380, overflowY: 'auto' }}>
      {events.map((e, i) => {
        const Icon = typeIcons[e.type] || Activity;
        const color = typeColors[e.type] || '#94A3B8';
        return (
          <div key={e.id} className="flex gap-3" style={{ padding: '12px 0' }}>
            <div className="flex flex-col items-center" style={{ width: 24 }}>
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color, marginTop: 4 }} />
              {i < events.length - 1 && <div className="flex-1 w-px" style={{ backgroundColor: 'var(--border)', marginTop: 4 }} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{e.operator}</span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{e.time}</span>
              </div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{e.action}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{e.target}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Health Card ─── */
function HealthCard({ icon: Icon, value, label, current, max, color }) {
  const pct = max > 0 ? Math.min((current / max) * 100, 100) : 0;
  return (
    <div className="bg-white rounded-xl p-4 flex items-center gap-4" style={{ border: '1px solid var(--border)' }}>
      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--ice-warm)' }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: '18px', color: 'var(--text-primary)' }}>{value}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{label}</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--ice)' }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
        </div>
      </div>
    </div>
  );
}

const orgStates = {
  1: 'New York',
  2: 'California',
  3: 'Illinois',
  4: 'Texas',
  5: 'Florida',
  6: 'Georgia',
  7: 'Massachusetts',
  8: 'Washington',
};

/* ═══════════════════════════════════ DASHBOARD ═══════════════════════════════════ */

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState('30d');
  const { mrrTrend, planDistribution, dailyActiveUsers, aiModelUsage, systemHealth } = dashboardStats;

  const totalMRR = tenants.reduce((s, t) => s + t.mrr, 0);
  const activeOrgs = tenants.filter((t) => t.status === 'Active').length;
  const totalUsers = tenants.reduce((s, t) => s + t.users, 0);
  const totalDocs = tenants.reduce((s, t) => s + t.documents, 0);
  const topOrgs = [...tenants].sort((a, b) => b.mrr - a.mrr).slice(0, 5);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const cardStyle = {
    backgroundColor: 'white',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
  };

  return (
    <div className="space-y-6">
      {/* Section 1: Welcome + Actions */}
      <div>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <LayoutDashboard size={20} style={{ color: 'var(--text-primary)' }} />
              <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '22px', color: 'var(--text-primary)' }}>
                {greeting}, Operator
              </h1>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginLeft: 30 }}>
              Here's your platform overview for April 2, 2026.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Global date filter */}
            <div className="relative flex items-center gap-1.5" style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '0 12px', height: 36, backgroundColor: 'white' }}>
              <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                style={{ border: 'none', outline: 'none', fontSize: '13px', color: 'var(--text-primary)', fontFamily: "'DM Sans', sans-serif", backgroundColor: 'transparent', cursor: 'pointer' }}
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="1m">Last 1 month</option>
                <option value="6m">Last 6 months</option>
                <option value="custom">Custom date</option>
              </select>
            </div>
            {/* Add Tenant button */}
            <button
              onClick={() => navigate('/super-admin/tenants')}
              className="flex items-center gap-1.5 text-white"
              style={{ backgroundColor: 'var(--navy)', borderRadius: '8px', padding: '0 16px', height: 36, fontSize: '13px', fontWeight: 500, border: 'none', cursor: 'pointer' }}
            >
              <Plus size={15} /> Add Tenant
            </button>
          </div>
        </div>
        <div style={{ height: 1, backgroundColor: 'var(--border)', margin: '16px 0 24px' }} />
      </div>

      {/* Section 2: KPI Row */}
      <div className="grid grid-cols-6 gap-4">
        <StatCard icon={DollarSign} value={`$${totalMRR.toLocaleString()}`} label="Monthly Revenue" accentColor="var(--gold)" />
        <StatCard icon={Building2} value={activeOrgs} label="Active Orgs" />
        <StatCard icon={Users} value={totalUsers} label="Total Users" />
        <StatCard icon={FileText} value={totalDocs.toLocaleString()} label="Documents" />
        <StatCard icon={Sparkles} value="3,992" label="AI Queries" />
        <StatCard icon={Activity} value="99.8%" label="Uptime" />
      </div>

      {/* Section 3: Revenue Charts */}
      <div className="grid gap-6" style={{ gridTemplateColumns: '1.2fr 1fr' }}>
        <div style={{ ...cardStyle, padding: '24px' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '16px', color: 'var(--text-primary)' }}>MRR Trend</h2>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Last 6 months</span>
          </div>
          <MrrLineChart data={mrrTrend} />
        </div>
        <div style={{ ...cardStyle, padding: '24px' }}>
          <h2 className="mb-4" style={{ fontFamily: "'DM Serif Display', serif", fontSize: '16px', color: 'var(--text-primary)' }}>Plan Distribution</h2>
          <DonutChart data={planDistribution} centerValue="8" centerLabel="Orgs" />
        </div>
      </div>

      {/* Section 4: Activity & Usage */}
      <div className="grid gap-6" style={{ gridTemplateColumns: '1.2fr 1fr' }}>
        <div style={{ ...cardStyle, padding: '24px' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '16px', color: 'var(--text-primary)' }}>Daily Active Users</h2>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>This week</span>
          </div>
          <DailyBarChart data={dailyActiveUsers} />
        </div>
        <div style={{ ...cardStyle, padding: '24px' }}>
          <h2 className="mb-4" style={{ fontFamily: "'DM Serif Display', serif", fontSize: '16px', color: 'var(--text-primary)' }}>AI Model Usage</h2>
          <DonutChart data={aiModelUsage} centerValue="3,992" centerLabel="queries" size={170} />
        </div>
      </div>

      {/* Section 5: Top Organisations */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '16px', color: 'var(--text-primary)' }}>Top Organisations by Revenue</h2>
          <button onClick={() => navigate('/super-admin/tenants')} className="flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            View all <ChevronRight size={14} />
          </button>
        </div>
        <Table columns={['Rank', 'Organisation', 'Plan', 'State', 'MRR', 'Users', 'Trend']}>
          {topOrgs.map((t, i) => (
            <tr key={t.id} className="transition-colors" style={{ borderBottom: '1px solid var(--border)' }} onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--ice-warm)')} onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'white')}>
              <td className="px-4 py-3">
                <span className="w-6 h-6 rounded-full inline-flex items-center justify-center text-xs font-bold" style={{ backgroundColor: i === 0 ? 'var(--gold)' : 'var(--ice)', color: i === 0 ? 'white' : 'var(--text-muted)' }}>
                  {i + 1}
                </span>
              </td>
              <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t.name}</td>
              <td className="px-4 py-3"><Badge variant={t.plan}>{t.plan}</Badge></td>
              <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>{orgStates[t.id] || '\u2014'}</td>
              <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>${t.mrr.toLocaleString()}</td>
              <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>{t.users}</td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: '#16A34A' }}>
                  <TrendingUp size={13} /> +{12 - i * 2}%
                </span>
              </td>
            </tr>
          ))}
        </Table>
      </div>

      {/* Section 6: System Health */}
      <div>
        <h2 className="mb-4" style={{ fontFamily: "'DM Serif Display', serif", fontSize: '16px', color: 'var(--text-primary)' }}>System Health</h2>
        <div className="grid grid-cols-3 gap-4">
          <HealthCard icon={Server} value={`${systemHealth.apiResponseTime}ms`} label="API Response" current={systemHealth.apiResponseTime} max={200} color="#059669" />
          <HealthCard icon={Shield} value={`${systemHealth.errorRate}%`} label="Error Rate" current={systemHealth.errorRate} max={5} color="#059669" />
          <HealthCard icon={HardDrive} value={`${systemHealth.storageUsed} GB`} label={`/ ${systemHealth.storageTotal} GB`} current={systemHealth.storageUsed} max={systemHealth.storageTotal} color="var(--navy)" />
        </div>
      </div>

      {/* Section 7: Quick Actions */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { icon: UserPlus, label: 'Add Tenant', desc: 'Onboard a new organisation', path: '/super-admin/tenants' },
          { icon: Upload, label: 'Upload KB Doc', desc: 'Add to global knowledge base', path: '/super-admin/knowledge-base' },
          { icon: Send, label: 'Send Broadcast', desc: 'Notify all org admins', path: '/super-admin/notifications' },
          { icon: FileBarChart, label: 'View Reports', desc: 'Platform analytics & reports', path: '/super-admin/reports' },
        ].map(({ icon: Icon, label, desc, path }) => (
          <button
            key={label}
            onClick={() => navigate(path)}
            className="bg-white rounded-xl p-5 text-left transition-all hover:shadow-md"
            style={{ border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
          >
            <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: 'var(--ice-warm)' }}>
              <Icon size={18} style={{ color: 'var(--navy)' }} />
            </div>
            <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
