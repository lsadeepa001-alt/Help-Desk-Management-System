import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  Ticket,
  PlusCircle,
  BookOpen,
  BarChart3,
  Star,
  Users,
  Clock,
  CheckCircle,
  ArrowRight,
  Building2,
  FileText,
  TrendingUp,
} from 'lucide-react';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import LoadingState from '../components/ui/LoadingState';
import EmptyState from '../components/ui/EmptyState';

const API = 'http://localhost:8080/api';

const statusBadgeVariant = (status) => {
  switch (status) {
    case 'OPEN': return 'info';
    case 'IN_PROGRESS': return 'sky';
    case 'RESOLVED': return 'success';
    case 'CLOSED': return 'neutral';
    case 'REOPENED': return 'warning';
    case 'CANCELLED': return 'error';
    default: return 'neutral';
  }
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
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* ── Welcome Banner ── */}
      <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-blue-950/40 border border-slate-800 shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-300 rounded-md text-[11px] font-semibold uppercase tracking-wider">
              {role.replace(/_/g, ' ')} Workspace
            </span>
            {user?.department && (
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-300 bg-slate-800/80 px-2.5 py-0.5 rounded-md border border-slate-700/60 font-medium">
                <Building2 className="w-3.5 h-3.5 text-blue-400" />
                <span>{user.department}</span>
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Welcome back, <span className="text-blue-400 font-semibold">{user?.fullName || user?.username}</span>
          </h1>
          <p className="text-slate-300 text-sm leading-relaxed">
            {isEndUser && "Submit support inquiries, track your active tickets, or access university knowledge base articles."}
            {isSupportAgent && "Manage your incoming ticket queue, inspect assigned issues, and record verified resolutions."}
            {isTeamLead && "Oversee ticket queues, assign and escalate incidents, and monitor agent service level metrics."}
            {isManager && "Review operational resolution KPIs, customer satisfaction trends, and analytical reports."}
            {isKm && "Curate university knowledge base articles, maintain self-service FAQs, and support assistant content."}
            {isAdmin && "System administration portal: control user privileges, staff accounts, and application configuration."}
          </p>
        </div>
      </div>

      {/* ── KPI Stats Strip ── */}
      <div className={`grid grid-cols-2 ${isKm ? 'sm:grid-cols-4' : 'sm:grid-cols-5'} gap-4`}>
        {isKm ? [
          { label: 'Total Articles', value: stats.total, color: 'text-blue-400', icon: BookOpen },
          { label: 'FAQ Articles', value: stats.open, color: 'text-emerald-400', icon: FileText },
          { label: 'Total Views', value: stats.inProgress, color: 'text-amber-400', icon: TrendingUp },
          { label: 'Average Views', value: stats.resolved, color: 'text-sky-400', icon: BarChart3 },
        ].map((item, idx) => (
          <div key={idx} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm text-center">
            <div className="flex justify-center text-slate-500 mb-1">
              <item.icon className="w-4 h-4" />
            </div>
            <div className={`text-2xl sm:text-3xl font-extrabold ${item.color}`}>{loading ? '—' : item.value}</div>
            <div className="text-[11px] text-slate-400 mt-1 uppercase tracking-wider font-semibold">{item.label}</div>
          </div>
        )) : [
          { label: isEndUser ? 'My Tickets' : 'Total Tickets', value: stats.total, color: 'text-blue-400', icon: Ticket },
          { label: 'Open Queue', value: stats.open, color: 'text-emerald-400', icon: Clock },
          { label: 'In Progress', value: stats.inProgress, color: 'text-sky-400', icon: TrendingUp },
          { label: 'Resolved', value: stats.resolved, color: 'text-teal-400', icon: CheckCircle },
          { label: isManager ? 'CSAT Rating' : 'Closed', value: isManager ? (stats.avgCsatRating > 0 ? `${stats.avgCsatRating} / 5` : 'N/A') : stats.closed, color: 'text-amber-400', icon: isManager ? Star : CheckCircle },
        ].map((item, idx) => (
          <div key={idx} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm text-center">
            <div className="flex justify-center text-slate-500 mb-1">
              <item.icon className="w-4 h-4" />
            </div>
            <div className={`text-2xl sm:text-3xl font-extrabold ${item.color}`}>{loading ? '—' : item.value}</div>
            <div className="text-[11px] text-slate-400 mt-1 uppercase tracking-wider font-semibold">{item.label}</div>
          </div>
        ))}
      </div>

      {/* ── Quick Action Shortcuts ── */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {isEndUser && (
            <>
              <Link
                to="/create"
                className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-blue-500/40 transition group shadow-sm flex items-center gap-3.5"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold text-white text-sm group-hover:text-blue-300 transition">Create New Ticket</div>
                  <div className="text-xs text-slate-400">Request support assistance</div>
                </div>
              </Link>
              <Link
                to="/my-tickets"
                className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-blue-500/40 transition group shadow-sm flex items-center gap-3.5"
              >
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center shrink-0">
                  <Ticket className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold text-white text-sm group-hover:text-sky-300 transition">My Ticket History</div>
                  <div className="text-xs text-slate-400">Track current & past tickets</div>
                </div>
              </Link>
              <Link
                to="/kb"
                className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-blue-500/40 transition group shadow-sm flex items-center gap-3.5"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold text-white text-sm group-hover:text-indigo-300 transition">Knowledge Base</div>
                  <div className="text-xs text-slate-400">Self-service guides & FAQs</div>
                </div>
              </Link>
            </>
          )}

          {isStaff && (
            <>
              <Link
                to="/tickets"
                className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-blue-500/40 transition group shadow-sm flex items-center gap-3.5"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                  <Ticket className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold text-white text-sm group-hover:text-blue-300 transition">
                    {isTeamLead ? 'Team Ticket Queue' : 'All Tickets Feed'}
                  </div>
                  <div className="text-xs text-slate-400">Assign & resolve tickets</div>
                </div>
              </Link>
              <Link
                to="/csat"
                className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-blue-500/40 transition group shadow-sm flex items-center gap-3.5"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                  <Star className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold text-white text-sm group-hover:text-amber-300 transition">CSAT Reviews</div>
                  <div className="text-xs text-slate-400">Customer feedback scores</div>
                </div>
              </Link>
            </>
          )}

          {(isTeamLead || isManager || isAdmin) && (
            <Link
              to="/analytics"
              className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-blue-500/40 transition group shadow-sm flex items-center gap-3.5"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold text-white text-sm group-hover:text-purple-300 transition">Reports & Analytics</div>
                <div className="text-xs text-slate-400">Resolution performance & KPIs</div>
              </div>
            </Link>
          )}

          {isManager && (
            <Link
              to="/csat"
              className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-blue-500/40 transition group shadow-sm flex items-center gap-3.5"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                <Star className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold text-white text-sm group-hover:text-amber-300 transition">CSAT & Feedback</div>
                <div className="text-xs text-slate-400">Campus service ratings</div>
              </div>
            </Link>
          )}

          {(isKm || isAdmin) && (
            <Link
              to="/knowledge-base/manage"
              className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-blue-500/40 transition group shadow-sm flex items-center gap-3.5"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold text-white text-sm group-hover:text-emerald-300 transition">Manage Knowledge Base</div>
                <div className="text-xs text-slate-400">Author & organize articles</div>
              </div>
            </Link>
          )}

          {isAdmin && (
            <Link
              to="/admin/users"
              className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-blue-500/40 transition group shadow-sm flex items-center gap-3.5"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold text-white text-sm group-hover:text-blue-300 transition">User Management</div>
                <div className="text-xs text-slate-400">Role assignment & accounts</div>
              </div>
            </Link>
          )}
        </div>
      </div>

      {/* ── Role-Specific Bottom View ── */}
      {isKm ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Knowledge Base Articles</h2>
              <p className="text-xs text-slate-400 mt-0.5">Self-help articles and guides</p>
            </div>
            <Link
              to="/knowledge-base/manage"
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 inline-flex items-center gap-1 transition"
            >
              <span>Manage Articles</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {loading ? (
            <LoadingState message="Loading articles..." />
          ) : kbArticles.length === 0 ? (
            <EmptyState title="No articles available" description="No knowledge base articles have been published yet." />
          ) : (
            <div className="divide-y divide-slate-800">
              {kbArticles.slice(0, 5).map((a) => (
                <div
                  key={a.id}
                  onClick={() => navigate('/kb')}
                  className="py-3.5 flex items-center justify-between gap-3 hover:bg-slate-850 px-3 rounded-xl transition cursor-pointer group"
                >
                  <div className="space-y-1 min-w-0">
                    <h3 className="text-sm font-semibold text-white group-hover:text-blue-300 transition truncate">
                      {a.title}
                    </h3>
                    <p className="text-xs text-slate-400 truncate">{a.category || 'General'}</p>
                  </div>
                  <Badge variant={a.isFaq ? 'info' : 'neutral'}>
                    {a.isFaq ? 'FAQ' : 'Article'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : isManager ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Performance Overview & Reporting</h2>
              <p className="text-xs text-slate-400 mt-0.5">High-level help desk operational health and resolution trends</p>
            </div>
            <Link
              to="/analytics"
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 inline-flex items-center gap-1 transition"
            >
              <span>Full Analytics Report</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="p-6 bg-slate-950/60 rounded-xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-white font-semibold text-sm">Automated Performance Export</h3>
              <p className="text-slate-400 text-xs mt-1">Download complete CSV reports on resolution times, SLA compliance, and CSAT scores.</p>
            </div>
            <Button
              variant="primary"
              size="sm"
              icon={BarChart3}
              onClick={() => navigate('/analytics')}
            >
              Open Analytics Portal
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">
                {isEndUser ? 'My Recent Tickets' : 'Recent Support Queue'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {isEndUser ? 'Latest support requests submitted by your account' : 'Most recent tickets registered across departments'}
              </p>
            </div>
            <Link
              to={isEndUser ? '/my-tickets' : '/tickets'}
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 inline-flex items-center gap-1 transition"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <LoadingState message="Loading tickets..." />
          ) : tickets.length === 0 ? (
            <EmptyState
              title="No tickets found"
              description={isEndUser ? "You have not submitted any support tickets yet." : "No support tickets are currently in the queue."}
              action={
                isEndUser && (
                  <Button variant="primary" size="sm" icon={PlusCircle} onClick={() => navigate('/create')}>
                    Create First Ticket
                  </Button>
                )
              }
            />
          ) : (
            <div className="divide-y divide-slate-800">
              {tickets.slice(0, 5).map((t) => (
                <div
                  key={t.id}
                  onClick={() => navigate(`/tickets/${t.id}`)}
                  className="py-3.5 flex flex-wrap items-center justify-between gap-3 hover:bg-slate-800/50 px-3 rounded-xl transition cursor-pointer group"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                        {t.ticketNumber}
                      </span>
                      <Badge variant={statusBadgeVariant(t.status)}>
                        {t.status?.replace('_', ' ')}
                      </Badge>
                      <span className="text-[11px] text-slate-400">{t.priority}</span>
                    </div>
                    <h3 className="text-sm font-semibold text-white group-hover:text-blue-300 transition truncate">
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
