import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import CSATModal from './CSATModal';

const API = 'http://localhost:8080/api';

const statusColors = {
  OPEN: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  IN_PROGRESS: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  RESOLVED: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  CLOSED: 'bg-slate-500/20 text-slate-400 border-slate-500/40',
  REOPENED: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  CANCELLED: 'bg-rose-500/20 text-rose-300 border-rose-500/40 line-through',
};

const CATEGORIES = [
  { id: 1, name: 'Network & Wi-Fi' },
  { id: 2, name: 'LMS & Student Portal' },
  { id: 3, name: 'Hardware & Lab Equipment' },
  { id: 4, name: 'Software & Licensing' },
  { id: 5, name: 'Account & Security' },
];

const priorityColors = {
  LOW: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
  MEDIUM: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  HIGH: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
  URGENT: 'bg-red-500/20 text-red-300 border-red-500/40',
  CRITICAL: 'bg-rose-600/30 text-rose-300 border-rose-600/50',
};

const roleColors = {
  SYSTEM_ADMINISTRATOR: 'bg-rose-500/20 text-rose-300',
  MANAGER_EXECUTIVE: 'bg-amber-500/20 text-amber-300',
  TEAM_LEAD: 'bg-purple-500/20 text-purple-300',
  SUPPORT_AGENT: 'bg-blue-500/20 text-blue-300',
  KNOWLEDGE_MANAGER: 'bg-emerald-500/20 text-emerald-300',
  LECTURER: 'bg-teal-500/20 text-teal-300',
  STUDENT: 'bg-indigo-500/20 text-indigo-300',
};

const STAFF_ROLES = ['SUPPORT_AGENT', 'TEAM_LEAD', 'SYSTEM_ADMINISTRATOR'];

const getApiErrorMessage = (error) => {
  if (!error) return 'An unknown error occurred.';
  const responseData = error.response?.data;
  if (typeof responseData === 'string' && responseData.trim()) return responseData.trim();
  return (
    responseData?.message ||
    responseData?.detail ||
    responseData?.error ||
    error.message ||
    'Request failed.'
  );
};

