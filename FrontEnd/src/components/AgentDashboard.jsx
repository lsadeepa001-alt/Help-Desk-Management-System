import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  Wrench,
  Search,
  User,
  Building2,
  GraduationCap,
  Calendar,
  CheckCircle2,
  AlertCircle,
  UserCheck,
  UserPlus,
  RefreshCw,
  X,
  ArrowRight,
  Inbox,
  Filter,
  ArrowUpDown,
} from 'lucide-react';
import Button from './ui/Button';
import Badge from './ui/Badge';
import EmptyState from './ui/EmptyState';

const API = 'http://localhost:8080/api';

const STATUS_OPTIONS = ['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REOPENED', 'CANCELLED'];
const PRIORITY_OPTIONS = ['ALL', 'CRITICAL', 'URGENT', 'HIGH', 'MEDIUM', 'LOW'];

const statusBadgeVariant = {
  OPEN: 'info',
  IN_PROGRESS: 'sky',
  RESOLVED: 'success',
  CLOSED: 'neutral',
  REOPENED: 'warning',
  CANCELLED: 'error',
};

const priorityBadgeVariant = {
  LOW: 'neutral',
  MEDIUM: 'warning',
  HIGH: 'warning',
  URGENT: 'error',
  CRITICAL: 'error',
};

