import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth, getLandingPath } from '../context/AuthContext';
import { LifeBuoy, Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft } from 'lucide-react';
import Button from '../components/ui/Button';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({ usernameOrEmail: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
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

    const result = await login(formData.usernameOrEmail.trim(), formData.password);
    setLoading(false);

    if (result.success) {
      const landingPath = getLandingPath(result.data.frontendRole);
      navigate(from || landingPath, { replace: true });
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-900">
        
        {/* Left Side: Graduation Hero Visual with Navy Vignette (Hidden on small mobile) */}
        <div className="lg:col-span-6 relative hidden lg:block overflow-hidden min-h-[580px]">
          <img
            src="/images/uniassist-graduation-hero.jpg"
            alt="University graduates celebrating outdoors"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-slate-900/90" />
          
          <div className="absolute bottom-8 left-8 right-8 z-10 space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm">
              <LifeBuoy className="w-3.5 h-3.5" />
              <span>Campus Service Portal</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight leading-snug">
              Prompt Support for the University Community
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Connect directly with IT Support, Maintenance, and Security teams through one central dashboard.
            </p>
          </div>
        </div>

        {/* Right Side: Clean Login Form */}
        <div className="lg:col-span-6 p-6 sm:p-10 flex flex-col justify-center bg-slate-900/95">
          <div className="space-y-6 max-w-md w-full mx-auto">
            {/* Header */}
            <div>
              <Link to="/" className="inline-flex items-center gap-2.5 mb-6 group focus:outline-none">
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
              <h1 className="text-2xl font-bold text-white tracking-tight">Sign In</h1>
              <p className="text-xs text-slate-400 mt-1">
                Enter your university credentials to access the support portal
              </p>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="p-3.5 rounded-xl text-xs font-medium bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-2.5 animate-in fade-in duration-150">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Email or Username
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    name="usernameOrEmail"
                    value={formData.usernameOrEmail}
                    onChange={handleChange}
                    placeholder="e.g. admin or student@sliit.lk"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition"
                    autoComplete="username"
                    autoFocus
                  />
                </div>
                <div className="text-right mt-1.5">
                  <Link
                    to="/password-reset"
                    className="text-xs text-blue-400 hover:text-blue-300 transition"
                  >
                    Forgot your password?
                  </Link>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full py-2.5 text-sm"
                  loading={loading}
                  iconRight={ArrowRight}
                >
                  Sign In
                </Button>
              </div>

              <div className="text-center pt-2 space-y-2">
                <p className="text-xs text-slate-400">
                  New to UniAssist?{' '}
                  <Link
                    to="/register"
                    className="text-blue-400 font-semibold hover:text-blue-300 transition"
                  >
                    Create Account
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
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
