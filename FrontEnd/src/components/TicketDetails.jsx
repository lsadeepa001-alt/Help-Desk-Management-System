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
};

const priorityColors = {
  LOW: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
  MEDIUM: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  HIGH: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
  URGENT: 'bg-red-500/20 text-red-300 border-red-500/40',
  CRITICAL: 'bg-rose-600/30 text-rose-300 border-rose-600/50',
};

const roleColors = {
  ADMIN: 'bg-rose-500/20 text-rose-300',
  DEPARTMENT_MANAGER: 'bg-amber-500/20 text-amber-300',
  SUPPORT_AGENT: 'bg-blue-500/20 text-blue-300',
  LECTURER: 'bg-emerald-500/20 text-emerald-300',
  STUDENT: 'bg-indigo-500/20 text-indigo-300',
};

const AGENT_ROLES = ['SUPPORT_AGENT', 'DEPARTMENT_MANAGER', 'ADMIN'];

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

  const isAgent = isAuthenticated && AGENT_ROLES.includes(user?.role);
  // Show CSAT to ticket submitter (non-agent users) when ticket is resolved
  const canRateCsat = isAuthenticated && !isAgent && !csatSubmitted;

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

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchTicket(), fetchComments()]).finally(() => setLoading(false));
  }, [fetchTicket, fetchComments]);

  const changeStatus = async (newStatus, notes = '') => {
    try {
      const body = { status: newStatus };
      if (notes) body.resolutionNotes = notes;
      const res = await axios.put(`${API}/tickets/${ticketId}/status`, body);
      setTicket(res.data);
      setShowResolveInput(false);
      setResolutionNote('');
      // Trigger CSAT modal for ticket submitter when resolved
      if (newStatus === 'RESOLVED' && canRateCsat) {
        setTimeout(() => setShowCsatModal(true), 600);
      }
    } catch {
      setStatusMsg('Status update failed.');
    }
  };

  // Also auto-show CSAT banner for submitter on page load if ticket is already resolved
  const submitterSeesResolved = isAuthenticated && !isAgent
    && ticket?.status === 'RESOLVED' && !csatSubmitted;

  const assignToMe = async () => {
    try {
      const res = await axios.put(`${API}/tickets/${ticketId}/assign`, { agentId: user.id });
      setTicket(res.data);
    } catch {
      setStatusMsg('Assignment failed.');
    }
  };

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
    } catch {
      setStatusMsg('Failed to post comment.');
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

  const isMine = isAuthenticated && ticket.assignedTo?.id === user?.id;
  const canAct = isAgent;

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
            <div className="text-slate-500 uppercase tracking-wider mb-1">Category</div>
            <div className="text-slate-200 font-medium">{ticket.category?.name || '—'}</div>
          </div>
          <div>
            <div className="text-slate-500 uppercase tracking-wider mb-1">Department</div>
            <div className="text-slate-200 font-medium">{ticket.department || ticket.createdBy?.department || '—'}</div>
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
            <div className="text-slate-500 uppercase tracking-wider mb-1">Assigned To</div>
            <div className="text-slate-200 font-medium">{ticket.assignedTo?.fullName || <span className="text-slate-500 italic">Unassigned</span>}</div>
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

        {/* Action Buttons – Agent only */}
        {canAct && (
          <div className="pt-3 border-t border-slate-700/50 flex flex-wrap gap-2">
            {!isMine && ticket.status !== 'CLOSED' && ticket.status !== 'RESOLVED' && (
              <button onClick={assignToMe}
                className="px-3 py-1.5 bg-indigo-600/80 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition">
                📋 Assign to Me
              </button>
            )}
            {ticket.status === 'OPEN' && (
              <button onClick={() => changeStatus('IN_PROGRESS')}
                className="px-3 py-1.5 bg-blue-600/80 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition">
                ▶ Mark In Progress
              </button>
            )}
            {(ticket.status === 'IN_PROGRESS' || ticket.status === 'OPEN') && !showResolveInput && (
              <button onClick={() => setShowResolveInput(true)}
                className="px-3 py-1.5 bg-purple-600/80 hover:bg-purple-500 text-white text-xs font-semibold rounded-lg transition">
                ✅ Resolve
              </button>
            )}
            {ticket.status === 'RESOLVED' && (
              <button onClick={() => changeStatus('CLOSED')}
                className="px-3 py-1.5 bg-slate-600/80 hover:bg-slate-500 text-white text-xs font-semibold rounded-lg transition">
                🔒 Close
              </button>
            )}
            {(ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') && (
              <button onClick={() => changeStatus('REOPENED')}
                className="px-3 py-1.5 bg-amber-600/80 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg transition">
                🔄 Reopen
              </button>
            )}
          </div>
        )}

        {/* Resolve with notes input */}
        {showResolveInput && (
          <div className="space-y-2">
            <textarea value={resolutionNote} onChange={e => setResolutionNote(e.target.value)} rows={3}
              placeholder="Add optional resolution notes..."
              className="w-full bg-slate-900/90 border border-purple-500/40 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm" />
            <div className="flex gap-2">
              <button onClick={() => changeStatus('RESOLVED', resolutionNote)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-lg transition">
                Confirm Resolution
              </button>
              <button onClick={() => setShowResolveInput(false)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-semibold rounded-lg transition">
                Cancel
              </button>
            </div>
          </div>
        )}

        {statusMsg && (
          <p className="text-rose-400 text-xs font-medium">{statusMsg}</p>
        )}
      </div>

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
          onClose={() => setShowCsatModal(false)}
          onSubmitted={(rating) => {
            setCsatSubmitted(true);
            setStatusMsg(`✅ Thank you for your ${rating}★ rating!`);
          }}
        />
      )}
    </div>
  );
}

