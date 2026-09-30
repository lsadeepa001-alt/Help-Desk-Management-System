import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth, ROLES } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import {
  LifeBuoy,
  User,
  Ticket,
  BookOpen,
  LogOut,
  ChevronDown,
  Menu,
  X,
  LayoutDashboard,
  BarChart3,
  Star,
  Users,
  PlusCircle,
} from 'lucide-react';

const roleBadgeStyle = (role) => {
  switch (role) {
    case ROLES.SYSTEM_ADMINISTRATOR: return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
    case ROLES.MANAGER_EXECUTIVE:    return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
    case ROLES.TEAM_LEAD:            return 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30';
    case ROLES.SUPPORT_AGENT:        return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
    case ROLES.KNOWLEDGE_MANAGER:    return 'bg-teal-500/15 text-teal-300 border-teal-500/30';
    case ROLES.LECTURER:             return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    case ROLES.STUDENT:              return 'bg-sky-500/15 text-sky-300 border-sky-500/30';
    default:                         return 'bg-slate-700/40 text-slate-300 border-slate-700';
  }
};

const roleDisplayName = (user) => {
  const role = user?.role || user?.frontendRole || 'STUDENT';
  switch (role) {
    case ROLES.STUDENT:              return 'Student';
    case ROLES.LECTURER:             return 'Lecturer';
    case ROLES.SUPPORT_AGENT:        return 'Support Agent';
    case ROLES.TEAM_LEAD:            return 'Team Lead';
    case ROLES.KNOWLEDGE_MANAGER:    return 'Knowledge Manager';
    case ROLES.SYSTEM_ADMINISTRATOR: return 'System Administrator';
    case ROLES.MANAGER_EXECUTIVE:    return 'Manager / Executive';
    default:                         return role.replace(/_/g, ' ');
  }
};

