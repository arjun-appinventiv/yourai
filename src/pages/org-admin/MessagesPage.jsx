import React, { useState } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import Badge from '../../components/Badge';
import { orgMessages, messageThreads, clients } from '../../data/mockData';
import PermissionGate from '../../components/org-admin/PermissionGate';

export default function MessagesPage() {
  const [selectedThread, setSelectedThread] = useState(orgMessages[0]?.clientId || null);
  const [reply, setReply] = useState('');

  const thread = messageThreads[selectedThread] || [];
  const selectedMsg = orgMessages.find((m) => m.clientId === selectedThread);

  return (
    <PermissionGate allowedRoles={['Admin', 'Manager']}>
      <div>
        <PageHeader icon={MessageSquare} title="Messages" subtitle="Client messages and communication." />

        <div className="grid gap-0" style={{ gridTemplateColumns: '300px 1fr', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', minHeight: 500 }}>
          {/* Thread list */}
          <div style={{ borderRight: '1px solid var(--border)', backgroundColor: 'white' }}>
            <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>Conversations</span>
            </div>
            {orgMessages.map((msg) => {
              const client = clients.find((c) => c.id === msg.clientId);
              return (
                <div
                  key={msg.id}
                  onClick={() => setSelectedThread(msg.clientId)}
                  className="px-4 py-3 cursor-pointer transition-colors"
                  style={{
                    borderBottom: '1px solid var(--border)',
                    backgroundColor: selectedThread === msg.clientId ? 'var(--ice-warm)' : 'transparent',
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="rounded-full flex items-center justify-center text-white" style={{ width: 28, height: 28, backgroundColor: 'var(--slate)', fontSize: '10px', fontWeight: 600 }}>
                        {client?.avatar}
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{msg.clientName}</span>
                    </div>
                    {msg.unread > 0 && (
                      <span className="rounded-full flex items-center justify-center text-white" style={{ width: 18, height: 18, backgroundColor: '#DC2626', fontSize: '9px', fontWeight: 600 }}>
                        {msg.unread}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {msg.preview}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{msg.workspace}</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{msg.time}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Chat panel */}
          <div className="flex flex-col bg-white">
            {selectedMsg ? (
              <>
                <div className="px-5 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border)' }}>
                  <div className="rounded-full flex items-center justify-center text-white" style={{ width: 30, height: 30, backgroundColor: 'var(--slate)', fontSize: '11px', fontWeight: 600 }}>
                    {clients.find((c) => c.id === selectedThread)?.avatar}
                  </div>
                  <div>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{selectedMsg.clientName}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>{selectedMsg.workspace}</span>
                  </div>
                </div>

                <div className="flex-1 p-5 overflow-y-auto" style={{ backgroundColor: 'var(--ice-warm)' }}>
                  {thread.map((m, i) => (
                    <div key={i} className={`flex ${m.sender === 'client' ? 'justify-start' : 'justify-end'} mb-3`}>
                      <div
                        className="px-4 py-2.5 rounded-xl"
                        style={{
                          maxWidth: '70%',
                          backgroundColor: m.sender === 'client' ? 'white' : 'var(--navy)',
                          color: m.sender === 'client' ? 'var(--text-primary)' : 'white',
                          fontSize: '13px',
                          lineHeight: 1.5,
                          boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                        }}
                      >
                        {m.text}
                        <div style={{ fontSize: '10px', color: m.sender === 'client' ? 'var(--text-muted)' : 'rgba(255,255,255,0.5)', marginTop: 4 }}>
                          {m.time}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="px-5 py-3 flex items-center gap-3" style={{ borderTop: '1px solid var(--border)' }}>
                  <input
                    type="text"
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Type a message..."
                    style={{
                      flex: 1,
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      height: 36,
                      padding: '0 12px',
                      fontSize: '13px',
                      color: 'var(--text-primary)',
                      outline: 'none',
                    }}
                  />
                  <button
                    className="flex items-center justify-center rounded-lg"
                    style={{
                      width: 36, height: 36,
                      backgroundColor: 'var(--navy)',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <Send size={14} style={{ color: 'white' }} />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Select a conversation to view messages.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </PermissionGate>
  );
}
