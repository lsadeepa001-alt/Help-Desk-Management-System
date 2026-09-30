import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import {
  LifeBuoy,
  KeyRound,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ArrowLeft,
} from 'lucide-react';
import Button from '../components/ui/Button';

const API = 'http://localhost:8080/api';

export default function PasswordResetPage() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [token, setToken] = useState(searchParams.get('token') || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const urlToken = searchParams.get('token');
    if (urlToken) {
      setToken(urlToken);
    }
  }, [searchParams]);

  const requestReset = async (event) => {
    event.preventDefault();
    setRequestLoading(true);
    setMessage(null);
    try {
      const response = await axios.post(`${API}/auth/password-reset/request`, { email: email.trim() });
      setRequestSent(true);
      setMessage({ type: 'success', text: response.data?.message || 'Password reset link sent to your registered email.' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Unable to submit password reset request. Please verify the email address.',
      });
    } finally {
      setRequestLoading(false);
    }
  };

  const confirmReset = async (event) => {
    event.preventDefault();
    setMessage(null);

    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match. Please re-enter both passwords.' });
      return;
    }

    setConfirmLoading(true);
    try {
      const response = await axios.post(`${API}/auth/password-reset/confirm`, {
        token: token.trim(),
        newPassword,
      });
      setMessage({
        type: 'success',
        text: response.data?.message || 'Password has been reset successfully. You may now sign in with your new password.',
      });
      setToken('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Unable to reset password. The link or token may be expired or invalid.',
      });
    } finally {
      setConfirmLoading(false);
    }
  };

  const hasToken = !!searchParams.get('token') || !!token;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-900">
        
        {/* Left Side: Graduation Hero Visual with Navy Vignette (Desktop only) */}
        <div className="lg:col-span-5 relative hidden lg:block overflow-hidden min-h-[580px]">
          <img
            src="/images/uniassist-graduation-hero.jpg"
            alt="University campus"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-slate-900/90" />

          <div className="absolute bottom-8 left-8 right-8 z-10 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Identity & Access</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight leading-snug">
              Secure Account Recovery
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              UniAssist 360 utilizes cryptographically signed, short-lived tokens to ensure only authorized university members can reset account credentials.
            </p>
          </div>
        </div>

        {/* Right Side: Reset Forms */}
        <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-center bg-slate-900/95 overflow-y-auto max-h-[90vh]">
          <div className="space-y-6 max-w-lg w-full mx-auto">
            {/* Header */}
            <div>
              <Link to="/" className="inline-flex items-center gap-2.5 mb-4 group focus:outline-none">
                <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:bg-blue-600/30 transition">
                  <LifeBuoy className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-base text-white tracking-tight block">
                    UniAssist <span className="text-blue-400 font-normal">360</span>
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold block">
                    University Support Portal
                  </span>
                </div>
              </Link>
              <h1 className="text-2xl font-bold text-white tracking-tight">Reset Password</h1>
              <p className="text-xs text-slate-400 mt-1">
                Recover access with a secure one-time reset link
              </p>
            </div>

            {/* Notification Banner */}
            {message && (
              <div
                className={`p-3.5 rounded-xl text-xs font-medium flex items-center gap-2.5 animate-in fade-in duration-150 ${
                  message.type === 'success'
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                }`}
              >
                {message.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                )}
                <span>{message.text}</span>
              </div>
            )}

            {/* Step 1: Request Reset Link */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div>
                <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 inline-flex items-center justify-center text-[11px]">1</span>
                  Request Reset Link
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Enter your registered university email to receive a secure link.
                </p>
              </div>

              <form onSubmit={requestReset} className="space-y-3">
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="student@sliit.lk"
                    autoComplete="email"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
                <Button
                  type="submit"
                  variant="secondary"
                  size="sm"
                  loading={requestLoading}
                  disabled={requestLoading || !email.trim()}
                  className="w-full justify-center"
                >
                  Send Reset Link
                </Button>
                {requestSent && (
                  <p className="text-[11px] text-emerald-400 leading-snug">
                    If an account is associated with this email, instructions have been dispatched. Check your inbox and spam folders.
                  </p>
                )}
              </form>
            </div>

            {/* Step 2: Confirm Reset Token & Set Password */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div>
                <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 inline-flex items-center justify-center text-[11px]">2</span>
                  Set New Password
                </h2>
                {hasToken ? (
                  <div className="mt-1.5 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[11px] flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>One-time security token loaded from email verification link.</span>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 mt-1">
                    Paste the reset token received via email and specify your new credentials.
                  </p>
                )}
              </div>

              <form onSubmit={confirmReset} className="space-y-3">
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    required
                    placeholder="Enter security token"
                    autoComplete="off"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      placeholder="New password"
                      autoComplete="new-password"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-9 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    >
                      {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      placeholder="Confirm password"
                      autoComplete="new-password"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-9 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    >
                      {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={confirmLoading}
                  disabled={confirmLoading || !token.trim() || !newPassword.trim()}
                  className="w-full justify-center"
                >
                  Update Password
                </Button>
              </form>
            </div>

            {/* Back to Sign In & Back to Home Links */}
            <div className="text-center pt-1 space-y-2">
              <p className="text-xs text-slate-400">
                Remember your password?{' '}
                <Link to="/login" className="text-blue-400 font-semibold hover:text-blue-300 transition">
                  Return to sign in
                </Link>
              </p>
              <div>
                <Link
                  to="/"
                  className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Home</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
