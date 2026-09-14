import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute — blocks unauthenticated users and redirects to /login.
 * Wrap any route that requires a logged-in user.
 */
export const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm font-medium">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

/**
 * RoleBasedRoute — blocks users who don't have one of the allowed roles.
 * Shows an Access Denied (403) page.
 */
export const RoleBasedRoute = ({ allowedRoles, children }) => {
  const { isAuthenticated, hasRole, loading, getLandingPath } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm font-medium">Checking permissions...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!hasRole(allowedRoles)) {
    return <AccessDenied landingPath={getLandingPath()} />;
  }

  return children;
};

/**
 * GuestOnlyRoute — redirects authenticated users to their landing page.
 * Used for /login and /register so logged-in users don't see the auth forms.
 */
export const GuestOnlyRoute = ({ children }) => {
  const { isAuthenticated, loading, getLandingPath } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={getLandingPath()} replace />;
  }

  return children;
};

/**
 * Access Denied 403 Page
 */
const AccessDenied = ({ landingPath }) => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <div className="text-center space-y-6 max-w-md mx-auto p-8">
      <div className="w-20 h-20 rounded-3xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-5xl mx-auto">
        🚫
      </div>
      <div>
        <h1 className="text-3xl font-extrabold text-white">Access Denied</h1>
        <p className="text-slate-400 mt-2 text-sm leading-relaxed">
          You don't have permission to view this page. This area is restricted to authorized roles only.
        </p>
      </div>
      <div className="flex items-center justify-center gap-3">
        <a
          href={landingPath}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm transition shadow-lg shadow-indigo-500/25"
        >
          Go to My Dashboard
        </a>
        <button
          onClick={() => window.history.back()}
          className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-sm transition border border-slate-700"
        >
          Go Back
        </button>
      </div>
    </div>
  </div>
);

export default ProtectedRoute;
