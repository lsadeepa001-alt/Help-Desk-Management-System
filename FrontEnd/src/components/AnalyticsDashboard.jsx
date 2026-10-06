import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import {
  Download,
  Printer,
  BarChart3,
  Clock,
  CheckCircle2,
  Star,
  Tag,
  Zap,
  Activity,
  Award,
  ShieldCheck,
  Lightbulb,
  PenSquare,
  Edit3,
  Trash2,
  X,
  FileText,
} from 'lucide-react';

const API = 'http://localhost:8080/api';

const priorityColors = {
  CRITICAL: 'bg-rose-500',
  HIGH: 'bg-amber-500',
  MEDIUM: 'bg-indigo-500',
  LOW: 'bg-emerald-500',
};

const statusColors = {
  OPEN: 'bg-rose-500',
  IN_PROGRESS: 'bg-amber-500',
  RESOLVED: 'bg-emerald-500',
  CLOSED: 'bg-slate-500',
  REOPENED: 'bg-purple-500',
  CANCELLED: 'bg-rose-500',
  REJECTED: 'bg-red-600',
};

const actionColors = {
  TICKET_ASSIGNED: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
  TICKET_REASSIGNED: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  TICKET_CLAIMED: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  TICKET_ROUTED: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  TICKET_REROUTED: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
  STATUS_CHANGED: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
  TICKET_RESOLVED: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  TICKET_REOPENED: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  PUBLIC_COMMENT_ADDED: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
  INTERNAL_NOTE_ADDED: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
};

const actionLabels = {
  TICKET_ASSIGNED: 'Assigned',
  TICKET_REASSIGNED: 'Reassigned',
  TICKET_CLAIMED: 'Self-Claimed',
  TICKET_ROUTED: 'Routed',
  TICKET_REROUTED: 'Rerouted',
  STATUS_CHANGED: 'Status Changed',
  TICKET_RESOLVED: 'Resolved',
  TICKET_REOPENED: 'Reopened',
  PUBLIC_COMMENT_ADDED: 'Public Comment',
  INTERNAL_NOTE_ADDED: 'Internal Note',
};

