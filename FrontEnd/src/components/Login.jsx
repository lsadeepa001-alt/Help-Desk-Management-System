import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const Login = ({ onSuccess, onSwitchToRegister }) => {
  const { login } = useAuth();
  const [formData, setFormData] = useState({ usernameOrEmail: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.usernameOrEmail || !formData.password) {
      setError('Please enter both username/email and password.');
      return;
    }

    setLoading(true);
    setError('');

    const result = await login(formData.usernameOrEmail, formData.password);
    setLoading(false);

    if (result.success) {
      if (onSuccess) onSuccess();
    } else {
      setError(result.error);
    }
  };

  const fillQuickDemo = (username, password) => {
    setFormData({ usernameOrEmail: username, password: password });
  };

  return (
    <div className="max-w-md mx-auto bg-slate-800/90 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center text-2xl mx-auto">
          🔐
        </div>
        <h2 className="text-2xl font-extrabold text-white tracking-tight">Welcome Back</h2>
        <p className="text-slate-400 text-xs">
          Sign in to access your University Helpdesk dashboard
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl text-xs font-medium bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            Username or Email
          </label>
          <input
            type="text"
            name="usernameOrEmail"
            value={formData.usernameOrEmail}
            onChange={handleChange}
            placeholder="e.g. std_kamal or admin@university.edu"
            className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm transition"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            Password
          </label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="••••••••"
            className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm transition"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 transition duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Authenticating...</span>
            </>
          ) : (
            <span>Sign In</span>
          )}
        </button>
      </form>

      {/* Quick Demo Login Pre-fills */}
      <div className="pt-4 border-t border-slate-700/60 space-y-3">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-center">
          Quick Demo Login
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => fillQuickDemo('std_kamal', '2568')}
            className="px-2.5 py-1.5 bg-slate-900/80 hover:bg-slate-700/80 text-slate-300 text-[11px] rounded-lg border border-slate-700/50 transition text-left"
          >
            🎓 <span className="font-semibold">Student</span> (std_kamal)
          </button>
          <button
            type="button"
            onClick={() => fillQuickDemo('prof_smith', '2568')}
            className="px-2.5 py-1.5 bg-slate-900/80 hover:bg-slate-700/80 text-slate-300 text-[11px] rounded-lg border border-slate-700/50 transition text-left"
          >
            👨‍🏫 <span className="font-semibold">Lecturer</span> (prof_smith)
          </button>
          <button
            type="button"
            onClick={() => fillQuickDemo('itsupport1', '2568')}
            className="px-2.5 py-1.5 bg-slate-900/80 hover:bg-slate-700/80 text-slate-300 text-[11px] rounded-lg border border-slate-700/50 transition text-left"
          >
            🛠️ <span className="font-semibold">Agent</span> (itsupport1)
          </button>
          <button
            type="button"
            onClick={() => fillQuickDemo('admin', '2568')}
            className="px-2.5 py-1.5 bg-slate-900/80 hover:bg-slate-700/80 text-slate-300 text-[11px] rounded-lg border border-slate-700/50 transition text-left"
          >
            👑 <span className="font-semibold">Admin</span> (admin)
          </button>
        </div>
      </div>

      <div className="text-center pt-2">
        <p className="text-xs text-slate-400">
          Don't have an account yet?{' '}
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="text-indigo-400 font-semibold hover:underline"
          >
            Create Account
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login;
