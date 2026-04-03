import React from 'react';
import { CreditCard, Check, ArrowRight } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import Badge from '../../components/Badge';
import Table from '../../components/Table';
import { billingData } from '../../data/mockData';
import PermissionGate from '../../components/org-admin/PermissionGate';

const plans = [
  { name: 'Free', price: 0, features: ['1 user', '50 documents', '10 workflows', '1 knowledge pack'] },
  { name: 'Professional', price: 149, features: ['Up to 3 users', '500 documents', '100 workflows', '5 knowledge packs'] },
  { name: 'Team', price: 299, features: ['Up to 10 users', '2,000 documents', '500 workflows', '20 knowledge packs'], current: true },
  { name: 'Enterprise', price: 599, features: ['Unlimited users', 'Unlimited documents', 'Unlimited workflows', 'Unlimited knowledge packs'] },
];

export default function OrgBilling() {
  return (
    <PermissionGate allowedRoles={['Admin']}>
      <div>
        <PageHeader icon={CreditCard} title="Billing" subtitle="Manage your subscription and view billing history." />

        {/* Current plan card */}
        <div
          className="rounded-xl p-6 mb-8"
          style={{
            backgroundColor: 'var(--navy)',
            color: 'white',
            boxShadow: '0 4px 20px rgba(11,29,58,0.3)',
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.5)' }}>
                Current Plan
              </span>
              <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '28px', marginTop: 4 }}>
                {billingData.plan}
              </h2>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>
                ${billingData.pricePerUser}/user/month &middot; {billingData.users} users
              </p>
            </div>
            <div className="text-right">
              <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.5)' }}>
                Monthly Total
              </div>
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '32px', color: 'var(--gold)' }}>
                ${billingData.mrr.toLocaleString()}
              </div>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
                Next renewal: {billingData.nextRenewal}
              </p>
            </div>
          </div>
        </div>

        {/* Usage meters */}
        <div className="mb-8">
          <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '16px', color: 'var(--text-primary)', marginBottom: 16 }}>
            Usage This Period
          </h3>
          <div className="grid grid-cols-4 gap-4">
            {Object.entries(billingData.usage).map(([key, val]) => {
              const pct = Math.round((val.used / val.limit) * 100);
              const labels = { docs: 'Documents', workflows: 'Workflows', reports: 'Reports', knowledgePacks: 'Knowledge Packs' };
              return (
                <div key={key} className="bg-white p-4 rounded-xl" style={{ border: '1px solid var(--border)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>{labels[key]}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{pct}%</span>
                  </div>
                  <div style={{ height: 6, backgroundColor: 'var(--ice)', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
                    <div style={{ height: '100%', width: `${pct}%`, backgroundColor: pct > 80 ? '#DC2626' : 'var(--navy)', borderRadius: 3 }} />
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{val.used} / {val.limit.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Plan comparison */}
        <div className="mb-8">
          <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '16px', color: 'var(--text-primary)', marginBottom: 16 }}>
            Available Plans
          </h3>
          <div className="grid grid-cols-4 gap-4">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className="bg-white p-5 rounded-xl"
                style={{
                  border: plan.current ? '2px solid var(--navy)' : '1px solid var(--border)',
                  boxShadow: plan.current ? '0 4px 12px rgba(11,29,58,0.12)' : '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                {plan.current && (
                  <Badge variant="Active" className="mb-2">Current Plan</Badge>
                )}
                <h4 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '18px', color: 'var(--text-primary)', marginBottom: 4, marginTop: plan.current ? 0 : 24 }}>
                  {plan.name}
                </h4>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: 16 }}>
                  {plan.price === 0 ? 'Free' : `$${plan.price}/user/mo`}
                </p>
                <div className="flex flex-col gap-2">
                  {plan.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Check size={12} style={{ color: '#166534' }} />
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{f}</span>
                    </div>
                  ))}
                </div>
                {!plan.current && (
                  <button
                    className="w-full mt-4 py-2 rounded-lg flex items-center justify-center gap-1"
                    style={{
                      fontSize: '12px',
                      fontWeight: 500,
                      border: '1px solid var(--border)',
                      backgroundColor: 'white',
                      color: 'var(--navy)',
                      cursor: 'pointer',
                    }}
                  >
                    {plan.price > billingData.pricePerUser ? 'Upgrade' : 'Downgrade'} <ArrowRight size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Billing history */}
        <div>
          <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '16px', color: 'var(--text-primary)', marginBottom: 16 }}>
            Billing History
          </h3>
          <Table columns={['Invoice', 'Date', 'Amount', 'Status']}>
            {billingData.invoices.map((inv) => (
              <tr key={inv.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>{inv.id}</td>
                <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>{inv.date}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-primary)' }}>${inv.amount.toLocaleString()}</td>
                <td style={{ padding: '12px 16px' }}><Badge variant={inv.status}>{inv.status}</Badge></td>
              </tr>
            ))}
          </Table>
        </div>
      </div>
    </PermissionGate>
  );
}