const getNavItems = (role) => {
  const items = [
    { to: '/home', label: 'Dashboard', icon: LayoutDashboard },
  ];

  if (role === ROLES.STUDENT || role === ROLES.LECTURER) {
    items.push({ to: '/my-tickets',  label: 'My Tickets', icon: Ticket });
    items.push({ to: '/create',      label: 'New Ticket', icon: PlusCircle });
    items.push({ to: '/kb',          label: 'Knowledge Base', icon: BookOpen });
  }

  if (role === ROLES.SUPPORT_AGENT) {
    items.push({ to: '/dashboard',   label: 'Agent Queue', icon: LayoutDashboard });
    items.push({ to: '/tickets',     label: 'All Tickets', icon: Ticket });
    items.push({ to: '/kb',          label: 'Knowledge Base', icon: BookOpen });
  }

  if (role === ROLES.TEAM_LEAD) {
    items.push({ to: '/dashboard',   label: 'Team Board', icon: LayoutDashboard });
    items.push({ to: '/tickets',     label: 'Ticket Queue', icon: Ticket });
    items.push({ to: '/csat',        label: 'CSAT', icon: Star });
    items.push({ to: '/analytics',   label: 'Analytics', icon: BarChart3 });
    items.push({ to: '/kb',          label: 'Knowledge Base', icon: BookOpen });
  }

  if (role === ROLES.KNOWLEDGE_MANAGER) {
    items.push({ to: '/knowledge-base/manage', label: 'Manage KB', icon: BookOpen });
    items.push({ to: '/kb',          label: 'Knowledge Base', icon: BookOpen });
  }

  if (role === ROLES.MANAGER_EXECUTIVE) {
    items.push({ to: '/analytics',   label: 'Analytics & Reports', icon: BarChart3 });
    items.push({ to: '/csat',        label: 'CSAT Reviews', icon: Star });
  }

  if (role === ROLES.SYSTEM_ADMINISTRATOR) {
    items.push({ to: '/admin/users', label: 'Users & Roles', icon: Users });
    items.push({ to: '/tickets',     label: 'All Tickets', icon: Ticket });
    items.push({ to: '/dashboard',   label: 'Agent Queue', icon: LayoutDashboard });
    items.push({ to: '/create',      label: 'New Ticket', icon: PlusCircle });
    items.push({ to: '/csat',        label: 'CSAT', icon: Star });
    items.push({ to: '/analytics',   label: 'Analytics', icon: BarChart3 });
    items.push({ to: '/kb',          label: 'Knowledge Base', icon: BookOpen });
  }

  return items;
};

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);

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

  const navItems = isAuthenticated ? getNavItems(user?.role || user?.frontendRole) : [];

  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <NavLink to={isAuthenticated ? '/home' : '/'} className="flex items-center gap-3 shrink-0 focus:outline-none">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-sm">
            <LifeBuoy className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-base text-white tracking-tight leading-tight block">
              UniAssist <span className="text-blue-400 font-normal">360</span>
            </span>
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold block">
              University Support Portal
            </span>
          </div>
        </NavLink>

        {/* Desktop Navigation Tabs */}
        {isAuthenticated && (
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 whitespace-nowrap ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`
                }
              >
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        )}

        {/* Right Section: Notifications + User Menu */}
        <div className="flex items-center gap-2 shrink-0">
          {isAuthenticated && (
            <NotificationBell onSelectTicket={(id) => navigate(`/tickets/${id}`)} />
          )}

          {isAuthenticated ? (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 hover:border-slate-700 transition focus:outline-none"
              >
                <span className="w-7 h-7 rounded-lg bg-blue-600/30 border border-blue-500/30 text-blue-300 flex items-center justify-center text-xs font-bold">
                  {(user?.fullName || user?.username || 'U')[0].toUpperCase()}
                </span>
                <span className="hidden sm:block text-xs font-medium text-slate-200 max-w-[120px] truncate">
                  {user?.fullName || user?.username}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showDropdown && (
                <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-1 z-50 animate-in fade-in duration-100">
                  <div className="px-4 py-3 border-b border-slate-800">
                    <p className="text-sm font-semibold text-white truncate">{user.fullName || user.username}</p>
                    <p className="text-xs text-slate-400 truncate">{user.email}</p>
                    <span className={`inline-block mt-1.5 px-2 py-0.5 rounded border font-semibold tracking-wider uppercase text-[9px] ${roleBadgeStyle(user?.role || user?.frontendRole)}`}>
                      {roleDisplayName(user)}
                    </span>
                  </div>
                  <div className="py-1">
                    <NavLink
                      to="/profile"
                      onClick={() => setShowDropdown(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition"
                    >
                      <User className="w-4 h-4 text-slate-400" />
                      <span>Profile & Settings</span>
                    </NavLink>
                    <NavLink
                      to="/my-tickets"
                      onClick={() => setShowDropdown(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition"
                    >
                      <Ticket className="w-4 h-4 text-slate-400" />
                      <span>My Tickets</span>
                    </NavLink>
                    <NavLink
                      to="/kb"
                      onClick={() => setShowDropdown(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition"
                    >
                      <BookOpen className="w-4 h-4 text-slate-400" />
                      <span>Knowledge Base</span>
                    </NavLink>
                  </div>
                  <div className="border-t border-slate-800 py-1">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition text-left"
                    >
                      <LogOut className="w-4 h-4 text-rose-400" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex gap-2">
              <NavLink to="/login" className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 text-slate-200 border border-slate-800 hover:bg-slate-800 transition">
                Sign In
              </NavLink>
              <NavLink to="/register" className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white transition">
                Register
              </NavLink>
            </div>
          )}

          {/* Mobile Navigation Button */}
          {isAuthenticated && (
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle mobile menu"
              className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {isAuthenticated && mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-800 bg-slate-900/95 px-4 py-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-lg text-xs font-medium transition ${
                  isActive
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      )}
    </header>
  );
}
