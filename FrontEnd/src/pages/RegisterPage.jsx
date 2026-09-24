import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth, getLandingPath } from '../context/AuthContext';

const DEPARTMENTS = [
  'Computing',
  'Engineering',
  'Business',
  'IT Services',
  'Administration',
  'Science',
  'Arts & Humanities',
];

// ── Static SVG Icons (Defined outside to prevent recreating on every render) ──
const UserIcon = (
  <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const EmailIcon = (
  <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
  </svg>
);

const LockIcon = (
  <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

const PhoneIcon = (
  <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
  </svg>
);

const BuildingIcon = (
  <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

// ── Reusable Input Field Component (Defined outside RegisterPage to prevent focus loss) ──
const InputField = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  icon,
  required = false,
  autoComplete,
  passwordVisible = false,
  onTogglePassword,
}) => (
  <div>
    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
      {label} {required && <span className="text-rose-400">*</span>}
    </label>
    <div className="relative">
      {icon && (
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          {icon}
        </div>
      )}
      <input
        type={onTogglePassword ? (passwordVisible ? 'text' : 'password') : type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`w-full bg-slate-900/90 border border-slate-700 rounded-xl pl-10 ${onTogglePassword ? 'pr-11' : 'pr-4'} py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 text-sm transition`}
        required={required}
      />
      {onTogglePassword && (
        <button
          type="button"
          onClick={onTogglePassword}
          aria-label={passwordVisible ? 'Hide password' : 'Show password'}
          title={passwordVisible ? 'Hide password' : 'Show password'}
          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-indigo-300 transition"
        >
          {passwordVisible ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3l18 18M10.6 10.7a2 2 0 002.7 2.7M9.9 4.2A10.5 10.5 0 0112 4c5 0 9.3 3.1 11 8a11.8 11.8 0 01-2.2 3.8M6.6 6.6A11.5 11.5 0 001 12c1.7 4.9 6 8 11 8 1.7 0 3.3-.4 4.7-1" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
              <circle cx="12" cy="12" r="3" strokeWidth="2" />
            </svg>
          )}
        </button>
      )}
    </div>
  </div>
);

const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    department: '',
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
    { label: 'One special character (@$!%*?&#^()_-)', met: /[@$!%*?&#^()_\-]/.test(formData.password) },
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

    // Prepare payload (exclude confirmPassword)
    const payload = {
      fullName: formData.fullName.trim(),
      username: formData.username.trim(),
      email: formData.email.trim(),
      password: formData.password,
      role: formData.role,
      department: formData.department,
      phoneNumber: formData.phoneNumber,
    };

    try {
      // Send real registration request to backend
      const result = await register(payload);

      if (result.success) {
        setSuccess('Account created successfully! Redirecting to your dashboard...');
        setTimeout(() => {
          const landingPath = getLandingPath(result.data.frontendRole);
          navigate(landingPath, { replace: true });
        }, 1500);
      } else {
        setError(result.error);
      }
    } catch (err) {
      // Surface real backend errors
      console.error('Registration request failed:', err);
      const backendMsg = err?.response?.data?.message;
      setError(backendMsg || 'Registration failed. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4 py-12">
      {/* Background Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-3xl mx-auto shadow-xl shadow-indigo-500/25">
            🎓
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Create <span className="text-indigo-400 font-light">Account</span>
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Register to access the UniHelp Desk support portal
            </p>
          </div>
        </div>

        {/* Registration Card */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-5">

          {/* Error Alert */}
          {error && (
            <div className="p-4 rounded-xl text-xs font-medium bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Success Alert */}
          {success && (
            <div className="p-4 rounded-xl text-xs font-medium bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Row 1: Full Name + Username */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputField
                label="Full Name"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="e.g. Kasun Kalhara"
                icon={UserIcon}
                required
                autoComplete="name"
              />
              <InputField
                label="Username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="e.g. kasun_k"
                icon={UserIcon}
                required
                autoComplete="username"
              />
            </div>

            {/* Row 2: Email */}
            <InputField
              label="University Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="student@sliit.lk"
              icon={EmailIcon}
              required
              autoComplete="email"
            />

            {/* Row 3: Department + Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Department / Faculty
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    {BuildingIcon}
                  </div>
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    className="w-full bg-slate-900/90 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 text-sm transition appearance-none"
                  >
                    <option value="">— Select —</option>
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </div>
              <InputField
                label="Phone Number"
                name="phoneNumber"
                type="tel"
                value={formData.phoneNumber}
                onChange={handleChange}
                placeholder="+94-77-123-4567"
                icon={PhoneIcon}
                autoComplete="tel"
              />
            </div>

            {/* Row 4: Password + Confirm */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputField
                label="Password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Min 8 characters"
                icon={LockIcon}
                required
                autoComplete="new-password"
                passwordVisible={showPassword}
                onTogglePassword={() => setShowPassword((visible) => !visible)}
              />
              <InputField
                label="Confirm Password"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Re-enter password"
                icon={LockIcon}
                required
                autoComplete="new-password"
                passwordVisible={showConfirmPassword}
                onTogglePassword={() => setShowConfirmPassword((visible) => !visible)}
              />
            </div>

            {/* Password Security Checklist */}
            {formData.password && (
              <div className="bg-slate-900/80 border border-slate-700/60 rounded-xl p-3.5 space-y-1.5 animate-in fade-in duration-200">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Password Security Requirements</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isPasswordStrong ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                  }`}>
                    {isPasswordStrong ? '✓ Strong Password' : 'Incomplete'}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                  {passwordRules.map((rule, idx) => (
                    <div key={idx} className={`flex items-center gap-1.5 transition-colors ${
                      rule.met ? 'text-emerald-400' : 'text-slate-500'
                    }`}>
                      <span className="text-xs font-bold">{rule.met ? '✓' : '○'}</span>
                      <span className="text-[11px]">{rule.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Row 5: Role Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
                Account Type <span className="text-rose-400">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'STUDENT', label: 'Student', icon: '🎓', desc: 'Submit & track tickets' },
                  { value: 'LECTURER', label: 'Lecturer', icon: '👨‍🏫', desc: 'Submit tickets & faculty requests' },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, role: option.value }))}
                    className={`flex-1 min-w-[140px] p-3 rounded-xl border text-left transition ${
                      formData.role === option.value
                        ? 'bg-indigo-600/20 border-indigo-500/50 ring-1 ring-indigo-500/30'
                        : 'bg-slate-900/60 border-slate-700/50 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{option.icon}</span>
                      <div>
                        <div className={`text-xs font-bold ${formData.role === option.value ? 'text-indigo-300' : 'text-slate-300'}`}>
                          {option.label}
                        </div>
                        <div className="text-[10px] text-slate-500">{option.desc}</div>
                      </div>
                      {formData.role === option.value && (
                        <svg className="w-4 h-4 text-indigo-400 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !!success || !isPasswordStrong}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 transition duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : success ? (
                <>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Redirecting...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  <span>Create Account</span>
                </>
              )}
            </button>

            {/* Sign In Link */}
            <p className="text-center text-xs text-slate-400 pt-1">
              Already have an account?{' '}
              <Link to="/login" className="text-indigo-400 font-semibold hover:text-indigo-300 hover:underline transition">
                Sign In
              </Link>
            </p>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-slate-600 mt-4">
          UniAssist 360 • University Help Desk System
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
