import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import {
  Ticket,
  RefreshCw,
  Search,
  X,
  AlertCircle,
  Inbox,
  MapPin,
  ArrowRight,
  User,
  Filter,
} from 'lucide-react';
import Badge from './ui/Badge';
import Button from './ui/Button';
import EmptyState from './ui/EmptyState';

const API_URL = 'http://localhost:8080/api/tickets';

const statusBadgeVariant = {
  OPEN: 'info',
  IN_PROGRESS: 'sky',
  RESOLVED: 'success',
  CLOSED: 'neutral',
  REOPENED: 'warning',
  CANCELLED: 'error',
  REJECTED: 'error',
};

const priorityBadgeVariant = {
  URGENT: 'error',
  CRITICAL: 'error',
  HIGH: 'warning',
  MEDIUM: 'warning',
  LOW: 'neutral',
};

export default function TicketList({ refreshTrigger, onViewTicket, filterUserId }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await axios.get(`${API_URL}/categories`);
        if (Array.isArray(res.data)) {
          setCategories(res.data);
        }
      } catch {
        // silently fallback
      }
    };
    fetchCategories();
  }, []);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(API_URL);
      setTickets(response.data);
    } catch (err) {
      console.error('Error fetching tickets:', err);
      setError(
        'Unable to load tickets from the backend. Please check network connectivity or backend server.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets, refreshTrigger]);

  const handleClearFilters = () => {
    setFilterStatus('ALL');
    setSearchTerm('');
    setFilterCategoryId('');
    setDateFrom('');
    setDateTo('');
  };

  const hasActiveFilters =
    filterStatus !== 'ALL' ||
    searchTerm.trim() !== '' ||
    filterCategoryId !== '' ||
    dateFrom !== '' ||
    dateTo !== '';

  const filteredTickets = tickets.filter((t) => {
    const matchesUser = filterUserId ? t.createdBy?.id === filterUserId : true;

    const matchesStatus = filterStatus === 'ALL' || t.status === filterStatus;

    if (filterCategoryId && String(t.category?.id) !== String(filterCategoryId)) {
      return false;
    }

    if (dateFrom) {
      const ticketDate = new Date(t.createdAt).setHours(0, 0, 0, 0);
      const fromDate = new Date(dateFrom).setHours(0, 0, 0, 0);
      if (ticketDate < fromDate) return false;
    }
    if (dateTo) {
      const ticketDate = new Date(t.createdAt).setHours(23, 59, 59, 999);
      const toDate = new Date(dateTo).setHours(23, 59, 59, 999);
      if (ticketDate > toDate) return false;
    }

    const matchesSearch =
      t.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.ticketNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesUser && matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Ticket className="w-5 h-5 text-blue-400" />
            <span>Submitted Helpdesk Tickets</span>
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Real-time feed from central university service dispatch
          </p>
        </div>
        <Button
          onClick={fetchTickets}
          variant="secondary"
          size="sm"
          icon={RefreshCw}
          loading={loading}
        >
          Refresh Feed
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-xl space-y-3.5">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search tickets by title, number, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-xs"
            />
          </div>

          {/* Status Pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 hide-scrollbar">
            {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REOPENED', 'CANCELLED', 'REJECTED'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
                  filterStatus === st
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                {st === 'ALL' ? 'All' : st.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Extended Filters */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800 text-xs text-slate-300">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-400 text-[11px] uppercase tracking-wider font-semibold">Category:</span>
            <select
              value={filterCategoryId}
              onChange={(e) => setFilterCategoryId(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name} ({cat.department})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-[11px] uppercase tracking-wider font-semibold">From:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <span className="text-slate-400 text-[11px] uppercase tracking-wider font-semibold">To:</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-rose-300 rounded-lg transition border border-rose-500/30 text-xs font-semibold flex items-center gap-1 ml-auto"
            >
              <X className="w-3 h-3" />
              <span>Clear Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 animate-pulse space-y-3">
              <div className="h-4 bg-slate-800 rounded w-1/3" />
              <div className="h-6 bg-slate-800 rounded w-3/4" />
              <div className="h-12 bg-slate-800/60 rounded w-full" />
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-6 text-center space-y-3">
          <div className="text-rose-400 text-sm font-semibold flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            <span>Connection Error</span>
          </div>
          <p className="text-slate-300 text-xs max-w-lg mx-auto">{error}</p>
          <Button onClick={fetchTickets} variant="danger" size="sm">
            Retry Connection
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredTickets.length === 0 && (
        <EmptyState
          icon={Inbox}
          title="No Tickets Found"
          description={
            searchTerm || filterStatus !== 'ALL'
              ? 'No tickets match your selected filters.'
              : 'There are currently no tickets logged in this queue.'
          }
        />
      )}

      {/* Ticket Cards Grid */}
      {!loading && !error && filteredTickets.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTickets.map((ticket) => (
            <div
              key={ticket.id}
              className="bg-slate-900 hover:bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 transition duration-200 shadow-lg flex flex-col justify-between group"
            >
              <div className="space-y-2.5">
                {/* Top Header */}
                <div className="flex justify-between items-start gap-2">
                  <span className="text-xs font-mono font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-md">
                    {ticket.ticketNumber || `TICK-${ticket.id}`}
                  </span>
                  <div className="flex gap-1.5 flex-wrap justify-end">
                    <Badge variant={priorityBadgeVariant[ticket.priority] || 'neutral'}>
                      {ticket.priority || 'MEDIUM'}
                    </Badge>
                    <Badge variant={statusBadgeVariant[ticket.status] || 'neutral'}>
                      {(ticket.status || 'OPEN').replace('_', ' ')}
                    </Badge>
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-sm font-bold text-white group-hover:text-blue-300 transition">
                  {ticket.title}
                </h3>

                {/* Description */}
                <p className="text-slate-400 text-xs line-clamp-2 leading-relaxed">
                  {ticket.description}
                </p>

                {/* Category chip */}
                {ticket.category && (
                  <span className="inline-block text-[10px] bg-slate-800 text-slate-400 border border-slate-700/60 px-2 py-0.5 rounded-full">
                    {ticket.category.name}
                  </span>
                )}
              </div>

              {/* Footer */}
              <div className="mt-4 pt-3 border-t border-slate-800">
                <div className="flex flex-wrap justify-between items-center text-xs text-slate-400 gap-2 mb-3">
                  <div className="flex items-center gap-1 text-[11px]">
                    <MapPin className="w-3 h-3 text-slate-500" />
                    <span>{ticket.location || 'University Campus'}</span>
                  </div>
                  {ticket.createdBy && (
                    <div className="flex items-center gap-1.5 text-slate-300 text-[11px]">
                      <div className="w-4 h-4 rounded-full bg-blue-600/30 text-blue-300 flex items-center justify-center text-[9px] font-bold">
                        {(ticket.createdBy.fullName || ticket.createdBy.username || 'U')[0].toUpperCase()}
                      </div>
                      <span>{ticket.createdBy.fullName || ticket.createdBy.username}</span>
                    </div>
                  )}
                </div>

                {/* View Details Button */}
                {onViewTicket && (
                  <Button
                    onClick={() => onViewTicket(ticket.id)}
                    variant="secondary"
                    size="sm"
                    className="w-full justify-center"
                    icon={ArrowRight}
                  >
                    View Details
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
