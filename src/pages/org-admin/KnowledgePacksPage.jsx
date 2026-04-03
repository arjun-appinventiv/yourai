import React from 'react';
import { Database, BookOpen, MessageSquare } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import Badge from '../../components/Badge';
import { knowledgePacks, workspaces } from '../../data/mockData';
import PermissionGate from '../../components/org-admin/PermissionGate';

export default function KnowledgePacksPage() {
  const workspacePacks = knowledgePacks.filter((kp) => !kp.prebuilt);
  const prebuiltPacks = knowledgePacks.filter((kp) => kp.prebuilt);

  return (
    <PermissionGate allowedRoles={['Admin']}>
      <div>
        <PageHeader icon={Database} title="Knowledge Packs" subtitle="Manage workspace and pre-built knowledge packs." />

        {/* Workspace Packs */}
        <div className="mb-8">
          <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '16px', color: 'var(--text-primary)', marginBottom: 16 }}>
            Workspace Packs
          </h3>
          <div className="grid grid-cols-3 gap-4">
            {workspacePacks.map((kp) => {
              const ws = workspaces.find((w) => w.id === kp.workspace);
              return (
                <div key={kp.id} className="bg-white p-5 rounded-xl" style={{ border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Database size={16} style={{ color: 'var(--navy)' }} />
                    <h4 style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>{kp.name}</h4>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: 8 }}>
                    Workspace: {ws?.name || 'General'}
                  </p>
                  <div className="flex items-center gap-4" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    <span>{kp.docs} docs</span>
                    <span>{kp.version}</span>
                  </div>
                  <div className="flex items-center justify-between mt-3" style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                    <div className="flex items-center gap-1">
                      <MessageSquare size={12} style={{ color: 'var(--text-muted)' }} />
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Used in {kp.usedInChats} chats</span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Updated {kp.lastUpdated}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pre-built Library */}
        <div>
          <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '16px', color: 'var(--text-primary)', marginBottom: 16 }}>
            Pre-built Library
          </h3>
          <div className="grid grid-cols-3 gap-4">
            {prebuiltPacks.map((kp) => (
              <div key={kp.id} className="bg-white p-5 rounded-xl" style={{ border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <BookOpen size={16} style={{ color: 'var(--gold)' }} />
                    <h4 style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>{kp.name}</h4>
                  </div>
                  <Badge variant="Published">Pre-built</Badge>
                </div>
                <div className="flex items-center gap-4" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  <span>{kp.docs} docs</span>
                  <span>{kp.version}</span>
                </div>
                <div className="flex items-center justify-between mt-3" style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                  <div className="flex items-center gap-1">
                    <MessageSquare size={12} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Used in {kp.usedInChats} chats</span>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Updated {kp.lastUpdated}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PermissionGate>
  );
}
