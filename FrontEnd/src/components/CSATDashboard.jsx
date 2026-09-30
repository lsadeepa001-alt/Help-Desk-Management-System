import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Star, UserCheck, Award, Users } from 'lucide-react';

const API = 'http://localhost:8080/api';

const StarDisplay = ({ rating, size = 'md' }) => {
  const sz = size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';
  return (
    <div className="flex gap-0.5 justify-center">
      {[1, 2, 3, 4, 5].map((v) => (
        <Star
          key={v}
          className={`${sz} ${
            v <= Math.round(rating)
              ? 'text-amber-400 fill-amber-400'
              : 'text-slate-700'
          }`}
        />
      ))}
    </div>
  );
};

const csatColor = (score) => {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 60) return 'text-amber-400';
  return 'text-rose-400';
};

const csatLabel = (score) => {
  if (score >= 80) return { text: 'Excellent', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
  if (score >= 60) return { text: 'Good', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
  if (score >= 40) return { text: 'Fair', color: 'bg-orange-500/20 text-orange-300 border-orange-500/30' };
  return { text: 'Needs Improvement', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' };
};

export default function CSATDashboard() {
  const { user } = useAuth();
  const [allFeedback, setAllFeedback] = useState([]);
  const [agentSummary, setAgentSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedAgentId, setSelectedAgentId] = useState(null);
  const [agentData, setAgentData] = useState(null);
  const [loadingAgent, setLoadingAgent] = useState(false);

  const isManager = ['TEAM_LEAD', 'MANAGER_EXECUTIVE', 'SYSTEM_ADMINISTRATOR'].includes(user?.role);

  const loadMyStats = useCallback(async () => {
    if (!user) return;
    try {
      const res = await axios.get(`${API}/feedback/agent/${user.id}/summary`);
      setAgentSummary(res.data);
    } catch { /* no data yet */ }
  }, [user]);

  const loadAll = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/feedback/all`);
      setAllFeedback(res.data);
    } catch { /* no data */ }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadMyStats(), isManager ? loadAll() : Promise.resolve()])
      .finally(() => setLoading(false));
  }, [loadMyStats, loadAll, isManager]);

  const loadAgentSummary = async (agentId) => {
    setSelectedAgentId(agentId);
    setLoadingAgent(true);
    try {
      const res = await axios.get(`${API}/feedback/agent/${agentId}/summary`);
      setAgentData(res.data);
    } catch {
      setAgentData(null);
    } finally {
      setLoadingAgent(false);
    }
  };

  const fmt = (dt) => {
    if (!dt) return '—';
    return new Date(dt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const SummaryCard = ({ data, title }) => {
    if (!data) return (
      <div className="text-center py-10 text-slate-500 text-sm italic">No feedback received yet.</div>
    );
    const { name, averageRating, csatScore, totalReviews, ratingBreakdown, reviews } = data;
    const label = csatLabel(csatScore);

    return (
      <div className="space-y-5">
        {/* Top Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Average Rating */}
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-5 text-center">
            <div className="text-4xl font-extrabold text-amber-400">{averageRating.toFixed(1)}</div>
            <div className="mt-2 flex justify-center">
              <StarDisplay rating={averageRating} size="md" />
            </div>
            <div className="text-xs text-slate-500 mt-2 uppercase tracking-wider">Average Rating</div>
          </div>

          {/* CSAT Score */}
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-5 text-center">
            <div className={`text-4xl font-extrabold ${csatColor(csatScore)}`}>{csatScore}%</div>
            <div className="mt-2">
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${label.color}`}>
                {label.text}
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-2 uppercase tracking-wider">CSAT Score</div>
            <div className="text-[10px] text-slate-500 mt-0.5">% rated 4 stars or above</div>
          </div>

          {/* Total Reviews */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-center">
            <div className="text-4xl font-extrabold text-blue-400">{totalReviews}</div>
            <div className="text-xs text-slate-500 mt-4 uppercase tracking-wider">Total Reviews</div>
          </div>
        </div>

        {/* Rating Breakdown Bar */}
        {totalReviews > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-200">Rating Breakdown</h3>
            {[5, 4, 3, 2, 1].map(star => {
              const count = ratingBreakdown?.[star] || 0;
              const pct = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-3">
                  <div className="flex items-center gap-1 w-14 flex-shrink-0">
                    <span className="text-xs text-slate-400 font-medium">{star}</span>
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  </div>
                  <div className="flex-1 h-2.5 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-700"
                      style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-slate-500 w-10 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Recent Reviews */}
        {reviews && reviews.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-200">Recent Customer Reviews</h3>
            {reviews.map((r, i) => (
              <div key={r.id || i} className="bg-slate-800/80 border border-slate-700/50 rounded-xl p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-indigo-600/80 text-white flex items-center justify-center text-xs font-bold">
                      {(r.submittedBy?.fullName || 'U')[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-200">{r.submittedBy?.fullName}</div>
                      <div className="text-[10px] text-slate-500">{r.ticketNumber}</div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StarDisplay rating={r.rating} size="sm" />
                    <span className="text-[10px] text-slate-600">{fmt(r.createdAt)}</span>
                  </div>
                </div>
                {r.comments && (
                  <p className="text-slate-300 text-sm leading-relaxed pl-9 italic">"{r.comments}"</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-slate-400">
      <svg className="w-7 h-7 animate-spin mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
      </svg>
      Loading CSAT data...
    </div>
  );

  // Build unique agent list from all feedback (for manager view)
  const agentMap = {};
  allFeedback.forEach(f => {
    const ag = f.ticket?.assignedTo;
    if (ag) agentMap[ag.id] = ag;
  });
  const agents = Object.values(agentMap);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-2">
          <Star className="w-3.5 h-3.5 fill-blue-400" />
          <span>Feedback Analytics</span>
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Satisfaction Analytics</h2>
        <p className="text-slate-400 text-xs mt-1">
          Customer satisfaction ratings and performance metrics.
        </p>
      </div>

      {/* ── My Performance (for agents) ── */}
      {!isManager && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-blue-400" />
            <span>My Performance — <span className="text-blue-300">{user?.fullName}</span></span>
          </h2>
          <SummaryCard data={agentSummary} />
        </div>
      )}

      {/* ── Manager View: all agents + drill-down ── */}
      {isManager && (
        <div className="space-y-5">
          {/* Overall summary card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              <span>Overall Helpdesk Performance</span>
            </h2>
            {allFeedback.length === 0 ? (
              <div className="text-center py-8 text-slate-500 italic text-sm">No feedback submitted yet.</div>
            ) : (() => {
              const avg = allFeedback.reduce((s, f) => s + f.rating, 0) / allFeedback.length;
              const sat = allFeedback.filter(f => f.rating >= 4).length;
              const csat = (sat / allFeedback.length) * 100;
              const label = csatLabel(csat);
              return (
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-slate-950 rounded-xl p-4 border border-slate-800">
                    <div className="text-3xl font-bold text-amber-400">{avg.toFixed(1)}</div>
                    <StarDisplay rating={avg} size="sm" />
                    <div className="text-xs text-slate-500 mt-1">Avg Rating</div>
                  </div>
                  <div className="bg-slate-950 rounded-xl p-4 border border-slate-800">
                    <div className={`text-3xl font-bold ${csatColor(csat)}`}>{csat.toFixed(0)}%</div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${label.color}`}>{label.text}</span>
                    <div className="text-xs text-slate-500 mt-1">CSAT Score</div>
                  </div>
                  <div className="bg-slate-950 rounded-xl p-4 border border-slate-800">
                    <div className="text-3xl font-bold text-blue-400">{allFeedback.length}</div>
                    <div className="text-xs text-slate-500 mt-4">Total Reviews</div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Agent leaderboard */}
          {agents.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                <span>Agent Performance</span>
              </h2>
              <div className="space-y-2">
                {agents.map(ag => {
                  const agFeedback = allFeedback.filter(f => f.ticket?.assignedTo?.id === ag.id);
                  const avg = agFeedback.length ? agFeedback.reduce((s, f) => s + f.rating, 0) / agFeedback.length : 0;
                  const sat = agFeedback.filter(f => f.rating >= 4).length;
                  const csat = agFeedback.length ? (sat / agFeedback.length) * 100 : 0;
                  return (
                    <div key={ag.id}
                      onClick={() => loadAgentSummary(ag.id)}
                      className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition ${
                        selectedAgentId === ag.id
                          ? 'bg-indigo-900/30 border-indigo-500/40'
                          : 'bg-slate-900/60 border-slate-700/40 hover:bg-slate-700/40'
                      }`}>
                      <div className="w-9 h-9 rounded-full bg-indigo-600/80 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {(ag.fullName || 'A')[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-slate-200">{ag.fullName}</div>
                        <div className="text-xs text-slate-500">{ag.role?.replace('_', ' ')}</div>
                      </div>
                      <div className="text-right space-y-1">
                        <StarDisplay rating={avg} size="sm" />
                        <div className="text-xs text-slate-500">{agFeedback.length} reviews · CSAT {csat.toFixed(0)}%</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Agent drill-down */}
              {selectedAgentId && (
                <div className="mt-4 pt-4 border-t border-slate-700/50 space-y-4">
                  <h3 className="text-sm font-bold text-slate-300">
                    Detailed Review — {agentData?.name || '...'}
                  </h3>
                  {loadingAgent ? (
                    <div className="text-center py-6 text-slate-500 text-sm">Loading...</div>
                  ) : (
                    <SummaryCard data={agentData} />
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
