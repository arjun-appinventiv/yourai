import React from 'react';
import { Clock, Sparkles } from 'lucide-react';
import PageHeader from '../../components/PageHeader';

export default function PlaceholderPage({ title = 'Feature', icon: Icon = Clock }) {
  return (
    <div>
      <PageHeader icon={Icon} title={title} subtitle="This feature is under development." />
      <div className="flex flex-col items-center justify-center" style={{ minHeight: '50vh' }}>
        <div
          className="flex items-center justify-center rounded-full mb-6"
          style={{ width: 80, height: 80, backgroundColor: 'var(--ice-warm)', border: '1px solid var(--border)' }}
        >
          <Sparkles size={32} style={{ color: 'var(--gold)' }} />
        </div>
        <h2
          style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: '24px',
            color: 'var(--text-primary)',
            marginBottom: 8,
          }}
        >
          Coming Soon
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', textAlign: 'center', maxWidth: 400, lineHeight: 1.5 }}>
          We're building something great. {title} will be available in an upcoming release.
          Stay tuned for updates.
        </p>
      </div>
    </div>
  );
}
