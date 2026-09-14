import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth, getLandingPath } from '../context/AuthContext';

// ── Quick Demo Accounts ──
const DEMO_ACCOUNTS = [
  { label: 'Student',       icon: '🎓', email: 'student@sliit.lk',  password: 'pass123', color: 'indigo' },
  { label: 'Support Agent', icon: '🛠️', email: 'agent@sliit.lk',    password: 'pass123', color: 'blue' },
  { label: 'Supervisor',    icon: '👔', email: 'lead@sliit.lk',     password: 'pass123', color: 'amber' },
  { label: 'Admin',         icon: '👑', email: 'admin@sliit.lk',    password: 'pass123', color: 'rose' },
  { label: 'Executive',     icon: '📊', email: 'director@sliit.lk', password: 'pass123', color: 'emerald' },
];

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({ usernameOrEmail: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const from = location.state?.from?.pathname;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.usernameOrEmail.trim() || !formData.password.trim()) {
      setError('Please enter both email/username and password.');
      return;
    }

    setLoading(true);
    setError('');

    const result = await login(formData.usernameOrEmail, formData.password);
    setLoading(false);

    if (result.success) {
      const landingPath = getLandingPath(result.data.frontendRole);
      navigate(from || landingPath, { replace: true });
    } else {
      setError(result.error);
    }
  };

  const fillDemo = (email, password) => {
    setFormData({ usernameOrEmail: email, password });
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4 py-12">
      {/* Background Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-3xl mx-auto shadow-xl shadow-indigo-500/25">
            🎓
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              UniHelp <span className="text-indigo-400 font-light">Desk</span>
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              University IT Support Portal — Sign in to continue
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
          {/* Error Alert */}
          {error && (
            <div className="p-4 rounded-xl text-xs font-medium bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-2 animate-in slide-in-from-top-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Email or Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
                <input
                  type="text"
                  name="usernameOrEmail"
                  value={formData.usernameOrEmail}
                  onChange={handleChange}
                  placeholder="e.g. admin or student@sliit.lk"
                  className="w-full bg-slate-900/90 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 text-sm transition"
                  autoComplete="username"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full bg-slate-900/90 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 text-sm transition"
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 transition duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  <span>Sign In</span>
                </>
              )}
            </button>

            {/* Register CTA — between Sign In and Demo Logins */}
            <p className="text-center text-xs text-slate-400 pt-1">
              Don't have an account?{' '}
              <Link to="/register" className="text-indigo-400 font-semibold hover:text-indigo-300 hover:underline transition">
                Register here
              </Link>
            </p>
          </form>

          {/* Quick Demo Logins */}
          <div className="pt-4 border-t border-slate-700/60 space-y-3">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center">
              Quick Demo Logins
            </p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.label}
                  type="button"
                  onClick={() => fillDemo(acc.email, acc.password)}
                  className="px-3 py-2 bg-slate-900/80 hover:bg-slate-700/80 text-slate-300 text-[11px] rounded-xl border border-slate-700/50 transition text-left flex items-center gap-2 group"
                >
                  <span className="text-base">{acc.icon}</span>
                  <div>
                    <div className="font-semibold group-hover:text-white transition">{acc.label}</div>
                    <div className="text-[10px] text-slate-500">{acc.email}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-slate-600 mt-4">
          UniAssist 360 • University Help Desk System
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
