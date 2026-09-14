import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { AuthProvider, useAuth, ROLES } from './context/AuthContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { ProtectedRoute, RoleBasedRoute, GuestOnlyRoute } from './components/ProtectedRoute';

// ── Layout & Shared Components ──
import Navbar from './components/Navbar';
import AiChatbotModal from './components/AiChatbotModal';

// ── Pages (auth) ──
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// ── Feature Components ──
import TicketList from './components/TicketList';
import TicketDetails from './components/TicketDetails';
import CreateTicket from './components/CreateTicket';
import AgentDashboard from './components/AgentDashboard';
import CSATDashboard from './components/CSATDashboard';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import KnowledgeBase from './components/KnowledgeBase';

const API_BASE = 'http://localhost:8080/api';

// ── Role groups for route permissions ──
const STAFF_ROLES = [
  ROLES.SUPPORT_AGENT,
  ROLES.TEAM_LEAD,
  ROLES.ADMIN,
  ROLES.DEPARTMENT_MANAGER,
  ROLES.EXECUTIVE,
  'SYSTEM_ADMINISTRATOR',
];

const AGENT_ROLES = [
  ROLES.SUPPORT_AGENT,
  ROLES.TEAM_LEAD,
  ROLES.ADMIN,
  ROLES.DEPARTMENT_MANAGER,
  'SYSTEM_ADMINISTRATOR',
];

const ANALYTICS_ROLES = [
  ROLES.TEAM_LEAD,
  ROLES.ADMIN,
  ROLES.DEPARTMENT_MANAGER,
  ROLES.EXECUTIVE,
  'SYSTEM_ADMINISTRATOR',
];

// ── App Shell (Layout with Navbar + Footer for authenticated routes) ──
function AppShell() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [ticketPrefill, setTicketPrefill] = useState(null);

  const handleTicketCreated = () => {
    setTicketPrefill(null);
    showToast('🚀 Ticket submitted successfully!', 'success');
    navigate('/my-tickets');
  };

  const handleDeflectionToTicket = ({ title, description }) => {
    setTicketPrefill({ title, description });
    navigate('/create');
    showToast('🤖 Prefilled ticket from AI Chatbot deflection.', 'info');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white relative">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          {/* ── Public → Redirect to login ── */}
          <Route path="/" element={<RootRedirect />} />

          {/* ── All Tickets (Staff, Managers, Admins only) ── */}
          <Route path="/tickets" element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={[...STAFF_ROLES, ROLES.KNOWLEDGE_MANAGER]}>
                <div className="mb-8 p-6 rounded-3xl bg-gradient-to-r from-indigo-900/40 via-slate-800/80 to-purple-900/40 border border-slate-700/50 relative overflow-hidden shadow-2xl">
                  <div className="relative z-10 max-w-2xl">
                    <span className="inline-block px-3 py-1 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 rounded-full text-xs font-semibold uppercase tracking-wider mb-2">
                      Live Ticket Feed
                    </span>
                    <h2 className="text-3xl font-extrabold text-white tracking-tight">All Support Tickets</h2>
                    <p className="text-slate-300 text-sm mt-2 leading-relaxed">
                      View and manage all university helpdesk tickets across departments.
                    </p>
                  </div>
                  <div className="absolute right-4 bottom-0 opacity-10 text-9xl pointer-events-none select-none">🏛️</div>
                </div>
                <TicketList onViewTicket={(id) => navigate(`/tickets/${id}`)} />
              </RoleBasedRoute>
            </ProtectedRoute>
          } />

          {/* ── Ticket Details ── */}
          <Route path="/tickets/:ticketId" element={
            <ProtectedRoute>
              <TicketDetailsWrapper />
            </ProtectedRoute>
          } />

          {/* ── My Tickets (End User / All authenticated roles) ── */}
          <Route path="/my-tickets" element={
            <ProtectedRoute>
              <MyTicketsView />
            </ProtectedRoute>
          } />

          {/* ── Create Ticket ── */}
          <Route path="/create" element={
            <ProtectedRoute>
              <div className="max-w-3xl mx-auto">
                <CreateTicket
                  onTicketCreated={handleTicketCreated}
                  onOpenAuth={() => navigate('/login')}
                  prefillData={ticketPrefill}
                />
              </div>
            </ProtectedRoute>
          } />

          {/* ── Agent Dashboard ── */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={[...AGENT_ROLES, ROLES.EXECUTIVE]}>
                <AgentDashboard onViewTicket={(id) => navigate(`/tickets/${id}`)} />
              </RoleBasedRoute>
            </ProtectedRoute>
          } />

          {/* ── CSAT Dashboard ── */}
          <Route path="/csat" element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={[...STAFF_ROLES]}>
                <CSATDashboard />
              </RoleBasedRoute>
            </ProtectedRoute>
          } />

          {/* ── Analytics & Reports ── */}
          <Route path="/analytics" element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={[...ANALYTICS_ROLES]}>
                <AnalyticsDashboard />
              </RoleBasedRoute>
            </ProtectedRoute>
          } />

          {/* ── Knowledge Base ── */}
          <Route path="/kb" element={
            <ProtectedRoute>
              <KnowledgeBase />
            </ProtectedRoute>
          } />

          {/* ── KB Manage ── */}
          <Route path="/knowledge-base/manage" element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={[ROLES.KNOWLEDGE_MANAGER, ROLES.ADMIN, 'SYSTEM_ADMINISTRATOR']}>
                <KnowledgeBase />
              </RoleBasedRoute>
            </ProtectedRoute>
          } />

          {/* ── Admin Users & Role Management ── */}
          <Route path="/admin/users" element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={[ROLES.ADMIN, 'SYSTEM_ADMINISTRATOR']}>
                <AdminUsersView />
              </RoleBasedRoute>
            </ProtectedRoute>
          } />

          {/* ── Catch-all → redirect to root ── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Floating AI Chatbot */}
      <AiChatbotModal onNavigateToCreateTicket={handleDeflectionToTicket} />

      <footer className="border-t border-slate-800 bg-slate-950/60 py-6 mt-16 print:hidden">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-500">
          <p>UniAssist 360 • University Help Desk System • 5-Role RBAC Verified</p>
        </div>
      </footer>
    </div>
  );
}

