import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { AuthProvider, useAuth, ROLES } from './context/AuthContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { ProtectedRoute, RoleBasedRoute, GuestOnlyRoute } from './components/ProtectedRoute';
import { Ticket, Plus, Search, X, Users } from 'lucide-react';
import ConfirmDialog from './components/ui/ConfirmDialog';
import Button from './components/ui/Button';

import Navbar from './components/Navbar';
import AiChatbotModal from './components/AiChatbotModal';

import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import PasswordResetPage from './pages/PasswordResetPage';
import ProfilePage from './pages/ProfilePage';
import Dashboard from './pages/Dashboard';

import TicketList from './components/TicketList';
import TicketDetails from './components/TicketDetails';
import CreateTicket from './components/CreateTicket';
import AgentDashboard from './components/AgentDashboard';
import CSATDashboard from './components/CSATDashboard';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import KnowledgeBase from './components/KnowledgeBase';

const API_BASE = 'http://localhost:8080/api';

const STAFF_ROLES = [
  ROLES.SUPPORT_AGENT,
  ROLES.TEAM_LEAD,
  ROLES.SYSTEM_ADMINISTRATOR,
];

const AGENT_ROLES = [
  ROLES.SUPPORT_AGENT,
  ROLES.TEAM_LEAD,
  ROLES.SYSTEM_ADMINISTRATOR,
];

const ANALYTICS_ROLES = [
  ROLES.TEAM_LEAD,
  ROLES.MANAGER_EXECUTIVE,
  ROLES.SYSTEM_ADMINISTRATOR,
];

function AppShell() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [ticketPrefill, setTicketPrefill] = useState(null);

  const handleTicketCreated = () => {
    setTicketPrefill(null);
    showToast('Ticket submitted successfully.', 'success');
    navigate('/my-tickets');
  };

  const handleDeflectionToTicket = ({ title, description }) => {
    setTicketPrefill({ title, description });
    navigate('/create');
    showToast('Ticket details were prefilled from the support assistant.', 'info');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-blue-600 selection:text-white relative">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />

          <Route path="/home" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />

          <Route path="/profile" element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          } />

          <Route path="/tickets" element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={STAFF_ROLES}>
                <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-blue-950/40 border border-slate-800 relative overflow-hidden shadow-lg">
                  <div className="relative z-10 max-w-2xl">
                    <span className="inline-block px-2.5 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-300 rounded-md text-[11px] font-semibold uppercase tracking-wider mb-2">
                      Live Queue Feed
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">All Support Tickets</h2>
                    <p className="text-slate-300 text-sm mt-1.5 leading-relaxed">
                      View and manage university helpdesk tickets across operational departments.
                    </p>
                  </div>
                </div>
                <TicketList onViewTicket={(id) => navigate(`/tickets/${id}`)} />
              </RoleBasedRoute>
            </ProtectedRoute>
          } />

          <Route path="/tickets/:ticketId" element={
            <ProtectedRoute>
              <TicketDetailsWrapper />
            </ProtectedRoute>
          } />

          <Route path="/my-tickets" element={
            <ProtectedRoute>
              <MyTicketsView />
            </ProtectedRoute>
          } />

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

          <Route path="/dashboard" element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={AGENT_ROLES}>
                <AgentDashboard onViewTicket={(id) => navigate(`/tickets/${id}`)} />
              </RoleBasedRoute>
            </ProtectedRoute>
          } />

          <Route path="/csat" element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={[ROLES.SUPPORT_AGENT, ROLES.TEAM_LEAD, ROLES.MANAGER_EXECUTIVE, ROLES.SYSTEM_ADMINISTRATOR]}>
                <CSATDashboard />
              </RoleBasedRoute>
            </ProtectedRoute>
          } />

          <Route path="/analytics" element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={ANALYTICS_ROLES}>
                <AnalyticsDashboard />
              </RoleBasedRoute>
            </ProtectedRoute>
          } />

          <Route path="/kb" element={
            <ProtectedRoute>
              <KnowledgeBase />
            </ProtectedRoute>
          } />

          <Route path="/knowledge-base/manage" element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={[ROLES.KNOWLEDGE_MANAGER, ROLES.SYSTEM_ADMINISTRATOR]}>
                <KnowledgeBase />
              </RoleBasedRoute>
            </ProtectedRoute>
          } />

          <Route path="/admin/users" element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={[ROLES.SYSTEM_ADMINISTRATOR]}>
                <AdminUsersView />
              </RoleBasedRoute>
            </ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <AiChatbotModal onNavigateToCreateTicket={handleDeflectionToTicket} />

      <footer className="border-t border-slate-800 bg-slate-950/60 py-6 mt-16 print:hidden">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-500">
          <p>UniAssist 360 • University Support Portal</p>
        </div>
      </footer>
    </div>
  );
}

