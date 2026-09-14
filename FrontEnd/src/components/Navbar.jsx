import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth, ROLES } from '../context/AuthContext';
import NotificationBell from './NotificationBell';

// ── Role badge color mapping ──
const roleBadgeStyle = (frontendRole) => {
  switch (frontendRole) {
    case ROLES.ADMIN:
    case 'SYSTEM_ADMINISTRATOR':  return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
    case ROLES.DEPARTMENT_MANAGER:
    case 'EXECUTIVE':            return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    case ROLES.SUPPORT_AGENT:    return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    case ROLES.TEAM_LEAD:        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
    case ROLES.KNOWLEDGE_MANAGER:return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    default:                     return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
  }
};

const roleDisplayName = (user) => {
  // Show backend role for clarity but use frontendRole for badge color
  const role = user?.role || user?.frontendRole || 'USER';
  return role.replace(/_/g, ' ');
};

// ── Navigation Items per role ──
const getNavItems = (frontendRole) => {
  const items = [];

  // END_USER (Student / Lecturer)
  if (frontendRole === ROLES.END_USER) {
    items.push({ to: '/my-tickets',  label: 'My Tickets',      icon: '🗂️' });
    items.push({ to: '/create',      label: 'New Ticket',      icon: '➕' });
    items.push({ to: '/kb',          label: 'Knowledge Base',  icon: '📚' });
  }

  // SUPPORT_AGENT
  if (frontendRole === ROLES.SUPPORT_AGENT) {
    items.push({ to: '/dashboard',   label: 'Agent Queue',     icon: '🛠️' });
    items.push({ to: '/tickets',     label: 'All Tickets',     icon: '📋' });
    items.push({ to: '/csat',        label: 'CSAT',            icon: '⭐' });
    items.push({ to: '/kb',          label: 'Knowledge Base',  icon: '📚' });
  }

  // TEAM_LEAD
  if (frontendRole === ROLES.TEAM_LEAD) {
    items.push({ to: '/dashboard',   label: 'Team Board',      icon: '🛠️' });
    items.push({ to: '/tickets',     label: 'All Tickets',     icon: '📋' });
    items.push({ to: '/csat',        label: 'CSAT',            icon: '⭐' });
    items.push({ to: '/analytics',   label: 'Analytics',       icon: '📊' });
    items.push({ to: '/kb',          label: 'Knowledge Base',  icon: '📚' });
  }

  // KNOWLEDGE_MANAGER
  if (frontendRole === ROLES.KNOWLEDGE_MANAGER) {
    items.push({ to: '/knowledge-base/manage', label: 'Manage KB', icon: '📚' });
    items.push({ to: '/kb',          label: 'Knowledge Base',  icon: '🔍' });
    items.push({ to: '/tickets',     label: 'All Tickets',     icon: '📋' });
  }

  // DEPARTMENT_MANAGER
  if (frontendRole === ROLES.DEPARTMENT_MANAGER || frontendRole === 'EXECUTIVE') {
    items.push({ to: '/analytics',   label: 'Analytics',       icon: '📊' });
    items.push({ to: '/tickets',     label: 'All Tickets',     icon: '📋' });
    items.push({ to: '/csat',        label: 'CSAT',            icon: '⭐' });
    items.push({ to: '/dashboard',   label: 'Agent Dashboard', icon: '🛠️' });
    items.push({ to: '/kb',          label: 'Knowledge Base',  icon: '📚' });
  }

  // ADMIN / SYSTEM_ADMINISTRATOR
  if (frontendRole === ROLES.ADMIN || frontendRole === 'SYSTEM_ADMINISTRATOR') {
    items.push({ to: '/admin/users', label: 'Users & Roles',   icon: '👥' });
    items.push({ to: '/tickets',     label: 'All Tickets',     icon: '📋' });
    items.push({ to: '/dashboard',   label: 'Agent Dashboard', icon: '🛠️' });
    items.push({ to: '/create',      label: 'New Ticket',      icon: '➕' });
    items.push({ to: '/csat',        label: 'CSAT',            icon: '⭐' });
    items.push({ to: '/analytics',   label: 'Analytics',       icon: '📊' });
    items.push({ to: '/kb',          label: 'Knowledge Base',  icon: '📚' });
  }

  return items;
};

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    setShowDropdown(false);
    logout();
    navigate('/login', { replace: true });
  };

  const navItems = isAuthenticated ? getNavItems(user?.frontendRole) : [];

  return (
    <header className="sticky top-0 z-50 bg-slate-950/85 backdrop-blur-xl border-b border-slate-800 print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">

        {/* Brand */}
        <NavLink to={isAuthenticated ? navItems[0]?.to || '/' : '/login'} className="flex items-center gap-3 flex-shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-xl shadow-lg shadow-indigo-500/20">
            🎓
          </div>
          <div className="hidden sm:block">
            <h1 className="font-extrabold text-lg text-white tracking-tight leading-tight">
              UniHelp <span className="text-indigo-400 font-light">Desk</span>
            </h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">University IT Portal</p>
          </div>
        </NavLink>

        {/* Navigation Tabs — only when authenticated */}
        {isAuthenticated && (
          <nav className="flex items-center gap-1 overflow-x-auto hide-scrollbar">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 whitespace-nowrap ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`
                }
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        )}

        {/* Auth Section */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {isAuthenticated && (
            <NotificationBell onSelectTicket={(id) => navigate(`/tickets/${id}`)} />
          )}

          {isAuthenticated ? (
            <div className="relative" ref={dropdownRef}>
              {/* User Avatar Button */}
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-2 bg-slate-900/80 border border-slate-700/60 rounded-xl px-3 py-1.5 hover:border-slate-600 transition"
              >
                <span className="w-7 h-7 rounded-full bg-indigo-600/80 text-white flex items-center justify-center text-xs font-bold shadow-md">
                  {(user.fullName || user.username || 'U')[0].toUpperCase()}
                </span>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-semibold text-white leading-tight">{user.fullName || user.username}</div>
                  <span className={`inline-block px-1.5 rounded border font-semibold tracking-wider uppercase text-[9px] ${roleBadgeStyle(user.frontendRole)}`}>
                    {roleDisplayName(user)}
                  </span>
                </div>
                <svg className={`w-3 h-3 text-slate-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {showDropdown && (
                <div className="absolute right-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl shadow-black/40 py-1 z-50 animate-in slide-in-from-top-2">
                  <div className="px-4 py-3 border-b border-slate-700/60">
                    <p className="text-sm font-semibold text-white">{user.fullName || user.username}</p>
                    <p className="text-xs text-slate-400 truncate">{user.email}</p>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded border font-semibold tracking-wider uppercase text-[9px] ${roleBadgeStyle(user.frontendRole)}`}>
                      {roleDisplayName(user)}
                    </span>
                  </div>
                  <div className="py-1">
                    <NavLink
                      to="/my-tickets"
                      onClick={() => setShowDropdown(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700/60 hover:text-white transition"
                    >
                      <span>🗂️</span> My Tickets
                    </NavLink>
                    <NavLink
                      to="/kb"
                      onClick={() => setShowDropdown(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700/60 hover:text-white transition"
                    >
                      <span>📚</span> Knowledge Base
                    </NavLink>
                  </div>
                  <div className="border-t border-slate-700/60 py-1">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition text-left"
                    >
                      <span>🚪</span> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex gap-2">
              <NavLink to="/login"
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 transition">
                Sign In
              </NavLink>
              <NavLink to="/register"
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600/80 hover:bg-indigo-500 text-white transition">
                Register
              </NavLink>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
