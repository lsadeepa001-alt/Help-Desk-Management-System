import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:8080/api/tickets';

const statusColors = {
  OPEN: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  IN_PROGRESS: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  RESOLVED: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
  CLOSED: 'bg-slate-500/20 text-slate-400 border border-slate-500/30',
  REOPENED: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  CANCELLED: 'bg-rose-500/20 text-rose-400 border border-rose-500/30 line-through',
};

const priorityColors = {
  URGENT: 'bg-red-500/20 text-red-400 border border-red-500/30 font-bold',
  CRITICAL: 'bg-rose-600/30 text-rose-400 border border-rose-600/40 font-bold',
  HIGH: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
  MEDIUM: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  LOW: 'bg-slate-500/20 text-slate-300 border border-slate-500/30',
};

const TicketList = ({ refreshTrigger, onViewTicket, filterUserId }) => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchTickets = async () => {
    setLoading(true);
    setError(null);
    try {
      const endpoint = filterUserId ? `${API_URL}/my-tickets` : API_URL;
      const response = await axios.get(endpoint);
      setTickets(response.data);
    } catch (err) {
      console.error('Error fetching tickets:', err);
      setError('Failed to connect to backend server. Make sure Spring Boot is running on port 8080.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTickets(); }, [refreshTrigger]);

  const filteredTickets = tickets.filter(t => {
    const matchesUser = !filterUserId || t.createdBy?.id === filterUserId;
    const matchesStatus = filterStatus === 'ALL' || t.status === filterStatus;
    const matchesSearch =
      (t.title?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.ticketNumber?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.description?.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesUser && matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-800/80 p-5 rounded-2xl border border-slate-700/60 shadow-xl backdrop-blur-md">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>🎫</span> Submitted Helpdesk Tickets
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Real-time feed from <code className="text-indigo-400 bg-slate-900/80 px-2 py-0.5 rounded">http://localhost:8080/api/tickets</code>
          </p>
        </div>
        <button onClick={fetchTickets}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium rounded-xl transition shadow-md flex items-center gap-2">
          <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <input type="text" placeholder="Search tickets by title, number, or description..."
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-4 py-2.5 pl-10 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm" />
          <svg className="w-5 h-5 text-slate-500 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REOPENED', 'CANCELLED'].map(st => (
            <button key={st} onClick={() => setFilterStatus(st)}
              className={`px-3 py-2 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
                filterStatus === st
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200 border border-slate-700/50'
              }`}>
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="bg-slate-800/50 border border-slate-700/40 rounded-2xl p-5 animate-pulse space-y-3">
              <div className="h-4 bg-slate-700/60 rounded w-1/3" />
              <div className="h-6 bg-slate-700/80 rounded w-3/4" />
              <div className="h-12 bg-slate-700/40 rounded w-full" />
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center space-y-3">
          <div className="text-red-400 text-lg font-semibold flex items-center justify-center gap-2">
            <span>⚠️</span> Connection Error
          </div>
          <p className="text-slate-300 text-sm max-w-lg mx-auto">{error}</p>
          <button onClick={fetchTickets}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-medium rounded-lg transition">
            Retry Connection
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredTickets.length === 0 && (
        <div className="bg-slate-800/40 border border-slate-700/40 rounded-2xl p-10 text-center space-y-3">
          <div className="text-4xl">📭</div>
          <h3 className="text-lg font-medium text-slate-200">No Tickets Found</h3>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            {searchTerm || filterStatus !== 'ALL'
              ? 'No tickets match your current filters.'
              : 'No helpdesk tickets yet. Create one using the New Ticket form!'}
          </p>
        </div>
      )}

      {/* Ticket Cards Grid */}
      {!loading && !error && filteredTickets.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredTickets.map(ticket => (
            <div key={ticket.id}
              className="bg-slate-800/90 hover:bg-slate-800 border border-slate-700/70 hover:border-indigo-500/50 rounded-2xl p-6 transition duration-200 shadow-lg hover:shadow-2xl hover:shadow-indigo-500/10 flex flex-col justify-between group">
              <div className="space-y-3">
                {/* Top Header */}
                <div className="flex justify-between items-start gap-2">
                  <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-md">
                    {ticket.ticketNumber || `TICK-${ticket.id}`}
                  </span>
                  <div className="flex gap-2 flex-wrap justify-end">
                    <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider ${priorityColors[ticket.priority] || ''}`}>
                      {ticket.priority || 'MEDIUM'}
                    </span>
                    <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider ${statusColors[ticket.status] || ''}`}>
                      {(ticket.status || 'OPEN').replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-lg font-semibold text-white group-hover:text-indigo-300 transition">
                  {ticket.title}
                </h3>

                {/* Description */}
                <p className="text-slate-300 text-sm line-clamp-2 leading-relaxed">{ticket.description}</p>

                {/* Category chip */}
                {ticket.category && (
                  <span className="inline-block text-[10px] bg-slate-700/60 text-slate-400 px-2 py-0.5 rounded-full">
                    {ticket.category.name}
                  </span>
                )}
              </div>

              {/* Footer */}
              <div className="mt-5 pt-4 border-t border-slate-700/50">
                <div className="flex flex-wrap justify-between items-center text-xs text-slate-400 gap-2 mb-3">
                  <div className="flex items-center gap-1.5">
                    <span>📍</span>
                    <span>{ticket.location || 'University Campus'}</span>
                  </div>
                  {ticket.createdBy && (
                    <div className="flex items-center gap-1 text-slate-300">
                      <span className="w-5 h-5 rounded-full bg-indigo-600/80 text-white flex items-center justify-center text-[10px] font-bold">
                        {(ticket.createdBy.fullName || ticket.createdBy.username || 'U')[0].toUpperCase()}
                      </span>
                      <span>{ticket.createdBy.fullName || ticket.createdBy.username}</span>
                    </div>
                  )}
                </div>

                {/* View Details Button */}
                {onViewTicket && (
                  <button
                    onClick={() => onViewTicket(ticket.id)}
                    className="w-full py-2 bg-slate-700/60 hover:bg-indigo-600/70 text-slate-300 hover:text-white text-xs font-semibold rounded-xl transition duration-200 border border-slate-600/50 hover:border-indigo-500/50">
                    View Details & Discussion →
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TicketList;