function MyTicketsView() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <>
      <div className="mb-6 p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Ticket className="w-5 h-5 text-blue-400" />
          <span>My Tickets</span>
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          Tickets submitted by <span className="text-blue-400 font-semibold">{user?.fullName}</span> ({user?.role?.replace('_', ' ')}).
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
  const ROLE_OPTIONS = [
    { value: 'STUDENT', label: 'Student' },
    { value: 'LECTURER', label: 'Lecturer' },
    { value: 'SUPPORT_AGENT', label: 'Support Agent' },
    { value: 'TEAM_LEAD', label: 'Team Lead / Supervisor' },
    { value: 'KNOWLEDGE_MANAGER', label: 'Knowledge Manager' },
    { value: 'SYSTEM_ADMINISTRATOR', label: 'System Administrator' },
    { value: 'MANAGER_EXECUTIVE', label: 'Manager / Executive' },
  ];

  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [resetRequests, setResetRequests] = useState([]);
  const [issuedCredential, setIssuedCredential] = useState(null);
  const [issuingRequestId, setIssuingRequestId] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    role: 'SUPPORT_AGENT',
    department: '',
    phoneNumber: '',
  });

  const [roleModal, setRoleModal] = useState({
    isOpen: false,
    user: null,
    targetRole: '',
    department: 'IT',
  });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/users`);
      setUsers(res.data);
    } catch (err) {
      showToast('Failed to load users: ' + (err.response?.data?.message || err.message), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const fetchResetRequests = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/users/password-reset-requests`);
      setResetRequests(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      showToast('Failed to load password reset requests: ' + (err.response?.data?.message || err.message), 'error');
    }
  }, [showToast]);

  useEffect(() => {
    fetchUsers();
    fetchResetRequests();
  }, [fetchResetRequests, fetchUsers]);

  const handleRoleSelect = (targetUser, newRole) => {
    if (newRole === targetUser.role) return;
    const isOperational = newRole === 'SUPPORT_AGENT' || newRole === 'TEAM_LEAD';
    if (isOperational) {
      const validDepts = ['it', 'maintenance', 'security'];
      const defaultDept = targetUser.department && validDepts.includes(targetUser.department.toLowerCase())
        ? (targetUser.department.toUpperCase() === 'IT' ? 'IT' : targetUser.department.charAt(0).toUpperCase() + targetUser.department.slice(1).toLowerCase())
        : 'IT';
      setRoleModal({
        isOpen: true,
        user: targetUser,
        targetRole: newRole,
        department: defaultDept,
      });
    } else {
      executeRoleChange(targetUser.id, newRole, null);
    }
  };

  const executeRoleChange = async (userId, newRole, department) => {
    setUpdatingId(userId);
    try {
      const payload = { role: newRole };
      if (department) {
        payload.department = department;
      }
      const res = await axios.put(`${API_BASE}/users/${userId}/role`, payload);
      showToast('User role updated successfully.', 'success');
      setUsers(prev => prev.map(u => u.id === userId ? res.data : u));
      setRoleModal({ isOpen: false, user: null, targetRole: '', department: 'IT' });
    } catch (err) {
      showToast('Failed to update role: ' + (err.response?.data?.message || err.message), 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleToggleStatus = async (userId) => {
    try {
      const res = await axios.put(`${API_BASE}/users/${userId}/status`);
      showToast(`User status updated to ${res.data.status}.`, 'success');
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: res.data.status } : u));
    } catch (err) {
      showToast('Failed to update status: ' + (err.response?.data?.message || err.message), 'error');
    }
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    setDeleteLoading(true);
    try {
      await axios.delete(`${API_BASE}/users/${userToDelete.id}`);
      showToast('User deleted successfully.', 'info');
      setUsers(prev => prev.filter(u => u.id !== userToDelete.id));
      setUserToDelete(null);
    } catch (err) {
      showToast('Failed to delete user: ' + (err.response?.data?.message || err.message), 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleIssueResetCredential = async (requestId) => {
    setIssuingRequestId(requestId);
    try {
      const res = await axios.post(`${API_BASE}/users/password-reset-requests/${requestId}/issue`);
      setIssuedCredential(res.data);
      await fetchResetRequests();
    } catch (err) {
      showToast(err.response?.data?.message || 'Unable to issue a reset credential.', 'error');
    } finally {
      setIssuingRequestId(null);
    }
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/users`, createFormData);
      showToast('Staff account created successfully.', 'success');
      setUsers(prev => [...prev, res.data]);
      setShowCreateModal(false);
      setCreateFormData({
        fullName: '',
        username: '',
        email: '',
        password: '',
        role: 'SUPPORT_AGENT',
        department: '',
        phoneNumber: '',
      });
    } catch (err) {
      showToast('Failed to create staff: ' + (err.response?.data?.message || err.message), 'error');
    } finally {
      setCreateLoading(false);
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
      <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-blue-950/40 border border-slate-800 relative overflow-hidden shadow-lg">
        <div className="relative z-10 max-w-2xl space-y-1.5">
          <span className="inline-block px-2.5 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-300 rounded-md text-[11px] font-semibold uppercase tracking-wider">
            System Administration
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Users & Role Management</h2>
          <p className="text-slate-300 text-sm leading-relaxed">
            Manage system users, assign roles across university tiers, provision staff, and configure account access.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-md">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold text-slate-300">
            Total Users: <span className="text-blue-400 font-bold">{users.length}</span>
          </span>
          <Button
            onClick={() => setShowCreateModal(true)}
            icon={Plus}
            size="sm"
          >
            Create Staff Member
          </Button>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, username, email, role..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>
      </div>

      {/* Pending administrator-assisted password resets */}
      <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-slate-700/60 flex items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-white">Pending Password Resets</h3>
            <p className="text-xs text-slate-400 mt-1">Issue a short-lived one-time credential, then hand it directly to the verified user.</p>
          </div>
          <span className="text-xs font-bold text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-3 py-1">
            {resetRequests.length} pending
          </span>
        </div>
        {resetRequests.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-slate-400">No pending password reset requests.</div>
        ) : (
          <div className="divide-y divide-slate-700/40">
            {resetRequests.map(request => (
              <div key={request.requestId} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-white">{request.username}</div>
                  <div className="text-xs text-slate-400">{request.email}</div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Requested {new Date(request.requestedAt).toLocaleString()}
                    {request.issuedAt && ` • ${request.expired ? 'Previous credential expired' : 'Credential already issued'}`}
                  </div>
                </div>
                <button
                  onClick={() => handleIssueResetCredential(request.requestId)}
                  disabled={issuingRequestId === request.requestId}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition"
                >
                  {issuingRequestId === request.requestId ? 'Issuing...' : request.issuedAt ? 'Reissue Credential' : 'Issue Credential'}
                </button>
              </div>
            ))}
          </div>
        )}
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
                  <th className="px-6 py-4">Status</th>
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
                        onChange={e => handleRoleSelect(u, e.target.value)}
                        className="bg-slate-900 border border-slate-700 text-xs rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        {ROLE_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          (u.status || 'ACTIVE') === 'ACTIVE'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                        }`}>
                          {u.status || 'ACTIVE'}
                        </span>
                        {u.id !== user?.id && (
                          <button
                            onClick={() => handleToggleStatus(u.id)}
                            className="text-[10px] text-slate-400 hover:text-white px-2 py-0.5 rounded border border-slate-700 hover:border-slate-500 transition"
                          >
                            {(u.status || 'ACTIVE') === 'ACTIVE' ? 'Suspend' : 'Activate'}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {u.id !== user?.id && (
                        <button
                          onClick={() => setUserToDelete(u)}
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

      {issuedCredential && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg bg-slate-900 border border-blue-500/40 rounded-3xl p-6 shadow-2xl space-y-5">
            <div>
              <h3 className="text-lg font-bold text-white">One-Time Reset Credential</h3>
              <p className="text-xs text-amber-300 mt-1">Copy this now. The raw credential is not stored and will not be displayed again.</p>
            </div>
            <div className="space-y-2">
              <div className="text-xs text-slate-400">User: <span className="text-slate-200 font-semibold">{issuedCredential.username}</span></div>
              <input
                readOnly
                value={issuedCredential.resetToken}
                onFocus={event => event.target.select()}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm font-mono text-slate-100"
              />
              <div className="text-xs text-slate-400">Expires {new Date(issuedCredential.expiresAt).toLocaleString()}</div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => navigator.clipboard.writeText(issuedCredential.resetToken)}
                className="px-4 py-2 border border-slate-600 hover:border-slate-500 text-slate-200 text-sm font-semibold rounded-xl transition"
              >
                Copy
              </button>
              <button
                onClick={() => setIssuedCredential(null)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition"
              >
                I Have Saved It
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                <span>Create Privileged Staff Member</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                aria-label="Close dialog"
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={createFormData.fullName}
                    onChange={e => setCreateFormData(prev => ({ ...prev, fullName: e.target.value }))}
                    placeholder="e.g. John Doe"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Username *
                  </label>
                  <input
                    type="text"
                    required
                    value={createFormData.username}
                    onChange={e => setCreateFormData(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="e.g. jdoe_tech"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    University Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={createFormData.email}
                    onChange={e => setCreateFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="staff@sliit.lk"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={createFormData.password}
                    onChange={e => setCreateFormData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Min 8 chars"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    System Role *
                  </label>
                  <select
                    value={createFormData.role}
                    onChange={e => {
                      const newRole = e.target.value;
                      const isOperational = newRole === 'SUPPORT_AGENT' || newRole === 'TEAM_LEAD';
                      setCreateFormData(prev => ({
                        ...prev,
                        role: newRole,
                        department: isOperational ? prev.department : ''
                      }));
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  >
                    {ROLE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Department {(createFormData.role === 'SUPPORT_AGENT' || createFormData.role === 'TEAM_LEAD') && '*'}
                  </label>
                  <select
                    value={createFormData.department}
                    disabled={createFormData.role !== 'SUPPORT_AGENT' && createFormData.role !== 'TEAM_LEAD'}
                    required={createFormData.role === 'SUPPORT_AGENT' || createFormData.role === 'TEAM_LEAD'}
                    onChange={e => setCreateFormData(prev => ({ ...prev, department: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">Select Department</option>
                    <option value="IT">IT</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Security">Security</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={createFormData.phoneNumber}
                  onChange={e => setCreateFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                  placeholder="+94-77-123-4567"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition shadow-md"
                >
                  {createLoading ? 'Creating Staff...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {roleModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Assign Technical Department</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Promoting <span className="text-blue-300 font-semibold">{roleModal.user?.fullName}</span> to {roleModal.targetRole === 'SUPPORT_AGENT' ? 'Support Agent' : 'Team Lead'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRoleModal(prev => ({ ...prev, isOpen: false }))}
                aria-label="Close dialog"
                className="text-slate-400 hover:text-white transition p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed">
                Operational staff (<span className="text-amber-300">Support Agent</span> and <span className="text-amber-300">Team Lead</span>) must be assigned to an approved Technical Department:
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Technical Department *
                </label>
                <select
                  value={roleModal.department}
                  onChange={e => setRoleModal(prev => ({ ...prev, department: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  <option value="IT">IT</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Security">Security</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRoleModal(prev => ({ ...prev, isOpen: false }))}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={updatingId === roleModal.user?.id}
                  onClick={() => executeRoleChange(roleModal.user?.id, roleModal.targetRole, roleModal.department)}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition shadow-md"
                >
                  {updatingId === roleModal.user?.id ? 'Saving...' : 'Confirm Role Change'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        onConfirm={confirmDeleteUser}
        title="Delete User"
        message={`Are you sure you want to permanently delete user "${userToDelete?.fullName}" (@${userToDelete?.username})? This action cannot be undone.`}
        confirmText="Delete User"
        danger
        loading={deleteLoading}
      />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={
              <GuestOnlyRoute><LoginPage /></GuestOnlyRoute>
            } />
            <Route path="/register" element={
              <GuestOnlyRoute><RegisterPage /></GuestOnlyRoute>
            } />
            <Route path="/password-reset" element={
              <GuestOnlyRoute><PasswordResetPage /></GuestOnlyRoute>
            } />
            <Route path="/*" element={<AppShell />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