// ── Root "/" — redirect to login if unauthenticated, otherwise to role landing page ──
function RootRedirect() {
  const { isAuthenticated, getLandingPath, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={getLandingPath()} replace />;
}

// ── My Tickets view for logged-in users ──
function MyTicketsView() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <>
      <div className="mb-6 p-5 rounded-2xl bg-slate-800/80 border border-slate-700/50 shadow-lg">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">🗂️ My Tickets</h2>
        <p className="text-slate-400 text-sm mt-1">
          Tickets submitted by <span className="text-indigo-400 font-semibold">{user?.fullName}</span> ({user?.role?.replace('_', ' ')}).
        </p>
      </div>
      <TicketList onViewTicket={(id) => navigate(`/tickets/${id}`)} filterUserId={user?.id} />
    </>
  );
}

// ── Ticket details page wrapper ──
function TicketDetailsWrapper() {
  const navigate = useNavigate();
  const { ticketId } = useParams();

  return (
    <TicketDetails
      ticketId={parseInt(ticketId, 10)}
      onBack={() => navigate(-1)}
    />
  );
}

// ── Admin Users & Role Management View ──
function AdminUsersView() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/users`);
      setUsers(res.data);
    } catch (err) {
      showToast('Failed to load users: ' + (err.response?.data?.message || err.message), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId, newRole) => {
    setUpdatingId(userId);
    try {
      await axios.put(`${API_BASE}/users/${userId}/role`, { role: newRole });
      showToast('User role updated successfully!', 'success');
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (err) {
      showToast('Failed to update role: ' + (err.response?.data?.message || err.message), 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await axios.delete(`${API_BASE}/users/${userId}`);
      showToast('User deleted successfully', 'info');
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err) {
      showToast('Failed to delete user: ' + (err.response?.data?.message || err.message), 'error');
    }
  };

  const filteredUsers = users.filter(u =>
    (u.fullName || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.username || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.role || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.department || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Admin Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-rose-900/40 via-slate-800/80 to-amber-900/40 border border-slate-700/50 relative overflow-hidden shadow-2xl">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-block px-3 py-1 bg-rose-500/20 border border-rose-500/30 text-rose-300 rounded-full text-xs font-semibold uppercase tracking-wider mb-2">
            System Administration
          </span>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Users & Role Management</h2>
          <p className="text-slate-300 text-sm mt-2 leading-relaxed">
            Manage system users, assign roles across the 5 university tiers, and inspect permissions.
          </p>
        </div>
        <div className="absolute right-4 bottom-0 opacity-10 text-9xl pointer-events-none select-none">👑</div>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-800/80 p-5 rounded-2xl border border-slate-700/60 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-slate-300">
            Total Users: <span className="text-indigo-400 font-bold">{users.length}</span>
          </span>
        </div>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, username, email, role..."
          className="w-full sm:w-80 bg-slate-900/90 border border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
        />
      </div>

      {/* Users Table */}
      <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading user database...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-slate-400">No matching users found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/60 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-700/60">
                <tr>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Department</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/40">
                {filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-slate-700/20 transition">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white">{u.fullName}</div>
                      <div className="text-xs text-slate-500 font-mono">@{u.username}</div>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono">{u.email}</td>
                    <td className="px-6 py-4 text-xs">{u.department || '—'}</td>
                    <td className="px-6 py-4">
                      <select
                        value={u.role}
                        disabled={updatingId === u.id || u.id === user?.id}
                        onChange={e => handleRoleChange(u.id, e.target.value)}
                        className="bg-slate-900 border border-slate-700 text-xs rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                      >
                        <option value="STUDENT">🎓 STUDENT</option>
                        <option value="LECTURER">👨‍🏫 LECTURER</option>
                        <option value="SUPPORT_AGENT">🛠️ SUPPORT_AGENT</option>
                        <option value="DEPARTMENT_MANAGER">👔 DEPARTMENT_MANAGER</option>
                        <option value="ADMIN">👑 ADMIN</option>
                        <option value="SYSTEM_ADMINISTRATOR">👑 SYSTEM_ADMINISTRATOR</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {u.id !== user?.id && (
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 px-2.5 py-1 rounded-lg transition"
                          title="Delete User"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Root App Component ──
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={
              <GuestOnlyRoute><LoginPage /></GuestOnlyRoute>
            } />
            <Route path="/register" element={
              <GuestOnlyRoute><RegisterPage /></GuestOnlyRoute>
            } />
            <Route path="/*" element={<AppShell />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