export default function TicketDetails({ ticketId, onBack }) {
  const { user, isAuthenticated } = useAuth();
  const [ticket, setTicket] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [resolutionNote, setResolutionNote] = useState('');
  const [showResolveInput, setShowResolveInput] = useState(false);
  const [showCsatModal, setShowCsatModal] = useState(false);
  const [csatSubmitted, setCsatSubmitted] = useState(false);
  const [isInternalNote, setIsInternalNote] = useState(false);

  const isStaff = isAuthenticated && STAFF_ROLES.includes(user?.role);
  const isAdmin = isAuthenticated && user?.role === 'SYSTEM_ADMINISTRATOR';
  const isTeamLead = isAuthenticated && user?.role === 'TEAM_LEAD';
  const isSupportAgent = isAuthenticated && user?.role === 'SUPPORT_AGENT';
  const isAgent = isStaff;
  const isTicketCreator = isAuthenticated && ticket?.createdBy?.id === user?.id;
  const isTerminal = ticket?.status === 'CANCELLED' || ticket?.status === 'REJECTED';
  const isMine = isAuthenticated && ticket?.assignedTo?.id === user?.id;

  const sameDept = ticket?.department && user?.department &&
    ticket.department.trim().toLowerCase() === user.department.trim().toLowerCase();
  const isMatchingAssignedAgent = isSupportAgent && isMine && sameDept &&
    ['IN_PROGRESS', 'REOPENED'].includes(ticket?.status);

  const [attachments, setAttachments] = useState([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [attachmentError, setAttachmentError] = useState('');
  const [availableAgents, setAvailableAgents] = useState([]);
  const [selectedReassignAgentId, setSelectedReassignAgentId] = useState('');
  const [selectedRouteDepartment, setSelectedRouteDepartment] = useState('IT');

  // Proposal-aligned attachment upload: Creator on own OPEN ticket, or Assigned Agent on active matching ticket
  const canUploadAttachment = (isTicketCreator && ticket?.status === 'OPEN') || isMatchingAssignedAgent;

  const [myFeedback, setMyFeedback] = useState(null);
  const [csatMode, setCsatMode] = useState('create');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({ title: '', description: '', priority: 'MEDIUM', location: '', categoryId: '1' });
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [reopenReason, setReopenReason] = useState('');

  // Show CSAT to ticket submitter (non-agent users) when ticket is resolved
  const canRateCsat = isAuthenticated && isTicketCreator && !csatSubmitted && !myFeedback;

  const fetchTicket = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/tickets/${ticketId}`);
      setTicket(res.data);
    } catch {
      setStatusMsg('Failed to load ticket.');
    }
  }, [ticketId]);

  const fetchComments = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/tickets/${ticketId}/comments`);
      setComments(res.data);
    } catch {
      // silently fail
    }
  }, [ticketId]);

  const fetchFeedback = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await axios.get(`${API}/feedback/ticket/${ticketId}`);
      if (Array.isArray(res.data)) {
        const found = res.data.find(f => f.submittedBy?.id === user?.id);
        if (found) {
          setMyFeedback(found);
          setCsatSubmitted(true);
        } else {
          setMyFeedback(null);
          setCsatSubmitted(false);
        }
      }
    } catch {
      // silently fail
    }
  }, [ticketId, user?.id]);

  const fetchAttachments = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/tickets/${ticketId}/attachments`);
      setAttachments(Array.isArray(res.data) ? res.data : []);
    } catch {
      // silently fail
    }
  }, [ticketId]);

  const fetchAgents = useCallback(async () => {
    if (!isTeamLead && !isAdmin) return;
    try {
      const res = await axios.get(`${API}/users/agents`);
      setAvailableAgents(Array.isArray(res.data) ? res.data : []);
    } catch {
      // silently fail
    }
  }, [isTeamLead, isAdmin]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchTicket(), fetchComments(), fetchFeedback(), fetchAttachments(), fetchAgents()]).finally(() => setLoading(false));
  }, [fetchTicket, fetchComments, fetchFeedback, fetchAttachments, fetchAgents]);

  const handleUploadAttachments = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setAttachmentError('');
    setUploadingAttachment(true);
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    try {
      await axios.post(`${API}/tickets/${ticketId}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      fetchAttachments();
    } catch (err) {
      setAttachmentError(getApiErrorMessage(err));
    } finally {
      setUploadingAttachment(false);
      e.target.value = '';
    }
  };

  const handleDownloadAttachment = async (attachmentId, originalFileName) => {
    try {
      const response = await axios.get(`${API}/tickets/${ticketId}/attachments/${attachmentId}/download`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', originalFileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download attachment: ' + getApiErrorMessage(err));
    }
  };

  const handleDeleteAttachment = async (attachmentId) => {
    if (!window.confirm('Are you sure you want to delete this attachment?')) return;
    try {
      await axios.delete(`${API}/tickets/${ticketId}/attachments/${attachmentId}`);
      fetchAttachments();
    } catch (err) {
      alert('Failed to delete attachment: ' + getApiErrorMessage(err));
    }
  };

  const handleClaimTicket = async () => {
    try {
      const res = await axios.put(`${API}/tickets/${ticketId}/claim`);
      setTicket(res.data);
      setStatusMsg('✅ Ticket claimed! You are now working on this ticket.');
    } catch (err) {
      setStatusMsg('Failed to claim ticket: ' + getApiErrorMessage(err));
    }
  };

  const handleReassignTicket = async (agentId) => {
    try {
      const res = await axios.put(`${API}/tickets/${ticketId}/assign`, { agentId: Number(agentId) });
      setTicket(res.data);
      setStatusMsg('Ticket assigned successfully.');
      setSelectedReassignAgentId('');
    } catch (err) {
      setStatusMsg('Failed to assign ticket: ' + getApiErrorMessage(err));
    }
  };

  // Auto-trigger CSAT popup for creator when viewing a RESOLVED ticket if not yet rated
  useEffect(() => {
    if (ticket && ticket.status === 'RESOLVED' && isTicketCreator && !myFeedback && !csatSubmitted) {
      const timer = setTimeout(() => {
        setCsatMode('create');
        setShowCsatModal(true);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [ticket?.status, isTicketCreator, myFeedback, csatSubmitted]);

  const changeStatus = async (newStatus, notes = '') => {
    if (newStatus === 'RESOLVED' && (!notes || !notes.trim())) {
      setStatusMsg('Resolution notes are required when resolving a ticket.');
      return;
    }
    try {
      const body = { status: newStatus };
      if (notes) body.resolutionNotes = notes.trim();
      const res = await axios.put(`${API}/tickets/${ticketId}/status`, body);
      setTicket(res.data);
      setShowResolveInput(false);
      setResolutionNote('');
      setStatusMsg(`Ticket status updated to ${newStatus}.`);
      // Trigger CSAT modal for ticket submitter when resolved
      if (newStatus === 'RESOLVED' && canRateCsat) {
        setCsatMode('create');
        setTimeout(() => setShowCsatModal(true), 600);
      }
    } catch (err) {
      setStatusMsg('Status update failed: ' + getApiErrorMessage(err));
    }
  };

  const handleConfirmResolution = async () => {
    try {
      const res = await axios.put(`${API}/tickets/${ticketId}/confirm`);
      setTicket(res.data);
      setStatusMsg('✅ Resolution confirmed! Ticket has been closed.');
      if (!myFeedback) {
        setCsatMode('create');
        setTimeout(() => setShowCsatModal(true), 400);
      }
    } catch (err) {
      setStatusMsg('Failed to confirm resolution: ' + getApiErrorMessage(err));
    }
  };

  const handleReopenTicket = async (e) => {
    e.preventDefault();
    if (!reopenReason.trim()) return;
    try {
      const res = await axios.put(`${API}/tickets/${ticketId}/reopen`, { reason: reopenReason.trim() });
      setTicket(res.data);
      setShowReopenModal(false);
      setReopenReason('');
      setStatusMsg('🔄 Ticket reopened successfully.');
      fetchComments();
    } catch (err) {
      setStatusMsg('Failed to reopen ticket: ' + getApiErrorMessage(err));
    }
  };

  const handleCancelTicket = async () => {
    if (!window.confirm('Are you sure you want to cancel this ticket? The ticket record will be retained.')) return;
    try {
      const res = await axios.delete(`${API}/tickets/${ticketId}`);
      if (res.data) setTicket(res.data);
      setStatusMsg('Ticket cancelled successfully.');
    } catch (err) {
      setStatusMsg('Failed to cancel ticket: ' + getApiErrorMessage(err));
    }
  };

  const handlePermanentDelete = async () => {
    if (!window.confirm('Permanently delete this ticket and all of its attachments, comments, feedback, and notifications? This cannot be undone.')) return;
    try {
      await axios.delete(`${API}/tickets/${ticketId}/permanent`);
      onBack?.();
    } catch (err) {
      setStatusMsg('Failed to permanently delete ticket: ' + getApiErrorMessage(err));
    }
  };


  const handleRouteTicket = async () => {
    try {
      const res = await axios.put(`${API}/tickets/${ticketId}/route`, { department: selectedRouteDepartment });
      setTicket(res.data);
      setStatusMsg(`Ticket routed to ${res.data.department}.`);
    } catch (err) {
      setStatusMsg('Failed to route ticket: ' + getApiErrorMessage(err));
    }
  };

  const openEditModal = () => {
    setEditFormData({
      title: ticket.title || '',
      description: ticket.description || '',
      priority: ticket.priority || 'MEDIUM',
      location: ticket.location || '',
      categoryId: ticket.category?.id ? String(ticket.category.id) : '1',
    });
    setShowEditModal(true);
  };

  const handleUpdateTicket = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.put(`${API}/tickets/${ticketId}`, editFormData);
      setTicket(res.data);
      setShowEditModal(false);
      setStatusMsg('✅ Ticket updated successfully.');
    } catch (err) {
      setStatusMsg('Failed to update ticket: ' + getApiErrorMessage(err));
    }
  };

  const handleWithdrawFeedback = async () => {
    if (!myFeedback) return;
    if (!window.confirm('Are you sure you want to withdraw your rating? You can submit a new rating afterwards.')) return;
    try {
      await axios.delete(`${API}/feedback/${myFeedback.id}`);
      setMyFeedback(null);
      setCsatSubmitted(false);
      setStatusMsg('Feedback withdrawn successfully. You may submit a new rating.');
    } catch (err) {
      setStatusMsg('Failed to withdraw feedback: ' + getApiErrorMessage(err));
    }
  };

  // Also auto-show CSAT banner for submitter on page load if ticket is already resolved
  const submitterSeesResolved = isTicketCreator
    && (ticket?.status === 'RESOLVED' || ticket?.status === 'CLOSED')
    && !myFeedback && !csatSubmitted;

  const postComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !isAuthenticated) return;
    setSubmitting(true);
    try {
      await axios.post(`${API}/tickets/${ticketId}/comments`, {
        content: commentText,
        authorId: user.id,
        isInternal: isAgent ? isInternalNote : false,
      });
      setCommentText('');
      setIsInternalNote(false);
      await fetchComments();
    } catch (err) {
      setStatusMsg('Failed to post comment: ' + getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const fmt = (dt) => {
    if (!dt) return '—';
    return new Date(dt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-slate-400">
      <svg className="w-8 h-8 animate-spin mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      Loading ticket...
    </div>
  );

  if (!ticket) return (
    <div className="text-center py-20 text-rose-400">Ticket not found.</div>
  );

  const canManageLifecycle = !isTerminal && (
    isTeamLead ||
    isSupportAgent ||
    isAdmin
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back Button */}
      <button onClick={onBack}
        className="flex items-center gap-2 text-sm text-slate-400 hover:text-indigo-300 transition">
        ← Back to Tickets
      </button>

      {/* ── Ticket Header Card ── */}
      <div className="bg-slate-800/90 border border-slate-700/70 rounded-2xl p-6 shadow-xl backdrop-blur-md space-y-5">

        {/* Top row: number + badges */}
        <div className="flex flex-wrap gap-3 items-start justify-between">
          <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-lg">
            {ticket.ticketNumber}
          </span>
          <div className="flex gap-2 flex-wrap">
            <span className={`text-[11px] font-semibold px-3 py-1 rounded-full uppercase tracking-wider border ${priorityColors[ticket.priority] || ''}`}>
              {ticket.priority}
            </span>
            <span className={`text-[11px] font-semibold px-3 py-1 rounded-full uppercase tracking-wider border ${statusColors[ticket.status] || ''}`}>
              {ticket.status?.replace('_', ' ')}
            </span>
          </div>
        </div>

        <h1 className="text-2xl font-extrabold text-white tracking-tight">{ticket.title}</h1>
        <p className="text-slate-300 text-sm leading-relaxed">{ticket.description}</p>

        {/* Metadata grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-700/50 text-xs text-slate-400">
          <div>
            <div className="text-slate-500 uppercase tracking-wider mb-1">Technical Section</div>
            <div className="text-slate-200 font-semibold text-sm text-indigo-300">
              {ticket.department || <span className="text-slate-500 italic font-normal">Awaiting routing</span>}
            </div>
          </div>
          <div>
            <div className="text-slate-500 uppercase tracking-wider mb-1">Category</div>
            <div className="text-slate-200 font-medium">{ticket.category?.name || '—'}</div>
          </div>
          <div>
            <div className="text-slate-500 uppercase tracking-wider mb-1">Requester Department</div>
            <div className="text-slate-200 font-medium">{ticket.createdBy?.department || '—'}</div>
          </div>
          <div>
            <div className="text-slate-500 uppercase tracking-wider mb-1">Location</div>
            <div className="text-slate-200 font-medium">{ticket.location || '—'}</div>
          </div>
          <div>
            <div className="text-slate-500 uppercase tracking-wider mb-1">Submitted By</div>
            <div className="text-slate-200 font-medium">{ticket.createdBy?.fullName || '—'}</div>
          </div>
          <div>
            <div className="text-slate-500 uppercase tracking-wider mb-1">Assigned Agent</div>
            <div className="text-slate-200 font-medium">{ticket.assignedTo?.fullName || <span className="text-amber-400/80 italic font-normal">Unassigned</span>}</div>
          </div>
          <div>
            <div className="text-slate-500 uppercase tracking-wider mb-1">Created</div>
            <div className="text-slate-200 font-medium">{fmt(ticket.createdAt)}</div>
          </div>
          {ticket.resolvedAt && (
            <div>
              <div className="text-slate-500 uppercase tracking-wider mb-1">Resolved</div>
              <div className="text-purple-300 font-medium">{fmt(ticket.resolvedAt)}</div>
            </div>
          )}
        </div>

        {ticket.resolutionNotes && (
          <div className="bg-purple-900/20 border border-purple-500/30 rounded-xl p-4">
            <div className="text-xs text-purple-400 font-semibold uppercase tracking-wider mb-1">Resolution Notes</div>
            <p className="text-slate-200 text-sm">{ticket.resolutionNotes}</p>
          </div>
        )}

        {/* Fallback route for legacy tickets missing a department */}
        {isAdmin && !ticket.department && !isTerminal && (
          <div className="pt-3 border-t border-slate-700/50 space-y-2">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Route to Technical Section
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedRouteDepartment}
                onChange={(e) => setSelectedRouteDepartment(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-sm rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="IT">IT</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Security">Security</option>
              </select>
              <button
                onClick={handleRouteTicket}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition"
              >
                Route Ticket
              </button>
            </div>
          </div>
        )}

        {/* Operational lifecycle actions for Staff (Team Lead, Support Agent, Admin) */}
        {canManageLifecycle && (
          <div className="pt-3 border-t border-slate-700/50 flex flex-wrap items-center gap-2">
            {/* Team Lead or Admin assignment dropdown for active stages */}
            {(isTeamLead || isAdmin) && ['OPEN', 'IN_PROGRESS', 'REOPENED'].includes(ticket.status) && availableAgents.length > 0 && (
              <div className="flex items-center gap-1.5">
                <select
                  value={selectedReassignAgentId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedReassignAgentId(val);
                    if (val) handleReassignTicket(val);
                  }}
                  className="bg-slate-900 border border-slate-700 text-xs rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">👤 {ticket.assignedTo ? 'Reassign Agent...' : 'Assign Agent...'}</option>
                  {availableAgents.map((ag) => (
                    <option key={ag.id} value={ag.id}>
                      {ag.fullName || ag.username} {ag.department ? `(${ag.department})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Support Agent self-claim for unassigned OPEN ticket */}
            {isSupportAgent && ticket.status === 'OPEN' && !ticket.assignedTo && (
              <button
                onClick={handleClaimTicket}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
              >
                ▶ Claim Ticket
              </button>
            )}

            {/* Start / Mark In Progress if assigned to me in OPEN */}
            {ticket.status === 'OPEN' && isMine && (
              <button
                onClick={() => changeStatus('IN_PROGRESS')}
                className="px-3.5 py-1.5 bg-blue-600/80 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition flex items-center gap-1.5"
              >
                ▶ Start Progress
              </button>
            )}

            {/* Resolve with mandatory notes */}
            {['IN_PROGRESS', 'REOPENED'].includes(ticket.status) && (isMine || isTeamLead || isAdmin) && !showResolveInput && (
              <button
                onClick={() => setShowResolveInput(true)}
                className="px-3.5 py-1.5 bg-purple-600/80 hover:bg-purple-500 text-white text-xs font-semibold rounded-lg transition flex items-center gap-1.5"
              >
                ✅ Resolve Ticket
              </button>
            )}

            {/* Close directly by Staff / Admin */}
            {ticket.status === 'RESOLVED' && (isTeamLead || isAdmin) && (
              <button
                onClick={() => changeStatus('CLOSED')}
                className="px-3 py-1.5 bg-slate-600/80 hover:bg-slate-500 text-white text-xs font-semibold rounded-lg transition"
              >
                🔒 Close
              </button>
            )}

            {/* Reopen by Staff / Admin */}
            {['RESOLVED', 'CLOSED'].includes(ticket.status) && (isTeamLead || isAdmin) && (
              <button
                onClick={() => setShowReopenModal(true)}
                className="px-3 py-1.5 bg-amber-600/80 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg transition"
              >
                🔄 Reopen
              </button>
            )}

            {/* System Administrator permanent delete button */}
            {isAdmin && (
              <button
                onClick={handlePermanentDelete}
                className="px-3.5 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/40 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 ml-auto"
                title="Permanently remove ticket and all related records"
              >
                🗑️ Permanent Delete
              </button>
            )}
          </div>
        )}

        {/* Creator actions on OPEN tickets: Edit and Soft-Cancel */}
        {isTicketCreator && ticket.status === 'OPEN' && (
          <div className="pt-3 border-t border-slate-700/50 flex flex-wrap gap-2">
            <button
              onClick={openEditModal}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition flex items-center gap-1.5 shadow-md shadow-indigo-500/20"
            >
              ✏️ Edit Ticket
            </button>
            <button
              onClick={handleCancelTicket}
              className="px-3.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold rounded-lg transition flex items-center gap-1.5"
            >
              ⏸️ Cancel Ticket
            </button>
          </div>
        )}

        {/* Admin permanent delete on terminal tickets */}
        {isAdmin && isTerminal && (
          <div className="pt-3 border-t border-slate-700/50 flex justify-end">
            <button
              onClick={handlePermanentDelete}
              className="px-3.5 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/40 text-xs font-semibold rounded-lg transition flex items-center gap-1.5"
              title="Permanently remove ticket and all related records"
            >
              🗑️ Permanent Delete
            </button>
          </div>
        )}

        {/* Resolve with notes input */}
        {showResolveInput && (
          <div className="space-y-2">
            <textarea
              value={resolutionNote}
              onChange={e => setResolutionNote(e.target.value)}
              rows={3}
              placeholder="Add mandatory resolution details (describe how the issue was resolved)... *"
              className="w-full bg-slate-900/90 border border-purple-500/40 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm"
            />
            <div className="flex gap-2">
              <button
                disabled={!resolutionNote.trim()}
                onClick={() => changeStatus('RESOLVED', resolutionNote)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition"
              >
                Confirm Resolution
              </button>
              <button
                onClick={() => setShowResolveInput(false)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-semibold rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {statusMsg && (
          <p className="text-rose-400 text-xs font-medium">{statusMsg}</p>
        )}
      </div>

      {/* ── Attachments Subsystem Card ── */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">📎</span>
            <div>
              <h3 className="text-base font-bold text-white">
                Ticket Attachments ({attachments.length})
              </h3>
              <p className="text-xs text-slate-400">
                Uploaded diagnostic logs, documents, and screenshots (Max 10MB each)
              </p>
            </div>
          </div>

          {canUploadAttachment && (
            <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md transition disabled:opacity-50">
              <span>{uploadingAttachment ? '⏳ Uploading...' : '➕ Upload File'}</span>
              <input
                type="file"
                multiple
                disabled={uploadingAttachment}
                accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                onChange={handleUploadAttachments}
                className="hidden"
              />
            </label>
          )}
        </div>

        {attachmentError && (
          <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-lg">
            ⚠️ {attachmentError}
          </p>
        )}

        {attachments.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-xs border border-dashed border-slate-700/60 rounded-xl">
            No attachments uploaded for this ticket.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {attachments.map((att) => {
              const isMyAttachment = att.uploadedById != null ? att.uploadedById === user?.id : att.uploaderName === user?.username;
              const canDelete =
                isAdmin ||
                (isTicketCreator && ticket?.status === 'OPEN' && isMyAttachment) ||
                (isMatchingAssignedAgent && isMyAttachment);

              return (
                <div
                  key={att.id}
                  className="bg-slate-900/80 border border-slate-700/60 rounded-xl p-3.5 flex flex-col justify-between gap-2 hover:border-slate-600 transition group"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span className="text-xl mt-0.5">
                      {att.contentType?.startsWith('image/')
                        ? '🖼️'
                        : att.contentType?.includes('pdf')
                        ? '📄'
                        : '📁'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-slate-200 truncate" title={att.originalFileName}>
                        {att.originalFileName}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {att.formattedFileSize} • By {att.uploaderName}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px]">
                    <button
                      onClick={() => handleDownloadAttachment(att.id, att.originalFileName)}
                      className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 transition"
                    >
                      ⬇️ Download
                    </button>
                    {canDelete && (
                      <button
                        onClick={() => handleDeleteAttachment(att.id)}
                        className="text-rose-400 hover:text-rose-300 transition"
                        title="Delete file"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Resolution Verification Banner (For ticket creator when ticket is RESOLVED) ── */}
      {isTicketCreator && ticket.status === 'RESOLVED' && (
        <div className="bg-gradient-to-r from-purple-900/30 via-slate-800/90 to-indigo-900/30 border border-purple-500/40 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-xl flex-shrink-0 mt-0.5">
              ⚖️
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-white">Verify Ticket Resolution</h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                The IT support team has marked this ticket as resolved. Please review the resolution notes.
                If satisfied, please confirm resolution to close the ticket. If the issue persists, you can reopen it with details.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 pt-1">
            <button
              onClick={handleConfirmResolution}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition flex items-center gap-2"
            >
              ✅ Confirm Resolution & Close
            </button>
            <button
              onClick={() => setShowReopenModal(true)}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold rounded-xl border border-amber-500/30 transition flex items-center gap-2"
            >
              🔄 Reopen Ticket
            </button>
          </div>
        </div>
      )}

      {/* ── Ticket Closed - Creator Reopen Option ── */}
      {isTicketCreator && ticket.status === 'CLOSED' && (
        <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
          <div>
            <h4 className="text-sm font-semibold text-white">Issue still unresolved?</h4>
            <p className="text-xs text-slate-400">If this issue has recurred, you can reopen this ticket with updated details.</p>
          </div>
          <button
            onClick={() => setShowReopenModal(true)}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-amber-300 text-xs font-bold rounded-xl border border-amber-500/30 transition flex items-center gap-2 flex-shrink-0"
          >
            🔄 Reopen Ticket
          </button>
        </div>
      )}

      {/* ── Submitted CSAT Feedback Card ── */}
      {myFeedback && (
        <div className="bg-slate-800/90 border border-emerald-500/30 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">⭐</span>
              <div>
                <h3 className="text-base font-bold text-white">Your Service Rating</h3>
                <p className="text-xs text-slate-400">Feedback submitted for this ticket's resolution</p>
              </div>
            </div>
            {/* Within 24-hour edit/withdraw buttons */}
            {new Date() - new Date(myFeedback.createdAt) < 24 * 60 * 60 * 1000 ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setCsatMode('edit');
                    setShowCsatModal(true);
                  }}
                  className="px-3 py-1.5 bg-slate-700/80 hover:bg-slate-600 text-slate-200 text-xs font-semibold rounded-lg border border-slate-600 transition flex items-center gap-1.5"
                >
                  ✏️ Edit Feedback
                </button>
                <button
                  onClick={handleWithdrawFeedback}
                  className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold rounded-lg border border-rose-500/30 transition flex items-center gap-1.5"
                >
                  🗑️ Withdraw
                </button>
              </div>
            ) : (
              <span className="text-xs text-slate-500 italic bg-slate-900/60 px-2.5 py-1 rounded-lg">
                🔒 Rating locked (24-hour edit window expired)
              </span>
            )}
          </div>

          <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-700/60 space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex text-amber-400 text-lg">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span key={star}>{star <= myFeedback.rating ? '★' : '☆'}</span>
                ))}
              </div>
              <span className="text-xs font-bold text-slate-300 ml-1">
                {myFeedback.rating} of 5 Stars
              </span>
              <span className="text-xs text-slate-500 ml-auto">
                {fmt(myFeedback.createdAt)}
              </span>
            </div>
            {myFeedback.comments && (
              <p className="text-sm text-slate-300 italic pt-1 border-t border-slate-800">
                "{myFeedback.comments}"
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Comment Thread ── */}
      <div className="bg-slate-800/90 border border-slate-700/70 rounded-2xl p-6 shadow-xl backdrop-blur-md space-y-5">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          💬 Discussion Thread
          <span className="text-xs font-normal bg-slate-700/60 text-slate-400 px-2 py-0.5 rounded-full ml-1">
            {comments.filter(c => !c.isInternal || isAgent).length} {comments.filter(c => !c.isInternal || isAgent).length === 1 ? 'reply' : 'replies'}
          </span>
        </h2>

        {/* Comments list (internal notes hidden from students & lecturers) */}
        <div className="space-y-4">
          {comments.filter(c => !c.isInternal || isAgent).length === 0 && (
            <div className="text-center py-8 text-slate-500 text-sm italic">
              No comments yet — be the first to reply.
            </div>
          )}
          {comments.filter(c => !c.isInternal || isAgent).map(c => (
            <div key={c.id} className="flex gap-3 group">
              <div className="w-9 h-9 rounded-full bg-indigo-600/80 text-white flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                {(c.author?.fullName || c.author?.username || 'U')[0].toUpperCase()}
              </div>
              <div className={`flex-1 rounded-xl px-4 py-3 border ${c.isInternal ? 'bg-amber-950/20 border-amber-500/40' : 'bg-slate-900/60 border-slate-700/50'}`}>
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="text-sm font-semibold text-slate-100">{c.author?.fullName || c.author?.username}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${roleColors[c.author?.role] || 'text-slate-400'}`}>
                    {c.author?.role?.replace('_', ' ')}
                  </span>
                  {c.isInternal && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">🔒 Staff Internal Note</span>
                  )}
                  <span className="text-xs text-slate-500 ml-auto">{fmt(c.createdAt)}</span>
                </div>
                <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{c.content}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Reply box */}
        {isAuthenticated ? (
          <form onSubmit={postComment} className="space-y-3 pt-2 border-t border-slate-700/50">
            <div className="flex gap-3">
              <div className="w-9 h-9 rounded-full bg-indigo-600/80 text-white flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                {(user?.fullName || user?.username || 'U')[0].toUpperCase()}
              </div>
              <textarea
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder={isInternalNote ? "Write an internal staff note (visible only to support agents)..." : "Write a reply..."}
                rows={3}
                className={`flex-1 bg-slate-900/90 border rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 text-sm transition resize-none ${isInternalNote ? 'border-amber-500/60 focus:ring-amber-500/50' : 'border-slate-700 focus:ring-indigo-500/50'}`}
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              {isAgent ? (
                <label className="flex items-center gap-2 text-xs text-amber-400 hover:text-amber-300 font-medium cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isInternalNote}
                    onChange={e => setIsInternalNote(e.target.checked)}
                    className="rounded border-slate-700 text-amber-500 focus:ring-amber-500 bg-slate-900"
                  />
                  <span>🔒 Post as internal staff note (hidden from student)</span>
                </label>
              ) : <div />}
              <button type="submit" disabled={submitting || !commentText.trim()}
                className={`px-5 py-2 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition flex items-center gap-2 ${isInternalNote ? 'bg-amber-600 hover:bg-amber-500' : 'bg-indigo-600 hover:bg-indigo-500'}`}>
                {submitting ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                ) : isInternalNote ? '🔒' : '✉️'} {isInternalNote ? 'Post Internal Note' : 'Post Reply'}
              </button>
            </div>
          </form>
        ) : (
          <div className="pt-2 border-t border-slate-700/50 text-center text-sm text-slate-500">
            <span>Sign in to post a reply.</span>
          </div>
        )}
      </div>

      {/* ── CSAT Banner (for submitter, when ticket is already RESOLVED) ── */}
      {submitterSeesResolved && (
        <div className="bg-gradient-to-r from-amber-900/30 via-slate-800/80 to-orange-900/30 border border-amber-500/30 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⭐</span>
            <div>
              <div className="text-sm font-bold text-amber-300">Your ticket has been resolved!</div>
              <div className="text-xs text-slate-400">Share your feedback to help us improve our support service.</div>
            </div>
          </div>
          <button
            onClick={() => setShowCsatModal(true)}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-900 text-sm font-bold rounded-xl transition shadow-md whitespace-nowrap">
            Rate Your Experience →
          </button>
        </div>
      )}

      {/* ── CSAT Modal ── */}
      {showCsatModal && ticket && (
        <CSATModal
          ticket={ticket}
          userId={user?.id}
          mode={csatMode}
          existingFeedback={myFeedback}
          onClose={() => setShowCsatModal(false)}
          onSubmitted={(rating, savedFb) => {
            setMyFeedback(savedFb);
            setCsatSubmitted(true);
            setStatusMsg(`✅ Thank you! Your ${rating}★ rating has been recorded.`);
          }}
        />
      )}

      {/* ── Edit Ticket Modal (Creator on OPEN ticket) ── */}
      {showEditModal && ticket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>✏️ Edit Ticket</span>
                <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                  {ticket.ticketNumber}
                </span>
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateTicket} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.title}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Description *
                </label>
                <textarea
                  rows={4}
                  required
                  value={editFormData.description}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Category
                  </label>
                  <select
                    value={editFormData.categoryId}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, categoryId: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Priority
                  </label>
                  <select
                    value={editFormData.priority}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, priority: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="URGENT">URGENT</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Location / Lab (Optional)
                </label>
                <input
                  type="text"
                  value={editFormData.location}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="e.g. Lab 03, Library Floor 2"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition shadow-lg shadow-indigo-500/20"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Reopen Ticket Modal ── */}
      {showReopenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>🔄 Reopen Ticket</span>
              </h3>
              <button
                onClick={() => setShowReopenModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Please explain why this issue is still unresolved so the IT support team can follow up effectively:
            </p>

            <form onSubmit={handleReopenTicket} className="space-y-4">
              <textarea
                rows={3}
                required
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                placeholder="Describe what is still not working..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none"
              />

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowReopenModal(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!reopenReason.trim()}
                  className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition shadow-lg shadow-amber-500/20"
                >
                  Reopen Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
