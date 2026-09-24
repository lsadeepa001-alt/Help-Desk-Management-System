import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API = 'http://localhost:8080/api';

const STATUS_OPTIONS = ['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REOPENED', 'CANCELLED'];
const PRIORITY_OPTIONS = ['ALL', 'CRITICAL', 'URGENT', 'HIGH', 'MEDIUM', 'LOW'];

const statusColors = {
  OPEN: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  IN_PROGRESS: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  RESOLVED: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  CLOSED: 'bg-slate-500/20 text-slate-400 border-slate-500/40',
  REOPENED: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  CANCELLED: 'bg-rose-500/20 text-rose-300 border-rose-500/40 line-through',
};

const priorityColors = {
  LOW: 'bg-slate-500/20 text-slate-300',
  MEDIUM: 'bg-amber-500/20 text-amber-300',
  HIGH: 'bg-orange-500/20 text-orange-300',
  URGENT: 'bg-red-500/20 text-red-300',
  CRITICAL: 'bg-rose-600/30 text-rose-300',
};

export default function AgentDashboard({ onViewTicket }) {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterPriority, setFilterPriority] = useState('ALL');
  const [filterDept, setFilterDept] = useState('ALL');
  const [search, setSearch] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/tickets`);
      setTickets(res.data);
    } catch {
      setActionMsg('Failed to load tickets.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  // Derived department list
  const departments = ['ALL', ...new Set(
    tickets.map(t => t.department || t.createdBy?.department).filter(Boolean)
  )];

  // Stats
  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'OPEN').length,
    inProgress: tickets.filter(t => t.status === 'IN_PROGRESS').length,
    resolved: tickets.filter(t => t.status === 'RESOLVED').length,
    unassigned: tickets.filter(t => !t.assignedTo).length,
  };

  // Filtered tickets
  const filtered = tickets.filter(t => {
    const matchStatus = filterStatus === 'ALL' || t.status === filterStatus;
    const matchPriority = filterPriority === 'ALL' || t.priority === filterPriority;
    const dept = t.department || t.createdBy?.department || '';
    const matchDept = filterDept === 'ALL' || dept === filterDept;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      (t.title?.toLowerCase().includes(q)) ||
      (t.ticketNumber?.toLowerCase().includes(q)) ||
      (t.createdBy?.fullName?.toLowerCase().includes(q));
    return matchStatus && matchPriority && matchDept && matchSearch;
  });

  const claimTicket = async (ticketId) => {
    try {
      await axios.put(`${API}/tickets/${ticketId}/claim`);
      setActionMsg('Ticket claimed successfully!');
      fetchTickets();
      setTimeout(() => setActionMsg(''), 3000);
    } catch (err) {
      setActionMsg('Failed to claim ticket: ' + (err.response?.data?.message || err.message));
    }
  };

  const changeStatus = async (ticketId, newStatus) => {
    try {
      const payload = { status: newStatus };
      if (newStatus === 'RESOLVED') {
        const notes = window.prompt('Please enter mandatory resolution details for this ticket:');
        if (!notes || !notes.trim()) {
          setActionMsg('Resolution notes are required to resolve a ticket.');
          return;
        }
        payload.resolutionNotes = notes.trim();
      }
      await axios.put(`${API}/tickets/${ticketId}/status`, payload);
      setActionMsg(`Ticket status updated to ${newStatus}`);
      fetchTickets();
      setTimeout(() => setActionMsg(''), 3000);
    } catch (err) {
      setActionMsg('Status update failed: ' + (err.response?.data?.message || err.message));
    }
  };

  const fmt = (dt) => {
    if (!dt) return '—';
    return new Date(dt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-900/30 via-slate-800/80 to-indigo-900/30 border border-slate-700/50 shadow-xl">
        <span className="inline-block px-3 py-1 bg-blue-500/20 border border-blue-500/30 text-blue-300 rounded-full text-xs font-semibold uppercase tracking-wider mb-2">
          Module 2: Ticket Lifecycle Engine
        </span>
        <h2 className="text-2xl font-extrabold text-white tracking-tight">🛠️ Agent Workspace</h2>
        <p className="text-slate-400 text-sm mt-1">Manage, assign, and update all helpdesk tickets across departments.</p>
      </div>

      {/* Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'text-slate-300', bg: 'bg-slate-800/80' },
          { label: 'Open', value: stats.open, color: 'text-emerald-300', bg: 'bg-emerald-900/20 border-emerald-800/40' },
          { label: 'In Progress', value: stats.inProgress, color: 'text-blue-300', bg: 'bg-blue-900/20 border-blue-800/40' },
          { label: 'Resolved', value: stats.resolved, color: 'text-purple-300', bg: 'bg-purple-900/20 border-purple-800/40' },
          { label: 'Unassigned', value: stats.unassigned, color: 'text-amber-300', bg: 'bg-amber-900/20 border-amber-800/40' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} border border-slate-700/50 rounded-xl p-4 text-center`}>
            <div className={`text-2xl font-extrabold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-slate-500 mt-1 uppercase tracking-wider">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Action feedback */}
      {actionMsg && (
        <div className="bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-sm font-medium px-4 py-3 rounded-xl">
          ✅ {actionMsg}
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4 space-y-3">
        <div className="relative">
          <input
            type="text"
            placeholder="Search by title, ticket number, or submitter..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-2.5 pl-10 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm"
          />
          <svg className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          {/* Status filter */}
          <div className="flex gap-1 flex-wrap">
            {STATUS_OPTIONS.map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${filterStatus === s
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                  : 'bg-slate-700/60 text-slate-400 hover:bg-slate-700 hover:text-slate-200'}`}>
                {s.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div className="w-px h-5 bg-slate-700 hidden sm:block" />

          {/* Priority filter */}
          <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
            className="bg-slate-700/60 border border-slate-600 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500">
            {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p === 'ALL' ? 'All Priorities' : p}</option>)}
          </select>

          {/* Department filter */}
          {departments.length > 1 && (
            <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
              className="bg-slate-700/60 border border-slate-600 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500">
              {departments.map(d => <option key={d} value={d}>{d === 'ALL' ? 'All Departments' : d}</option>)}
            </select>
          )}

          <button onClick={fetchTickets}
            className="ml-auto px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium rounded-lg transition flex items-center gap-1">
            <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Ticket Table */}
      {loading ? (
        <div className="text-center py-16 text-slate-400">
          <svg className="w-8 h-8 animate-spin mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Loading tickets...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-500">No tickets match the current filters.</div>
      ) : (
        <div className="space-y-3">
          <div className="text-xs text-slate-500 px-1">Showing {filtered.length} of {tickets.length} tickets</div>
          {filtered.map(ticket => (
            <div key={ticket.id}
              className="bg-slate-800/80 border border-slate-700/60 hover:border-indigo-500/40 rounded-xl p-4 transition group shadow-md">
              <div className="flex flex-wrap items-start gap-3 justify-between">
                {/* Left: info */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">
                      {ticket.ticketNumber}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${priorityColors[ticket.priority] || ''}`}>
                      {ticket.priority}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusColors[ticket.status] || ''}`}>
                      {ticket.status?.replace('_', ' ')}
                    </span>
                    {ticket.category && (
                      <span className="text-[10px] text-slate-500 bg-slate-700/50 px-2 py-0.5 rounded-full">
                        {ticket.category.name}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-white group-hover:text-indigo-300 transition truncate">
                    {ticket.title}
                  </h3>
                  <div className="flex gap-3 text-xs text-slate-500 flex-wrap">
                    <span>👤 {ticket.createdBy?.fullName || '?'}</span>
                    {ticket.assignedTo ? (
                      <span className="text-blue-400">🔧 {ticket.assignedTo.fullName}</span>
                    ) : (
                      <span className="text-amber-400 italic">Unassigned</span>
                    )}
                    {(ticket.department || ticket.createdBy?.department) && (
                      <span>🏢 {ticket.department || ticket.createdBy?.department}</span>
                    )}
                    <span>📅 {fmt(ticket.createdAt)}</span>
                  </div>
                </div>

                {/* Right: actions */}
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <button onClick={() => onViewTicket(ticket.id)}
                    className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium rounded-lg transition">
                    View Details →
                  </button>

                  {/* Quick claim button for unassigned OPEN tickets */}
                  {ticket.status === 'OPEN' && !ticket.assignedTo && (user?.role === 'SUPPORT_AGENT' || user?.role === 'TEAM_LEAD') && (
                    <button
                      onClick={() => claimTicket(ticket.id)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition shadow-sm"
                    >
                      ▶ Claim
                    </button>
                  )}

                  {/* Inline status dropdown */}
                  {['IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REOPENED'].includes(ticket.status) &&
                    (user?.role === 'TEAM_LEAD' || user?.role === 'SYSTEM_ADMINISTRATOR' || ticket.assignedTo?.id === user?.id) && (
                    <select
                      value={ticket.status}
                      onChange={e => changeStatus(ticket.id, e.target.value)}
                      className="bg-slate-700 border border-slate-600 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="IN_PROGRESS">IN PROGRESS</option>
                      <option value="RESOLVED">RESOLVED</option>
                      <option value="CLOSED">CLOSED</option>
                      <option value="REOPENED">REOPENED</option>
                    </select>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
