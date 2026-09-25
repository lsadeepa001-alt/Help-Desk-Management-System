import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';

const API = 'http://localhost:8080/api';

export default function PasswordResetPage() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [token, setToken] = useState(searchParams.get('token') || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [requestSent, setRequestSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const urlToken = searchParams.get('token');
    if (urlToken) {
      setToken(urlToken);
    }
  }, [searchParams]);

  const requestReset = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const response = await axios.post(`${API}/auth/password-reset/request`, { email });
      setRequestSent(true);
      setMessage({ type: 'success', text: response.data.message });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Unable to create the reset request.' });
    } finally {
      setLoading(false);
    }
  };

  const confirmReset = async (event) => {
    event.preventDefault();
    setMessage(null);
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/password-reset/confirm`, { token, newPassword });
      setMessage({ type: 'success', text: response.data.message });
      setToken('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Unable to reset the password.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-3xl mx-auto shadow-xl shadow-indigo-500/25">🔑</div>
          <h1 className="text-3xl font-extrabold text-white mt-4">Reset Password</h1>
          <p className="text-sm text-slate-400 mt-1">Secure, short-lived, one-time reset tokens</p>
        </div>

        <div className="bg-slate-800/90 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          {message && (
            <div className={`p-4 rounded-xl text-sm border ${message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={requestReset} className="space-y-4">
            <div>
              <h2 className="font-bold text-white">1. Request a reset</h2>
              <p className="text-xs text-slate-400 mt-1">
                Enter your registered university email. A secure, one-time password reset link will be sent to your inbox.
              </p>
            </div>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              placeholder="University email address"
              autoComplete="email"
              className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
            <button disabled={loading} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition">
              {loading ? 'Processing...' : 'Request Reset Token'}
            </button>
            {requestSent && (
              <p className="text-xs text-emerald-400">
                If your account is registered, a password reset link has been dispatched to your email. Check your inbox to continue.
              </p>
            )}
          </form>

          <div className="border-t border-slate-700/60" />

          <form onSubmit={confirmReset} className="space-y-4">
            <div>
              <h2 className="font-bold text-white">2. Set a new password</h2>
              {searchParams.get('token') && (
                <div className="mt-2 p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs flex items-center gap-2">
                  <span>✨</span> Reset token loaded from your verification link. Enter your new password below.
                </div>
              )}
            </div>
            <input
              type="text"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              required
              placeholder="One-time reset token"
              autoComplete="off"
              className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-4 py-3 text-sm font-mono text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
              placeholder="New password"
              autoComplete="new-password"
              className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              placeholder="Confirm new password"
              autoComplete="new-password"
              className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
            <p className="text-[11px] text-slate-400">Use at least 8 characters with uppercase, lowercase, number, and special character.</p>
            <button disabled={loading} className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition">
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>

          <p className="text-center text-xs text-slate-400">
            <Link to="/login" className="text-indigo-400 font-semibold hover:text-indigo-300">Back to sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
