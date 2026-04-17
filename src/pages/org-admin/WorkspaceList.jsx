import React, { useState, useMemo } from 'react';
import { Briefcase, Search, Plus, Users, FileText, FileBarChart, Clock, Archive, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';
import { workspaces as initialWorkspaces } from '../../data/mockData';
import { useToast } from '../../components/Toast';

const inputStyle = {
  border: '1px solid var(--border)',
  borderRadius: '8px',
  height: 36,
  padding: '0 12px',
  fontSize: '13px',
  color: 'var(--text-primary)',
  width: '100%',
  outline: 'none',
};

export default function WorkspaceList() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [wsList, setWsList] = useState(initialWorkspaces);
  const navigate = useNavigate();
  const showToast = useToast();

  const filtered = useMemo(() => {
    return wsList.filter((ws) => {
      if (search && !ws.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter !== 'All' && ws.status !== statusFilter) return false;
      return true;
    });
  }, [wsList, search, statusFilter]);

  const handleCreate = () => {
    if (!newName.trim()) return;
    const newWs = {
      id: wsList.length + 1,
      name: newName.trim(),
      status: 'Active',
      members: 1,
      docs: 0,
      reports: 0,
      lastActivity: 'Just now',
      created: 'Today',
    };
    setWsList([newWs, ...wsList]);
    setNewName('');
    setShowModal(false);
    showToast('Workspace created successfully');
  };

  return (
    <div>
      <PageHeader icon={Briefcase} title="Workspaces" subtitle="Manage client workspaces and projects." />

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search workspaces..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ ...inputStyle, paddingLeft: 32, width: 240 }}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ ...inputStyle, width: 130, cursor: 'pointer', backgroundColor: 'white' }}
          >
            <option>All</option>
            <option>Active</option>
            <option>Archived</option>
          </select>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg"
          style={{ backgroundColor: 'var(--navy)', color: 'white', fontSize: '13px', fontWeight: 500, border: 'none', cursor: 'pointer' }}
        >
          <Plus size={14} /> New Workspace
        </button>
      </div>

      {/* Card grid */}
      <div className="grid grid-cols-3 gap-4">
        {filtered.map((ws) => (
          <div
            key={ws.id}
            onClick={() => navigate(`/app/workspaces/${ws.id}`)}
            className="bg-white p-5 rounded-xl cursor-pointer transition-all hover:shadow-md"
            style={{ border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
          >
            <div className="flex items-start justify-between mb-3">
              <div
                className="flex items-center justify-center rounded-lg"
                style={{ width: 36, height: 36, backgroundColor: ws.status === 'Archived' ? '#F0F3F6' : 'var(--ice-warm)' }}
              >
                {ws.status === 'Archived' ? <Archive size={16} style={{ color: '#6B7885' }} /> : <Briefcase size={16} style={{ color: 'var(--navy)' }} />}
              </div>
              <Badge variant={ws.status}>{ws.status}</Badge>
            </div>
            <h3 style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4, lineHeight: 1.3 }}>
              {ws.name}
            </h3>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: 12 }}>
              Created {ws.created}
            </p>
            <div className="flex items-center gap-4" style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
              <div className="flex items-center gap-1.5">
                <Users size={12} style={{ color: 'var(--text-muted)' }} />
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{ws.members}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <FileText size={12} style={{ color: 'var(--text-muted)' }} />
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{ws.docs} docs</span>
              </div>
              <div className="flex items-center gap-1.5">
                <FileBarChart size={12} style={{ color: 'var(--text-muted)' }} />
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{ws.reports} reports</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <Clock size={11} style={{ color: 'var(--text-muted)' }} />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Last activity: {ws.lastActivity}</span>
            </div>
          </div>
        ))}
      </div>

      {/* New Workspace Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Workspace">
        <div className="flex flex-col gap-4">
          <div>
            <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
              Workspace Name
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Client Name — Project Type"
              style={inputStyle}
            />
          </div>
          <div className="flex justify-end gap-3 mt-2">
            <button
              onClick={() => setShowModal(false)}
              className="px-4 py-2 rounded-lg"
              style={{ fontSize: '13px', border: '1px solid var(--border)', backgroundColor: 'white', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              className="px-4 py-2 rounded-lg"
              style={{ fontSize: '13px', backgroundColor: 'var(--navy)', color: 'white', border: 'none', fontWeight: 500, cursor: 'pointer' }}
            >
              Create Workspace
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
