import React from 'react';

export default function Table({ columns, children }) {
  return (
    <div
      className="bg-white overflow-hidden"
      style={{
        border: '1px solid var(--border)',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      <table className="w-full">
        <thead>
          <tr style={{ backgroundColor: 'var(--ice-warm)', borderBottom: '1px solid var(--border)' }}>
            {columns.map((col) => (
              <th
                key={col}
                className="text-left"
                style={{
                  color: 'var(--text-muted)',
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 600,
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  height: 40,
                  padding: '0 16px',
                }}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