export default function AnalyticsDashboard() {
  const [summary, setSummary] = useState(null);
  const [agentPerformance, setAgentPerformance] = useState([]);
  const [slaCompliance, setSlaCompliance] = useState(null);
  const [activityLogs, setActivityLogs] = useState([]);
  const [activitySummary, setActivitySummary] = useState(null);
  const [activityFilter, setActivityFilter] = useState({ action: '', department: '', search: '' });
  const [insights, setInsights] = useState([]);
  const [showInsightModal, setShowInsightModal] = useState(false);
  const [insightForm, setInsightForm] = useState({ id: null, title: '', content: '' });
  const [savingInsight, setSavingInsight] = useState(false);

  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const { showToast } = useToast();
  const { user } = useAuth();

  const canExportCsv = user?.role === 'MANAGER_EXECUTIVE' || user?.role === 'SYSTEM_ADMINISTRATOR';
  const canViewSla = user?.role === 'MANAGER_EXECUTIVE' || user?.role === 'SYSTEM_ADMINISTRATOR';
  const canViewExecutiveAnalytics = user?.role === 'MANAGER_EXECUTIVE' || user?.role === 'SYSTEM_ADMINISTRATOR';

  const fetchAnalyticsData = useCallback(async () => {
    setLoading(true);
    try {
      const requests = [
        axios.get(`${API}/analytics/summary`),
        axios.get(`${API}/analytics/agent-performance`),
      ];
      if (canViewExecutiveAnalytics) {
        requests.push(axios.get(`${API}/analytics/insights`));
      }
      const results = await Promise.all(requests);
      setSummary(results[0].data);
      setAgentPerformance(results[1].data);
      if (canViewExecutiveAnalytics) {
        setInsights(results[2]?.data || []);
      }
    } catch {
      showToast('Failed to load analytics data.', 'error');
    } finally {
      setLoading(false);
    }
  }, [canViewExecutiveAnalytics, showToast]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const response = await axios.get(`${API}/analytics/export/csv`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `university_helpdesk_report_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast('CSV report downloaded successfully.', 'success');
    } catch {
      showToast('Failed to export CSV report.', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handlePrintPdf = () => {
    window.print();
  };

  const handleOpenCreateInsight = () => {
    setInsightForm({ id: null, title: '', content: '' });
    setShowInsightModal(true);
  };

  const handleOpenEditInsight = (item) => {
    setInsightForm({ id: item.id, title: item.title || '', content: item.content || '' });
    setShowInsightModal(true);
  };

  const handleSaveInsight = async (e) => {
    e.preventDefault();
    if (!insightForm.content.trim()) {
      showToast('Insight commentary content cannot be empty.', 'error');
      return;
    }
    setSavingInsight(true);
    try {
      if (insightForm.id) {
        const res = await axios.put(`${API}/analytics/insights/${insightForm.id}`, {
          title: insightForm.title,
          content: insightForm.content,
        });
        setInsights((prev) => prev.map((item) => (item.id === insightForm.id ? res.data : item)));
        showToast('Management insight updated successfully!', 'success');
      } else {
        const res = await axios.post(`${API}/analytics/insights`, {
          title: insightForm.title,
          content: insightForm.content,
        });
        setInsights((prev) => [res.data, ...prev]);
        showToast('Management insight published successfully!', 'success');
      }
      setShowInsightModal(false);
      setInsightForm({ id: null, title: '', content: '' });
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save insight.', 'error');
    } finally {
      setSavingInsight(false);
    }
  };

  const handleDeleteInsight = async (id) => {
    if (!window.confirm('Are you sure you want to delete this management insight?')) return;
    try {
      await axios.delete(`${API}/analytics/insights/${id}`);
      setInsights((prev) => prev.filter((item) => item.id !== id));
      showToast('Management insight deleted.', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete insight.', 'error');
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-slate-400 text-sm">Computing analytics & performance metrics...</p>
      </div>
    );
  }

  const total = summary?.totalTickets || 0;
  const resolutionRate = total > 0 ? Math.round(((summary?.resolvedTickets || 0) / total) * 100) : 0;
  const activeBacklog = (summary?.openTickets || 0) + (summary?.inProgressTickets || 0);

  const filteredLogs = activityLogs.filter((log) => {
    if (activityFilter.action && log.action !== activityFilter.action) return false;
    if (activityFilter.department &&
        log.actorDepartment?.toLowerCase() !== activityFilter.department.toLowerCase()) {
      return false;
    }
    if (activityFilter.search) {
      const q = activityFilter.search.toLowerCase();
      const matchActor = log.actorName?.toLowerCase().includes(q);
      const matchTicket = log.ticketNumber?.toLowerCase().includes(q) || log.ticketTitle?.toLowerCase().includes(q);
      const matchDetails = log.details?.toLowerCase().includes(q);
      if (!matchActor && !matchTicket && !matchDetails) return false;
    }
    return true;
  });

  return (
    <div className="space-y-8 animate-fade-in print:text-black print:bg-white print:p-0">

      {/* ── Page Header & Action Buttons ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <span className="inline-block px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-xs font-semibold uppercase tracking-wider mb-2">
            Performance Overview
          </span>
          <h2 className="text-2xl font-bold text-white tracking-tight">Analytics & Reporting</h2>
          <p className="text-slate-400 text-xs mt-1">Real-time system health, operational bottlenecks, and agent performance reviews.</p>
        </div>

        <div className="flex gap-3">
          {canExportCsv && (
            <button
              onClick={handleExportCsv}
              disabled={exporting}
              className="px-4 py-2.5 bg-emerald-600/90 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{exporting ? 'Generating CSV...' : 'Export CSV Report'}</span>
            </button>
          )}

          <button
            onClick={handlePrintPdf}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-blue-600/20"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / Save PDF</span>
          </button>
        </div>
      </div>

      {/* ── Print-only Header ── */}
      <div className="hidden print:block mb-6 border-b pb-4">
        <h1 className="text-2xl font-bold text-black">University Help Desk — System Analytics Report</h1>
        <p className="text-xs text-gray-600">Generated on {new Date().toLocaleString()}</p>
      </div>

      {/* ── Executive Summary KPI Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Total Volume */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-2 print:border-gray-300 print:bg-gray-50">
          <div className="flex items-center justify-between text-slate-400 print:text-gray-700">
            <span className="text-xs font-bold uppercase tracking-wider">Total Volume</span>
            <BarChart3 className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-3xl font-extrabold text-white print:text-black">{total}</div>
          <p className="text-[11px] text-slate-400">Total tickets logged in system</p>
        </div>

        {/* Resolution Rate */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-2 print:border-gray-300 print:bg-gray-50">
          <div className="flex items-center justify-between text-slate-400 print:text-gray-700">
            <span className="text-xs font-bold uppercase tracking-wider">Resolution Rate</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-400 print:text-emerald-700">{resolutionRate}%</div>
          <p className="text-[11px] text-slate-400">{summary?.resolvedTickets || 0} of {total} tickets resolved</p>
        </div>

        {/* Active Backlog */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-2 print:border-gray-300 print:bg-gray-50">
          <div className="flex items-center justify-between text-slate-400 print:text-gray-700">
            <span className="text-xs font-bold uppercase tracking-wider">Active Backlog</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold text-amber-400 print:text-amber-700">{activeBacklog}</div>
          <p className="text-[11px] text-slate-400">{summary?.openTickets || 0} Open, {summary?.inProgressTickets || 0} In Progress</p>
        </div>

        {/* CSAT Satisfaction */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-2 print:border-gray-300 print:bg-gray-50">
          <div className="flex items-center justify-between text-slate-400 print:text-gray-700">
            <span className="text-xs font-bold uppercase tracking-wider">CSAT Score</span>
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
          </div>
          <div className="text-3xl font-extrabold text-yellow-400 print:text-yellow-700">
            {summary?.avgCsatRating ? `${summary.avgCsatRating} / 5.0` : 'N/A'}
          </div>
          <p className="text-[11px] text-slate-400">
            {summary?.satisfactionRatePercentage ? `${summary.satisfactionRatePercentage}% satisfaction rate` : 'No feedback ratings yet'}
          </p>
        </div>
      </div>

      {/* ── Breakdown Charts / Progress Columns ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {/* Category Breakdown */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4 print:border-gray-300 print:bg-gray-50">
          <h3 className="font-bold text-sm text-white flex items-center gap-2 print:text-black">
            <Tag className="w-4 h-4 text-blue-400" />
            <span>Category Distribution</span>
          </h3>
          <div className="space-y-3">
            {Object.entries(summary?.categoryDistribution || {}).map(([cat, count]) => {
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={cat} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium text-slate-300 print:text-gray-800">
                    <span>{cat}</span>
                    <span>{count} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden print:bg-gray-200">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Priority Breakdown */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4 print:border-gray-300 print:bg-gray-50">
          <h3 className="font-bold text-sm text-white flex items-center gap-2 print:text-black">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Priority Breakdown</span>
          </h3>
          <div className="space-y-3">
            {Object.entries(summary?.priorityDistribution || {}).map(([prio, count]) => {
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={prio} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium text-slate-300 print:text-gray-800">
                    <span className="font-semibold">{prio}</span>
                    <span>{count} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden print:bg-gray-200">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${priorityColors[prio] || 'bg-blue-500'}`}
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Status Breakdown & Resolution Speed */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4 print:border-gray-300 print:bg-gray-50">
          <h3 className="font-bold text-sm text-white flex items-center gap-2 print:text-black">
            <Activity className="w-4 h-4 text-sky-400" />
            <span>Status Breakdown</span>
          </h3>
          <div className="space-y-3">
            {Object.entries(summary?.statusDistribution || {}).map(([st, count]) => {
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={st} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium text-slate-300 print:text-gray-800">
                    <span className="font-semibold">{st.replace('_', ' ')}</span>
                    <span>{count} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden print:bg-gray-200">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${statusColors[st] || 'bg-slate-500'}`}
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Avg Resolution Speed:</span>
            <span className="font-bold text-blue-400 print:text-blue-800 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{summary?.avgResolutionTimeHours ? `${summary.avgResolutionTimeHours} hrs` : 'N/A'}</span>
            </span>
          </div>
        </div>
      </div>



      {/* ── Support Agent Leaderboard Table ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden print:border-gray-300">
        <div className="p-5 border-b border-slate-800 bg-slate-900 flex items-center justify-between print:bg-gray-100">
          <h3 className="font-bold text-white text-sm flex items-center gap-2 print:text-black">
            <Award className="w-4 h-4 text-amber-400" />
            <span>Support Agent Performance Leaderboard</span>
          </h3>
          <span className="text-xs text-slate-400 font-semibold">{agentPerformance.length} Active Staff</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px] print:bg-gray-200 print:text-black">
                <th className="py-3 px-4 font-bold">Rank</th>
                <th className="py-3 px-4 font-bold">Agent Name</th>
                <th className="py-3 px-4 font-bold">Department</th>
                <th className="py-3 px-4 font-bold text-center">Assigned</th>
                <th className="py-3 px-4 font-bold text-center">Resolved</th>
                <th className="py-3 px-4 font-bold text-center">Resolution %</th>
                <th className="py-3 px-4 font-bold text-center">CSAT Avg</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200 print:divide-gray-200 print:text-black">
              {agentPerformance.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-500">No support agent data available.</td>
                </tr>
              ) : (
                agentPerformance.map((agent, index) => {
                  const resPct = agent.assignedTicketsCount > 0
                    ? Math.round((agent.resolvedTicketsCount / agent.assignedTicketsCount) * 100)
                    : 0;

                  return (
                    <tr key={agent.agentId} className="hover:bg-slate-800/50 transition">
                      <td className="py-3 px-4 font-bold text-blue-400">#{index + 1}</td>
                      <td className="py-3 px-4 font-semibold text-white print:text-black">
                        {agent.agentName}
                        <span className="block text-[10px] text-slate-400 font-normal">{agent.email}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-300 print:text-gray-700">{agent.department}</td>
                      <td className="py-3 px-4 text-center font-bold">{agent.assignedTicketsCount}</td>
                      <td className="py-3 px-4 text-center font-bold text-emerald-400 print:text-emerald-700">
                        {agent.resolvedTicketsCount}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 bg-slate-950 rounded-full font-extrabold text-[11px] print:bg-gray-100">
                          {resPct}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-extrabold text-yellow-400 print:text-yellow-700">
                        {agent.avgCsatRating > 0 ? (
                          <span className="inline-flex items-center gap-1 justify-center">
                            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                            <span>{agent.avgCsatRating}</span>
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>


      {/* ── Management Strategic Insights & Commentary Section ── */}
      {canViewExecutiveAnalytics && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden p-6 space-y-6 print:border-gray-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-400" />
                <span>Management Strategic Insights & Commentary</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Executive analysis, operational bottleneck observations, and leadership action items.
              </p>
            </div>
            <button
              onClick={handleOpenCreateInsight}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-blue-600/20 self-start sm:self-auto"
            >
              <PenSquare className="w-3.5 h-3.5" />
              <span>Publish Strategic Insight</span>
            </button>
          </div>

          {/* Insights Cards Feed */}
          {insights.length === 0 ? (
            <div className="text-center py-10 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
              <FileText className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">No strategic insights published yet.</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Executive managers and administrators can publish observations, SLA bottleneck analysis, and operational directives here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {insights.map((item) => {
                const isAuthor = user?.id === item.authorId;
                const isAdmin = user?.role === 'SYSTEM_ADMINISTRATOR';
                const canModify = isAuthor || isAdmin;

                const formattedDate = item.createdAt
                  ? new Date(item.createdAt).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '—';

                return (
                  <div
                    key={item.id}
                    className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4 hover:border-slate-700 transition shadow-lg"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-blue-600/30 border border-blue-500/40 flex items-center justify-center font-bold text-blue-300 text-xs shadow">
                            {item.authorName?.charAt(0) || 'M'}
                          </div>
                          <div>
                            <span className="font-bold text-white text-xs block">{item.authorName}</span>
                            <span className="text-[10px] text-slate-400">
                              {item.authorRole?.replace('_', ' ')} {item.department ? `• ${item.department}` : ''}
                            </span>
                          </div>
                        </div>

                        {canModify && (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleOpenEditInsight(item)}
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-semibold transition flex items-center gap-1"
                              title="Edit insight"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => handleDeleteInsight(item.id)}
                              className="p-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 rounded text-[11px] font-semibold transition"
                              title="Delete insight"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {item.title && (
                        <h4 className="font-bold text-sm text-blue-300 pt-1">
                          {item.title}
                        </h4>
                      )}

                      <p className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                        {item.content}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-500">
                      <span>{formattedDate}</span>
                      {item.edited && (
                        <span className="text-amber-400 font-medium">● Edited</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Add / Edit Insight Modal Dialog ── */}
      {showInsightModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-400" />
                <span>{insightForm.id ? 'Edit Strategic Insight' : 'Publish Strategic Insight'}</span>
              </h3>
              <button
                onClick={() => setShowInsightModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveInsight} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Insight Title (Optional)
                </label>
                <input
                  type="text"
                  maxLength={200}
                  value={insightForm.title}
                  onChange={(e) => setInsightForm({ ...insightForm, title: e.target.value })}
                  placeholder="e.g. Q3 IT Resolution Velocity Analysis"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-slate-300">
                    Observation & Commentary <span className="text-rose-400">*</span>
                  </label>
                  <span className="text-[10px] text-slate-500">
                    {insightForm.content.length} / 4000
                  </span>
                </div>
                <textarea
                  required
                  rows={6}
                  maxLength={4000}
                  value={insightForm.content}
                  onChange={(e) => setInsightForm({ ...insightForm, content: e.target.value })}
                  placeholder="Document SLA bottleneck trends, agent workload shifts, recurring category failures, or strategic actions..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-700/60">
                <button
                  type="button"
                  onClick={() => setShowInsightModal(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingInsight || !insightForm.content.trim()}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-blue-600/30 disabled:opacity-50"
                >
                  {savingInsight && (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  <span>{insightForm.id ? 'Save Changes' : 'Publish Insight'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
