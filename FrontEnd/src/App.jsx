import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { AuthProvider, useAuth, ROLES } from './context/AuthContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { ProtectedRoute, RoleBasedRoute, GuestOnlyRoute } from './components/ProtectedRoute';
import { Ticket, Plus, Search, X, Users, Edit2 } from 'lucide-react';
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

// Ticket details page wrapper
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

// Admin Users and Role Management View
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
  const [userToEditConfirm, setUserToEditConfirm] = useState(null);
  const [editModal, setEditModal] = useState({
    isOpen: false,
    user: null,
    formData: {
      fullName: '',
      username: '',
      email: '',
      phoneNumber: '',
      role: 'SUPPORT_AGENT',
      status: 'ACTIVE',
      department: 'IT',
    },
    saving: false,
    error: '',
  });

  const [userToDelete, setUserToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [statusLoadingId, setStatusLoadingId] = useState(null);

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

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleOpenEditConfirm = (targetUser) => {
    if (targetUser?.id === user?.id) {
      showToast('System Administrators cannot use administrative management on their own account. Personal details may be updated in Profile.', 'error');
      return;
    }
    setUserToEditConfirm(targetUser);
  };

  const handleProceedToEdit = () => {
    const target = userToEditConfirm;
    if (!target) return;
    setUserToEditConfirm(null);

    const isOp = target.role === 'SUPPORT_AGENT' || target.role === 'TEAM_LEAD';
    setEditModal({
      isOpen: true,
      user: target,
      formData: {
        fullName: target.fullName || '',
        username: target.username || '',
        email: target.email || '',
        phoneNumber: target.phoneNumber || '',
        role: target.role || 'STUDENT',
        status: target.status || 'ACTIVE',
        department: isOp ? (target.department || 'IT') : '',
      },
      saving: false,
      error: '',
    });
  };

  const handleSaveEditUser = async (e) => {
    e.preventDefault();
    const { user: target, formData } = editModal;
    if (!target) return;

    setEditModal(prev => ({ ...prev, saving: true, error: '' }));
    try {
      const payload = {
        fullName: formData.fullName.trim(),
        username: formData.username.trim(),
        email: formData.email.trim(),
        phoneNumber: formData.phoneNumber ? formData.phoneNumber.trim() : null,
        role: formData.role,
        status: formData.status,
        department: (formData.role === 'SUPPORT_AGENT' || formData.role === 'TEAM_LEAD')
          ? (formData.department || 'IT')
          : null,
      };

      const res = await axios.put(`${API_BASE}/users/${target.id}`, payload);
      showToast('User account updated successfully.', 'success');
      setUsers(prev => prev.map(u => u.id === target.id ? res.data : u));
      setEditModal(prev => ({ ...prev, isOpen: false, user: null }));
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to update user';
      setEditModal(prev => ({ ...prev, error: msg }));
    } finally {
      setEditModal(prev => ({ ...prev, saving: false }));
    }
  };

  const handleToggleStatus = async (userId) => {
    if (userId === user?.id) {
      showToast('System Administrators cannot suspend or deactivate their own account.', 'error');
      return;
    }
    setStatusLoadingId(userId);
    try {
      const res = await axios.put(`${API_BASE}/users/${userId}/status`);
      showToast(`User status updated to ${res.data.status}.`, 'success');
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: res.data.status } : u));
    } catch (err) {
      showToast('Failed to update status: ' + (err.response?.data?.message || err.message), 'error');
    } finally {
      setStatusLoadingId(null);
    }
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    if (userToDelete.id === user?.id) {
      showToast('System Administrators cannot delete their own account.', 'error');
      setUserToDelete(null);
      return;
    }
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
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Department</th>
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
                    <td className="px-6 py-4 text-xs">
                      <span className="font-medium text-slate-200">
                        {ROLE_OPTIONS.find(r => r.value === u.role)?.label || u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {u.department ? (
                        <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[11px] font-semibold">
                          {u.department}
                        </span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        (u.status || 'ACTIVE') === 'ACTIVE'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                      }`}>
                        {u.status || 'ACTIVE'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {u.id === user?.id ? (
                        <span className="text-xs font-medium text-slate-400 italic">
                          Current Account (Manage via Profile)
                        </span>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEditConfirm(u)}
                            className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 transition flex items-center gap-1.5"
                            title="Edit User Details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>

                          <button
                            onClick={() => handleToggleStatus(u.id)}
                            disabled={statusLoadingId === u.id}
                            className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded-lg border border-slate-700 hover:border-slate-500 transition"
                          >
                            {(u.status || 'ACTIVE') === 'ACTIVE' ? 'Suspend' : 'Activate'}
                          </button>

                          <button
                            onClick={() => setUserToDelete(u)}
                            className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 px-2.5 py-1 rounded-lg transition"
                            title="Delete User"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Dialog before entering administrative edit mode */}
      <ConfirmDialog
        isOpen={!!userToEditConfirm}
        onClose={() => setUserToEditConfirm(null)}
        onConfirm={handleProceedToEdit}
        title="Edit account details?"
        message={`You are entering administrative edit mode for ${userToEditConfirm?.fullName}. Changes to identity, role, account status, or technical department may affect this user's access to UniAssist360.`}
        confirmText="Continue to Edit"
        cancelText="Cancel"
      />

      {/* Administrative User Edit Modal */}
      {editModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 animate-in fade-in duration-150 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-blue-400" />
                  <span>Edit User Details</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Administrative update for <span className="text-blue-300 font-semibold">{editModal.user?.fullName}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditModal(prev => ({ ...prev, isOpen: false }))}
                aria-label="Close dialog"
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editModal.error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium rounded-xl">
                {editModal.error}
              </div>
            )}

            <form onSubmit={handleSaveEditUser} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editModal.formData.fullName}
                    onChange={e => setEditModal(prev => ({ ...prev, formData: { ...prev.formData, fullName: e.target.value } }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Username *
                  </label>
                  <input
                    type="text"
                    required
                    value={editModal.formData.username}
                    onChange={e => setEditModal(prev => ({ ...prev, formData: { ...prev.formData, username: e.target.value } }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={editModal.formData.email}
                    onChange={e => setEditModal(prev => ({ ...prev, formData: { ...prev.formData, email: e.target.value } }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={editModal.formData.phoneNumber}
                    onChange={e => setEditModal(prev => ({ ...prev, formData: { ...prev.formData, phoneNumber: e.target.value } }))}
                    placeholder="+94-77-123-4567"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Access Role *
                  </label>
                  <select
                    value={editModal.formData.role}
                    disabled={editModal.user?.id === user?.id}
                    onChange={e => {
                      const newRole = e.target.value;
                      const isOp = newRole === 'SUPPORT_AGENT' || newRole === 'TEAM_LEAD';
                      setEditModal(prev => ({
                        ...prev,
                        formData: {
                          ...prev.formData,
                          role: newRole,
                          department: isOp ? (prev.formData.department || 'IT') : '',
                        }
                      }));
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50"
                  >
                    {ROLE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Account Status *
                  </label>
                  <select
                    value={editModal.formData.status}
                    disabled={editModal.user?.id === user?.id}
                    onChange={e => setEditModal(prev => ({ ...prev, formData: { ...prev.formData, status: e.target.value } }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="SUSPENDED">Suspended</option>
                  </select>
                </div>
              </div>

              {/* Technical Department appears ONLY when role is SUPPORT_AGENT or TEAM_LEAD */}
              {(editModal.formData.role === 'SUPPORT_AGENT' || editModal.formData.role === 'TEAM_LEAD') && (
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Technical Department *
                  </label>
                  <select
                    value={editModal.formData.department}
                    required
                    onChange={e => setEditModal(prev => ({ ...prev, formData: { ...prev.formData, department: e.target.value } }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  >
                    <option value="IT">IT</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Security">Security</option>
                  </select>
                  <p className="text-[11px] text-slate-400">
                    Operational staff must belong strictly to IT, Maintenance, or Security.
                  </p>
                </div>
              )}

              {editModal.user?.id === user?.id && (
                <p className="text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl">
                  Note: You are editing your own administrator account. Role and status demotion are restricted.
                </p>
              )}

              <div className="flex gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditModal(prev => ({ ...prev, isOpen: false }))}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editModal.saving}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition shadow-md"
                >
                  {editModal.saving ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-5 animate-in fade-in duration-200 my-8">
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