export default function AgentDashboard({ onViewTicket }) {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterPriority, setFilterPriority] = useState('ALL');
  const [filterDept, setFilterDept] = useState('ALL');
  const [sortBy, setSortBy] = useState('NEWEST');
  const [search, setSearch] = useState('');
  const [actionMsg, setActionMsg] = useState('');
  const [isError, setIsError] = useState(false);

  // Dedicated Resolution Modal State (replaces window.prompt)
  const [resolveTicket, setResolveTicket] = useState(null);
  const [resolveNotes, setResolveNotes] = useState('');
  const [resolveLoading, setResolveLoading] = useState(false);
  const [resolveError, setResolveError] = useState('');

  // Queue Assign/Reassign Modal State (for TEAM_LEAD and SYSTEM_ADMINISTRATOR)
  const [assignTicketTarget, setAssignTicketTarget] = useState(null);
  const [availableAgents, setAvailableAgents] = useState([]);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignError, setAssignError] = useState('');

  const fetchTickets = useCallback(async (isBackground = false) => {
    if (!isBackground) {
      setLoading(true);
    }
    try {
      const res = await axios.get(`${API}/tickets`);
      setTickets(res.data);
    } catch {
      if (!isBackground) {
        setActionMsg('Failed to load tickets.');
        setIsError(true);
      }
    } finally {
      if (!isBackground) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchTickets(false);

    const intervalId = setInterval(() => {
      if (!document.hidden) {
        fetchTickets(true);
      }
    }, 20000);

    return () => clearInterval(intervalId);
  }, [fetchTickets]);

  const departments = ['ALL', 'IT', 'Maintenance', 'Security'];

  const stats = {
    total: tickets.length,
    open: tickets.filter((t) => t.status === 'OPEN').length,
    inProgress: tickets.filter((t) => t.status === 'IN_PROGRESS').length,
    resolved: tickets.filter((t) => t.status === 'RESOLVED').length,
    unassigned: tickets.filter((t) => !t.assignedTo).length,
  };

  const priorityWeights = {
    CRITICAL: 5,
    URGENT: 4,
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1,
  };

  const filtered = tickets.filter((t) => {
    const matchStatus = filterStatus === 'ALL' || t.status === filterStatus;
    const matchPriority = filterPriority === 'ALL' || t.priority === filterPriority;
    const dept = t.department || '';
    const matchDept = filterDept === 'ALL' || dept.toLowerCase() === filterDept.toLowerCase();
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      t.title?.toLowerCase().includes(q) ||
      t.ticketNumber?.toLowerCase().includes(q) ||
      t.createdBy?.fullName?.toLowerCase().includes(q);
    return matchStatus && matchPriority && matchDept && matchSearch;
  });

  const filteredAndSorted = [...filtered].sort((a, b) => {
    if (sortBy === 'OLDEST') {
      return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
    }
    if (sortBy === 'PRIORITY_DESC') {
      const weightA = priorityWeights[a.priority] || 0;
      const weightB = priorityWeights[b.priority] || 0;
      if (weightB !== weightA) return weightB - weightA;
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    }
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });

  const claimTicket = async (ticketId) => {
    try {
      await axios.put(`${API}/tickets/${ticketId}/claim`);
      setActionMsg('Ticket successfully claimed.');
      setIsError(false);
      fetchTickets();
      setTimeout(() => setActionMsg(''), 3000);
    } catch (err) {
      setActionMsg('Failed to claim ticket: ' + (err.response?.data?.message || err.message));
      setIsError(true);
    }
  };

  const handleStatusSelect = (ticket, newStatus) => {
    if (newStatus === ticket.status) return;
    if (newStatus === 'RESOLVED') {
      setResolveTicket(ticket);
      setResolveNotes('');
      setResolveError('');
      return;
    }
    changeStatus(ticket.id, newStatus);
  };

  const changeStatus = async (ticketId, newStatus) => {
    try {
      await axios.put(`${API}/tickets/${ticketId}/status`, { status: newStatus });
      setActionMsg(`Ticket status updated to ${newStatus.replace('_', ' ')}.`);
      setIsError(false);
      fetchTickets();
      setTimeout(() => setActionMsg(''), 3000);
    } catch (err) {
      setActionMsg('Status update failed: ' + (err.response?.data?.message || err.message));
      setIsError(true);
    }
  };

  const handleConfirmResolve = async () => {
    if (!resolveTicket) return;
    if (!resolveNotes.trim()) {
      setResolveError('Resolution notes are required to resolve a ticket.');
      return;
    }
    setResolveLoading(true);
    setResolveError('');
    try {
      await axios.put(`${API}/tickets/${resolveTicket.id}/status`, {
        status: 'RESOLVED',
        resolutionNotes: resolveNotes.trim(),
      });
      setActionMsg(`Ticket ${resolveTicket.ticketNumber} marked as Resolved.`);
      setIsError(false);
      setResolveTicket(null);
      fetchTickets();
      setTimeout(() => setActionMsg(''), 3000);
    } catch (err) {
      setResolveError('Failed to resolve ticket: ' + (err.response?.data?.message || err.message));
    } finally {
      setResolveLoading(false);
    }
  };

  const handleOpenAssignModal = async (ticket) => {
    setAssignTicketTarget(ticket);
    setSelectedAgentId(ticket.assignedTo?.id ? String(ticket.assignedTo.id) : '');
    setAssignError('');
    setAssignLoading(true);
    try {
      const res = await axios.get(`${API}/users/agents`);
      const dept = ticket.department ? ticket.department.toLowerCase() : null;
      const filteredAgents = dept
        ? res.data.filter((a) => a.department && a.department.toLowerCase() === dept)
        : res.data;
      setAvailableAgents(filteredAgents);
    } catch (err) {
      setAssignError('Failed to load agents: ' + (err.response?.data?.message || err.message));
      setAvailableAgents([]);
    } finally {
      setAssignLoading(false);
    }
  };

  const handleConfirmAssign = async () => {
    if (!assignTicketTarget) return;
    if (!selectedAgentId) {
      setAssignError('Please select a support agent.');
      return;
    }
    setAssignLoading(true);
    setAssignError('');
    try {
      await axios.put(`${API}/tickets/${assignTicketTarget.id}/assign`, {
        agentId: Number(selectedAgentId),
      });
      setActionMsg(`Ticket ${assignTicketTarget.ticketNumber} assigned successfully.`);
      setIsError(false);
      setAssignTicketTarget(null);
      fetchTickets();
      setTimeout(() => setActionMsg(''), 3000);
    } catch (err) {
      setAssignError('Assignment failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setAssignLoading(false);
    }
  };

  const fmt = (dt) => {
    if (!dt) return '—';
    return new Date(dt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-400 text-xs font-semibold uppercase tracking-wider">
              <Wrench className="w-3.5 h-3.5" />
              <span>Operational Workspace</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-slate-400 text-[11px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>20s Live Sync</span>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Agent Workspace</h2>
          <p className="text-slate-400 text-xs mt-1">
            Manage, triage, and progress university service tickets across departments.
          </p>
        </div>
      </div>

      {/* Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total Tickets', value: stats.total, color: 'text-slate-200', bg: 'bg-slate-900 border-slate-800' },
          { label: 'Open Queue', value: stats.open, color: 'text-blue-400', bg: 'bg-slate-900 border-slate-800' },
          { label: 'In Progress', value: stats.inProgress, color: 'text-sky-400', bg: 'bg-slate-900 border-slate-800' },
          { label: 'Resolved', value: stats.resolved, color: 'text-emerald-400', bg: 'bg-slate-900 border-slate-800' },
          { label: 'Unassigned', value: stats.unassigned, color: 'text-amber-400', bg: 'bg-slate-900 border-slate-800' },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} border rounded-2xl p-4 text-center transition hover:border-slate-700`}>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-[11px] text-slate-400 mt-1 uppercase tracking-wider font-medium">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Action Feedback Notification */}
      {actionMsg && (
        <div
          className={`p-3.5 rounded-xl text-xs font-medium flex items-center gap-2.5 animate-in fade-in duration-150 ${
            isError
              ? 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
              : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
          }`}
        >
          {isError ? (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          )}
          <span>{actionMsg}</span>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by title, ticket number, or submitter..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>

        <div className="flex flex-wrap gap-2.5 items-center pt-1 text-xs">
          <div className="flex items-center gap-1.5 text-slate-400 font-medium">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span>Filters:</span>
          </div>

          {/* Department Filter */}
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {departments.map((d) => (
              <option key={d} value={d}>
                {d === 'ALL' ? 'All Departments' : `Dept: ${d}`}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s === 'ALL' ? 'All Statuses' : s.replace('_', ' ')}
              </option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p === 'ALL' ? 'All Priorities' : `Priority: ${p}`}
              </option>
            ))}
          </select>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent text-xs text-slate-300 focus:outline-none cursor-pointer"
              aria-label="Sort tickets"
            >
              <option value="NEWEST" className="bg-slate-950 text-slate-200">Newest First</option>
              <option value="OLDEST" className="bg-slate-950 text-slate-200">Oldest First</option>
              <option value="PRIORITY_DESC" className="bg-slate-950 text-slate-200">Priority: High to Low</option>
            </select>
          </div>

          <span className="ml-auto text-[11px] text-slate-500">
            Showing <strong className="text-slate-300">{filteredAndSorted.length}</strong> of {tickets.length} tickets
          </span>
        </div>
      </div>

      {/* Ticket List */}
      {loading ? (
        <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-2xl">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-400">Loading tickets...</p>
        </div>
      ) : filteredAndSorted.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No Tickets Found"
          description="There are currently no tickets matching the selected filters or query."
        />
      ) : (
        <div className="space-y-3">
          {filteredAndSorted.map((ticket) => (
            <div
              key={ticket.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-4 hover:border-slate-700 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
            >
              {/* Left: Info */}
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-mono font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-md">
                    {ticket.ticketNumber}
                  </span>
                  <Badge variant={priorityBadgeVariant[ticket.priority] || 'neutral'}>
                    {ticket.priority}
                  </Badge>
                  <Badge variant={statusBadgeVariant[ticket.status] || 'neutral'}>
                    {ticket.status?.replace('_', ' ')}
                  </Badge>
                  {ticket.category && (
                    <span className="text-[10px] text-slate-400 bg-slate-800 border border-slate-700/60 px-2 py-0.5 rounded-full">
                      {ticket.category.name}
                    </span>
                  )}
                </div>

                <h3 className="text-sm font-semibold text-white group-hover:text-blue-300 transition truncate">
                  {ticket.title}
                </h3>

                <div className="flex gap-3 text-xs text-slate-400 flex-wrap items-center">
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <span>{ticket.createdBy?.fullName || 'Requester'}</span>
                  </span>
                  {ticket.assignedTo ? (
                    <span className="flex items-center gap-1 text-blue-400">
                      <Wrench className="w-3.5 h-3.5" />
                      <span>{ticket.assignedTo.fullName}</span>
                    </span>
                  ) : (
                    <span className="text-amber-400 italic">Unassigned</span>
                  )}
                  {ticket.department && (
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-slate-500" />
                      <span>{ticket.department}</span>
                    </span>
                  )}
                  {ticket.createdBy?.department && (
                    <span className="flex items-center gap-1 text-slate-400">
                      <GraduationCap className="w-3.5 h-3.5 text-slate-500" />
                      <span>{ticket.createdBy.department}</span>
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>{fmt(ticket.createdAt)}</span>
                  </span>
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex sm:flex-col gap-2 shrink-0 sm:items-end">
                <Button
                  onClick={() => onViewTicket(ticket.id)}
                  variant="secondary"
                  size="sm"
                  icon={ArrowRight}
                >
                  View Details
                </Button>

                {ticket.status === 'OPEN' &&
                  !ticket.assignedTo &&
                  (user?.role === 'SUPPORT_AGENT' || user?.role === 'TEAM_LEAD') && (
                    <Button
                      onClick={() => claimTicket(ticket.id)}
                      variant="primary"
                      size="sm"
                      icon={UserCheck}
                    >
                      Claim Ticket
                    </Button>
                  )}

                {/* Assign / Reassign Button for TEAM_LEAD and SYSTEM_ADMINISTRATOR */}
                {['OPEN', 'IN_PROGRESS', 'REOPENED'].includes(ticket.status) &&
                  (user?.role === 'TEAM_LEAD' || user?.role === 'SYSTEM_ADMINISTRATOR') && (
                    <Button
                      onClick={() => handleOpenAssignModal(ticket)}
                      variant="secondary"
                      size="sm"
                      icon={ticket.assignedTo ? RefreshCw : UserPlus}
                    >
                      {ticket.assignedTo ? 'Reassign' : 'Assign'}
                    </Button>
                  )}

                {/* Inline Status Dropdown */}
                {['IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REOPENED'].includes(ticket.status) &&
                  (user?.role === 'TEAM_LEAD' ||
                    user?.role === 'SYSTEM_ADMINISTRATOR' ||
                    ticket.assignedTo?.id === user?.id) && (
                    <select
                      value={ticket.status}
                      onChange={(e) => handleStatusSelect(ticket, e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="IN_PROGRESS">IN PROGRESS</option>
                      <option value="RESOLVED">RESOLVED</option>
                      <option value="CLOSED">CLOSED</option>
                      <option value="REOPENED">REOPENED</option>
                    </select>
                  )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dedicated Resolve Ticket Modal (replaces window.prompt) */}
      {resolveTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Resolve Ticket</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">
                  {resolveTicket.ticketNumber} — <span className="text-slate-300 font-sans">{resolveTicket.title}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setResolveTicket(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {resolveError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium rounded-xl">
                {resolveError}
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Resolution Notes <span className="text-rose-400">*</span>
              </label>
              <textarea
                rows={4}
                value={resolveNotes}
                onChange={(e) => setResolveNotes(e.target.value)}
                placeholder="Describe the root cause, steps taken, and instructions provided to the requester..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
              <p className="text-[11px] text-slate-400">
                Resolution notes are mandatory and will be recorded in the ticket history and visible to the requester.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setResolveTicket(null)}
                disabled={resolveLoading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmResolve}
                disabled={resolveLoading || !resolveNotes.trim()}
              >
                {resolveLoading ? 'Resolving...' : 'Confirm Resolution'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Queue Assign / Reassign Modal for Team Leads & System Administrators */}
      {assignTicketTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-blue-400" />
                  <span>{assignTicketTarget.assignedTo ? 'Reassign Ticket' : 'Assign Ticket'}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">
                  {assignTicketTarget.ticketNumber} — <span className="text-slate-300 font-sans">{assignTicketTarget.title}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAssignTicketTarget(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {assignError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium rounded-xl">
                {assignError}
              </div>
            )}

            <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Department:</span>
                <span className="text-white font-semibold">{assignTicketTarget.department || 'Unassigned'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Current Assignee:</span>
                <span className="text-blue-300 font-medium">
                  {assignTicketTarget.assignedTo ? assignTicketTarget.assignedTo.fullName : 'Unassigned'}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Support Agent ({assignTicketTarget.department || 'Department'}) <span className="text-rose-400">*</span>
              </label>
              {availableAgents.length === 0 ? (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs rounded-xl">
                  No active support agents found in the {assignTicketTarget.department || ''} department.
                </div>
              ) : (
                <select
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  <option value="">-- Choose Support Agent --</option>
                  {availableAgents.map((ag) => (
                    <option key={ag.id} value={ag.id}>
                      {ag.fullName} (@{ag.username}) - {ag.department}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setAssignTicketTarget(null)}
                disabled={assignLoading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmAssign}
                disabled={assignLoading || !selectedAgentId || availableAgents.length === 0}
              >
                {assignLoading ? 'Assigning...' : 'Confirm Assignment'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
