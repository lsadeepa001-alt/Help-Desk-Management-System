import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API = 'http://localhost:8080/api';

const statusColors = {
  OPEN: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  IN_PROGRESS: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  RESOLVED: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  CLOSED: 'bg-slate-500/20 text-slate-400 border-slate-500/40',
  REOPENED: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  CANCELLED: 'bg-rose-500/20 text-rose-300 border-rose-500/40 line-through',
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tickets, setTickets] = useState([]);
  const [kbArticles, setKbArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, open: 0, inProgress: 0, resolved: 0, closed: 0, avgCsatRating: 0 });

  const role = user?.role || 'STUDENT';
  const isEndUser = role === 'STUDENT' || role === 'LECTURER';
  const isSupportAgent = role === 'SUPPORT_AGENT';
  const isTeamLead = role === 'TEAM_LEAD';
  const isManager = role === 'MANAGER_EXECUTIVE';
  const isKm = role === 'KNOWLEDGE_MANAGER';
  const isAdmin = role === 'SYSTEM_ADMINISTRATOR';
  const isStaff = isSupportAgent || isTeamLead || isAdmin;

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      try {
        if (isEndUser) {
          const res = await axios.get(`${API}/tickets/my-tickets`);
          const data = Array.isArray(res.data) ? res.data : [];
          setTickets(data);
          setStats({
            total: data.length,
            open: data.filter((t) => t.status === 'OPEN').length,
            inProgress: data.filter((t) => t.status === 'IN_PROGRESS' || t.status === 'REOPENED').length,
            resolved: data.filter((t) => t.status === 'RESOLVED').length,
            closed: data.filter((t) => t.status === 'CLOSED').length,
          });
        } else if (isStaff) {
          const res = await axios.get(`${API}/tickets`);
          const data = Array.isArray(res.data) ? res.data : [];
          setTickets(data);
          setStats({
            total: data.length,
            open: data.filter((t) => t.status === 'OPEN').length,
            inProgress: data.filter((t) => t.status === 'IN_PROGRESS' || t.status === 'REOPENED').length,
            resolved: data.filter((t) => t.status === 'RESOLVED').length,
            closed: data.filter((t) => t.status === 'CLOSED').length,
          });
        } else if (isManager) {
          const res = await axios.get(`${API}/analytics/summary`);
          const d = res.data || {};
          setStats({
            total: d.totalTickets || 0,
            open: d.openTickets || 0,
            inProgress: d.inProgressTickets || 0,
            resolved: d.resolvedTickets || 0,
            closed: 0,
            avgCsatRating: d.avgCsatRating || 0,
          });
        } else if (isKm) {
          const res = await axios.get(`${API}/kb/articles`);
          const data = Array.isArray(res.data) ? res.data : [];
          const totalViews = data.reduce((sum, article) => sum + (Number(article.viewCount) || 0), 0);
          setKbArticles(data);
          setStats({
            total: data.length,
            open: data.filter((article) => article.isFaq).length,
            inProgress: totalViews,
            resolved: data.length > 0 ? Math.round(totalViews / data.length) : 0,
            closed: 0,
          });
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [isEndUser, isStaff, isManager, isKm]);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* ── Welcome Banner ── */}
      <div className="p-7 rounded-3xl bg-gradient-to-r from-indigo-900/50 via-slate-800/90 to-purple-900/50 border border-slate-700/60 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="flex items-center gap-2.5">
            <span className="px-3 py-1 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 rounded-full text-xs font-semibold uppercase tracking-wider">
              {role.replace(/_/g, ' ')} Workspace
            </span>
            {user?.department && (
              <span className="text-xs text-slate-400 bg-slate-900/60 px-2.5 py-1 rounded-full border border-slate-700/50">
                🏢 {user.department}
              </span>
            )}
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Welcome back, <span className="text-indigo-400">{user?.fullName || user?.username}</span>!
          </h1>
          <p className="text-slate-300 text-sm leading-relaxed">
            {isEndUser && "Submit IT support inquiries, track your active tickets, or access university knowledge base articles."}
            {isSupportAgent && "Manage your incoming ticket queue, inspect assigned issues, and record resolutions."}
            {isTeamLead && "Oversee ticket queues, assign and escalate incidents, and monitor agent service level metrics."}
            {isManager && "Review high-level resolution KPIs, customer satisfaction trends, and export analytical reports."}
            {isKm && "Curate university knowledge base articles, maintain self-service FAQs, and train chatbot responses."}
            {isAdmin && "System administration portal: control user privileges, staff accounts, and application settings."}
          </p>
        </div>
        <div className="absolute right-6 bottom-0 opacity-10 text-9xl pointer-events-none select-none">
          {isEndUser ? '🎓' : isSupportAgent ? '🛠️' : isTeamLead ? '👥' : isManager ? '👔' : isKm ? '📚' : '👑'}
        </div>
      </div>

      {/* ── KPI Stats Strip ── */}
      <div className={`grid grid-cols-2 ${isKm ? 'sm:grid-cols-4' : 'sm:grid-cols-5'} gap-4`}>
        {isKm ? [
          { label: 'Total Articles', value: stats.total, color: 'text-indigo-400', bg: 'bg-slate-800/80' },
          { label: 'FAQ Articles', value: stats.open, color: 'text-emerald-400', bg: 'bg-emerald-950/20 border-emerald-800/30' },
          { label: 'Total Views', value: stats.inProgress, color: 'text-amber-400', bg: 'bg-amber-950/20 border-amber-800/30' },
          { label: 'Average Views', value: stats.resolved, color: 'text-purple-400', bg: 'bg-purple-950/20 border-purple-800/30' },
        ].map((item, idx) => (
          <div key={idx} className={`${item.bg} border border-slate-700/60 rounded-2xl p-5 shadow-lg text-center backdrop-blur-md`}>
            <div className={`text-3xl font-extrabold ${item.color}`}>{loading ? '—' : item.value}</div>
            <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">{item.label}</div>
          </div>
        )) : [
          { label: isEndUser ? 'My Tickets' : 'Total Tickets', value: stats.total, color: 'text-indigo-400', bg: 'bg-slate-800/80' },
          { label: 'Open Queue', value: stats.open, color: 'text-emerald-400', bg: 'bg-emerald-950/20 border-emerald-800/30' },
          { label: 'In Progress', value: stats.inProgress, color: 'text-blue-400', bg: 'bg-blue-950/20 border-blue-800/30' },
          { label: 'Resolved', value: stats.resolved, color: 'text-purple-400', bg: 'bg-purple-950/20 border-purple-800/30' },
          { label: isManager ? 'CSAT Rating' : 'Closed', value: isManager ? (stats.avgCsatRating > 0 ? `${stats.avgCsatRating} / 5` : 'N/A') : stats.closed, color: 'text-cyan-400', bg: 'bg-cyan-950/20 border-cyan-800/30' },
        ].map((item, idx) => (
          <div key={idx} className={`${item.bg} border border-slate-700/60 rounded-2xl p-5 shadow-lg text-center backdrop-blur-md`}>
            <div className={`text-3xl font-extrabold ${item.color}`}>{loading ? '—' : item.value}</div>
            <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">{item.label}</div>
          </div>
        ))}
      </div>

      {/* ── Quick Action Shortcuts ── */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          ⚡ Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {isEndUser && (
            <>
              <Link
                to="/create"
                className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/60 hover:border-indigo-500/50 hover:bg-slate-800 transition group shadow-lg flex items-center gap-3.5"
              >
                <div className="w-11 h-11 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center text-xl group-hover:scale-110 transition">
                  ➕
                </div>
                <div>
                  <div className="font-bold text-white text-sm group-hover:text-indigo-300 transition">Create New Ticket</div>
                  <div className="text-xs text-slate-400">Request IT assistance</div>
                </div>
              </Link>
              <Link
                to="/my-tickets"
                className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/60 hover:border-blue-500/50 hover:bg-slate-800 transition group shadow-lg flex items-center gap-3.5"
              >
                <div className="w-11 h-11 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center text-xl group-hover:scale-110 transition">
                  🗂️
                </div>
                <div>
                  <div className="font-bold text-white text-sm group-hover:text-blue-300 transition">My Ticket History</div>
                  <div className="text-xs text-slate-400">Track current & past tickets</div>
                </div>
              </Link>
              <Link
                to="/kb"
                className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/60 hover:border-emerald-500/50 hover:bg-slate-800 transition group shadow-lg flex items-center gap-3.5"
              >
                <div className="w-11 h-11 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center text-xl group-hover:scale-110 transition">
                  📚
                </div>
                <div>
                  <div className="font-bold text-white text-sm group-hover:text-emerald-300 transition">Knowledge Base</div>
                  <div className="text-xs text-slate-400">Self-service guides & FAQs</div>
                </div>
              </Link>
            </>
          )}

          {isStaff && (
            <>
              <Link
                to="/tickets"
                className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/60 hover:border-indigo-500/50 hover:bg-slate-800 transition group shadow-lg flex items-center gap-3.5"
              >
                <div className="w-11 h-11 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center text-xl group-hover:scale-110 transition">
                  📋
                </div>
                <div>
                  <div className="font-bold text-white text-sm group-hover:text-indigo-300 transition">
                    {isTeamLead ? 'Team Ticket Queue' : 'All Tickets Feed'}
                  </div>
                  <div className="text-xs text-slate-400">Assign & resolve tickets</div>
                </div>
              </Link>
              <Link
                to="/csat"
                className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/60 hover:border-amber-500/50 hover:bg-slate-800 transition group shadow-lg flex items-center gap-3.5"
              >
                <div className="w-11 h-11 rounded-xl bg-amber-600/20 text-amber-400 flex items-center justify-center text-xl group-hover:scale-110 transition">
                  ⭐
                </div>
                <div>
                  <div className="font-bold text-white text-sm group-hover:text-amber-300 transition">CSAT Reviews</div>
                  <div className="text-xs text-slate-400">Customer feedback scores</div>
                </div>
              </Link>
            </>
          )}

          {(isTeamLead || isManager || isAdmin) && (
            <Link
              to="/analytics"
              className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/60 hover:border-purple-500/50 hover:bg-slate-800 transition group shadow-lg flex items-center gap-3.5"
            >
              <div className="w-11 h-11 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center text-xl group-hover:scale-110 transition">
                📊
              </div>
              <div>
                <div className="font-bold text-white text-sm group-hover:text-purple-300 transition">Reports & Analytics</div>
                <div className="text-xs text-slate-400">Resolution performance & KPIs</div>
              </div>
            </Link>
          )}

          {isManager && (
            <Link
              to="/csat"
              className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/60 hover:border-amber-500/50 hover:bg-slate-800 transition group shadow-lg flex items-center gap-3.5"
            >
              <div className="w-11 h-11 rounded-xl bg-amber-600/20 text-amber-400 flex items-center justify-center text-xl group-hover:scale-110 transition">
                ⭐
              </div>
              <div>
                <div className="font-bold text-white text-sm group-hover:text-amber-300 transition">CSAT & Feedback</div>
                <div className="text-xs text-slate-400">Campus service ratings</div>
              </div>
            </Link>
          )}

          {(isKm || isAdmin) && (
            <Link
              to="/knowledge-base/manage"
              className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/60 hover:border-emerald-500/50 hover:bg-slate-800 transition group shadow-lg flex items-center gap-3.5"
            >
              <div className="w-11 h-11 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center text-xl group-hover:scale-110 transition">
                📚
              </div>
              <div>
                <div className="font-bold text-white text-sm group-hover:text-emerald-300 transition">Manage Knowledge Base</div>
                <div className="text-xs text-slate-400">Author & organize articles</div>
              </div>
            </Link>
          )}

          {isAdmin && (
            <Link
              to="/admin/users"
              className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/60 hover:border-rose-500/50 hover:bg-slate-800 transition group shadow-lg flex items-center gap-3.5"
            >
              <div className="w-11 h-11 rounded-xl bg-rose-600/20 text-rose-400 flex items-center justify-center text-xl group-hover:scale-110 transition">
                👑
              </div>
              <div>
                <div className="font-bold text-white text-sm group-hover:text-rose-300 transition">User Management</div>
                <div className="text-xs text-slate-400">Role assignment & accounts</div>
              </div>
            </Link>
          )}
        </div>
      </div>

      {/* ── Role-Specific Bottom View ── */}
      {isKm ? (
        <div className="bg-slate-800/80 border border-slate-700/60 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Knowledge Base Articles</h2>
              <p className="text-xs text-slate-400 mt-0.5">Self-help articles and guides</p>
            </div>
            <Link
              to="/knowledge-base/manage"
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 hover:underline transition"
            >
              Manage Articles →
            </Link>
          </div>
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm">Loading articles...</div>
          ) : kbArticles.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">No articles available yet.</div>
          ) : (
            <div className="divide-y divide-slate-700/50">
              {kbArticles.slice(0, 5).map((a) => (
                <div
                  key={a.id}
                  onClick={() => navigate('/kb')}
                  className="py-3.5 flex items-center justify-between gap-3 hover:bg-slate-700/20 px-3 rounded-xl transition cursor-pointer group"
                >
                  <div className="space-y-1 min-w-0">
                    <h3 className="text-sm font-semibold text-white group-hover:text-indigo-300 transition truncate">
                      {a.title}
                    </h3>
                    <p className="text-xs text-slate-400 truncate">{a.category || 'General'}</p>
                  </div>
                  <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    {a.isFaq ? 'FAQ' : 'Article'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : isManager ? (
        <div className="bg-slate-800/80 border border-slate-700/60 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Executive Oversight & Reporting</h2>
              <p className="text-xs text-slate-400 mt-0.5">High-level help desk operational health and resolution trends</p>
            </div>
            <Link
              to="/analytics"
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 hover:underline transition"
            >
              Full Analytics Report →
            </Link>
          </div>
          <div className="p-6 bg-slate-900/50 rounded-2xl border border-slate-700/50 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-white font-semibold text-sm">Automated Performance Export</h3>
              <p className="text-slate-400 text-xs mt-1">Download complete CSV reports on resolution times, SLA compliance, and CSAT scores.</p>
            </div>
            <Link
              to="/analytics"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition shadow-md"
            >
              Open Analytics Portal
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-slate-800/80 border border-slate-700/60 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">
                {isEndUser ? 'My Recent Tickets' : 'Recent Support Queue'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {isEndUser ? 'Latest support requests submitted by your account' : 'Most recent tickets registered across departments'}
              </p>
            </div>
            <Link
              to={isEndUser ? '/my-tickets' : '/tickets'}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 hover:underline transition"
            >
              View All →
            </Link>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm">Loading tickets...</div>
          ) : tickets.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">No tickets found.</div>
          ) : (
            <div className="divide-y divide-slate-700/50">
              {tickets.slice(0, 5).map((t) => (
                <div
                  key={t.id}
                  onClick={() => navigate(`/tickets/${t.id}`)}
                  className="py-3.5 flex flex-wrap items-center justify-between gap-3 hover:bg-slate-700/20 px-3 rounded-xl transition cursor-pointer group"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                        {t.ticketNumber}
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusColors[t.status] || ''}`}>
                        {t.status?.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] text-slate-400">{t.priority}</span>
                    </div>
                    <h3 className="text-sm font-semibold text-white group-hover:text-indigo-300 transition truncate">
                      {t.title}
                    </h3>
                  </div>

                  <div className="text-right text-xs text-slate-400">
                    <div>{t.category?.name || t.department || 'General'}</div>
                    <div className="text-[11px] text-slate-500">
                      {t.createdAt ? new Date(t.createdAt).toLocaleDateString() : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
