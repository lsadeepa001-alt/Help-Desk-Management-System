import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth, getLandingPath } from '../context/AuthContext';
import {
  LifeBuoy,
  User,
  Mail,
  Lock,
  Phone,
  Eye,
  EyeOff,
  GraduationCap,
  BookOpen,
  Check,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-react';
import Button from '../components/ui/Button';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    role: 'STUDENT',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
    if (success) setSuccess('');
  };

  const passwordRules = [
    { label: 'At least 8 characters', met: formData.password.length >= 8 },
    { label: 'One uppercase letter (A-Z)', met: /[A-Z]/.test(formData.password) },
    { label: 'One lowercase letter (a-z)', met: /[a-z]/.test(formData.password) },
    { label: 'One number (0-9)', met: /\d/.test(formData.password) },
    { label: 'One special character (@$!%*?&#^()_-)', met: /[@$!%*?&#^()_-]/.test(formData.password) },
  ];
  const isPasswordStrong = passwordRules.every((r) => r.met);

  const validate = () => {
    if (!formData.fullName.trim() || !formData.email.trim() || !formData.password.trim()) {
      return 'Please fill in all required fields (Full Name, Email, Password).';
    }
    if (!formData.username.trim()) {
      return 'Please choose a username.';
    }
    if (!isPasswordStrong) {
      return 'Password does not satisfy the security policy. Please ensure all password requirements are satisfied.';
    }
    if (formData.password !== formData.confirmPassword) {
      return 'Passwords do not match. Please re-enter your password.';
    }
    if (!formData.email.includes('@')) {
      return 'Please enter a valid email address.';
    }
    if (formData.role !== 'STUDENT' && formData.role !== 'LECTURER') {
      return 'Invalid account type selected. Only Student and Lecturer accounts can be created.';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    const payload = {
      fullName: formData.fullName.trim(),
      username: formData.username.trim(),
      email: formData.email.trim(),
      password: formData.password,
      role: formData.role,
      phoneNumber: formData.phoneNumber?.trim() || null,
    };

    try {
      const result = await register(payload);

      if (result.success) {
        setSuccess('Account created successfully. Redirecting to your dashboard...');
        setTimeout(() => {
          const landingPath = getLandingPath(result.data.frontendRole);
          navigate(landingPath, { replace: true });
        }, 1200);
      } else {
        setError(result.error);
      }
    } catch (err) {
      const backendMsg = err?.response?.data?.message;
      setError(backendMsg || 'Registration failed. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-900">
        
        {/* Left Side: Graduation Hero Visual with Navy Vignette (Desktop only) */}
        <div className="lg:col-span-5 relative hidden lg:block overflow-hidden min-h-[640px]">
          <img
            src="/images/uniassist-graduation-hero.jpg"
            alt="University campus and graduates"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-slate-900/90" />

          <div className="absolute bottom-8 left-8 right-8 z-10 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm">
              <LifeBuoy className="w-3.5 h-3.5" />
              <span>Campus Service Portal</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight leading-snug">
              Join the Campus Community
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Register as a student or lecturer to submit support requests, track resolution milestones, and communicate with university service departments.
            </p>
            <div className="pt-2 flex items-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-blue-400" /> IT Services</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-blue-400" /> Maintenance</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-blue-400" /> Security</span>
            </div>
          </div>
        </div>

        {/* Right Side: Registration Form */}
        <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-center bg-slate-900/95 overflow-y-auto max-h-[90vh]">
          <div className="space-y-5 max-w-lg w-full mx-auto">
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
              <h1 className="text-2xl font-bold text-white tracking-tight">Create Account</h1>
              <p className="text-xs text-slate-400 mt-1">
                Enter your details to register for university help desk access
              </p>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="p-3.5 rounded-xl text-xs font-medium bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-2.5 animate-in fade-in duration-150">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Success Banner */}
            {success && (
              <div className="p-3.5 rounded-xl text-xs font-medium bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-2.5 animate-in fade-in duration-150">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Account Type Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Account Type <span className="text-rose-400">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'STUDENT', label: 'Student', icon: GraduationCap, desc: 'Submit & track tickets' },
                    { value: 'LECTURER', label: 'Lecturer', icon: BookOpen, desc: 'Faculty & classroom support' },
                  ].map((option) => {
                    const Icon = option.icon;
                    const isSelected = formData.role === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, role: option.value }))}
                        className={`p-3 rounded-xl border text-left transition flex items-start gap-3 ${
                          isSelected
                            ? 'bg-blue-600/15 border-blue-500/50 ring-1 ring-blue-500/40'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className={`p-2 rounded-lg shrink-0 ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className={`text-xs font-bold ${isSelected ? 'text-blue-300' : 'text-slate-200'}`}>
                            {option.label}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">{option.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Full Name & Username */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Full Name <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      placeholder="e.g. Kasun Kalhara"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition"
                      required
                      autoComplete="name"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Username <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      placeholder="e.g. kasun_k"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition"
                      required
                      autoComplete="username"
                    />
                  </div>
                </div>
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    University Email <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="student@sliit.lk"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition"
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Phone Number <span className="text-slate-500 font-normal lowercase">(optional)</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="tel"
                      name="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={handleChange}
                      placeholder="+94-77-123-4567"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition"
                      autoComplete="tel"
                    />
                  </div>
                </div>
              </div>

              {/* Password & Confirm */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Password <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Min 8 characters"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition"
                      required
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Confirm Password <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Re-enter password"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition"
                      required
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    >
                      {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Password Security Checklist */}
              {formData.password && (
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-1.5 animate-in fade-in duration-150">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Password Security Policy</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      isPasswordStrong ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                    }`}>
                      {isPasswordStrong ? 'Policy Satisfied' : 'Requirements Incomplete'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px]">
                    {passwordRules.map((rule, idx) => (
                      <div key={idx} className={`flex items-center gap-1.5 ${
                        rule.met ? 'text-emerald-400' : 'text-slate-500'
                      }`}>
                        <Check className={`w-3 h-3 ${rule.met ? 'text-emerald-400' : 'opacity-20'}`} />
                        <span>{rule.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={loading}
                disabled={loading || !!success || !isPasswordStrong}
                className="w-full justify-center mt-2"
              >
                {success ? 'Account Created' : 'Create Account'}
              </Button>

              {/* Sign In & Back to Home Links */}
              <div className="text-center pt-1 space-y-2">
                <p className="text-xs text-slate-400">
                  Already registered with UniAssist 360?{' '}
                  <Link to="/login" className="text-blue-400 font-semibold hover:text-blue-300 transition">
                    Sign in here
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
