import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext();

const API_BASE_URL = 'http://localhost:8080/api';

// ── Role Hierarchy & Mapping ──
// Backend roles → frontend display roles
const ROLE_MAP = {
  STUDENT: 'END_USER',
  LECTURER: 'END_USER',
  SUPPORT_AGENT: 'SUPPORT_AGENT',
  DEPARTMENT_MANAGER: 'DEPARTMENT_MANAGER',
  ADMIN: 'ADMIN',
  SYSTEM_ADMINISTRATOR: 'ADMIN',
};

// All supported frontend roles for RBAC checks
export const ROLES = {
  END_USER: 'END_USER',
  SUPPORT_AGENT: 'SUPPORT_AGENT',
  DEPARTMENT_MANAGER: 'DEPARTMENT_MANAGER',
  EXECUTIVE: 'DEPARTMENT_MANAGER', // alias for department manager
  TEAM_LEAD: 'TEAM_LEAD',
  KNOWLEDGE_MANAGER: 'KNOWLEDGE_MANAGER',
  ADMIN: 'ADMIN',
};

/**
 * Maps backend role to the nearest frontend RBAC role.
 */
const mapBackendRole = (backendRole) => {
  return ROLE_MAP[backendRole] || 'END_USER';
};

/**
 * Returns the default landing path for a given role.
 */
export const getLandingPath = (role) => {
  switch (role) {
    case ROLES.ADMIN:
      return '/admin/users';
    case ROLES.SUPPORT_AGENT:
    case ROLES.TEAM_LEAD:
      return '/dashboard';
    case ROLES.EXECUTIVE:
      return '/analytics';
    case ROLES.KNOWLEDGE_MANAGER:
      return '/knowledge-base/manage';
    default:
      return '/my-tickets';
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('helpdesk_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem('helpdesk_token') || null;
  });

  const [loading, setLoading] = useState(true);

  // Set default Axios auth header whenever token changes
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('helpdesk_token', token);
    } else {
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem('helpdesk_token');
    }
  }, [token]);

  // Validate token with backend /api/auth/me on initial load
  useEffect(() => {
    const verifyToken = async () => {
      if (token) {
        try {
          const response = await axios.get(`${API_BASE_URL}/auth/me`);
          const userData = {
            ...response.data,
            frontendRole: mapBackendRole(response.data.role),
          };
          setUser(userData);
          localStorage.setItem('helpdesk_user', JSON.stringify(userData));
        } catch (err) {
          console.error('Session expired or invalid token:', err);
          logout();
        }
      }
      setLoading(false);
    };

    verifyToken();
  }, []);

  const login = async (usernameOrEmail, password) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        usernameOrEmail,
        password,
      });

      const { token: newToken, ...rawUserData } = response.data;
      const userData = {
        ...rawUserData,
        frontendRole: mapBackendRole(rawUserData.role),
      };
      setToken(newToken);
      setUser(userData);
      localStorage.setItem('helpdesk_user', JSON.stringify(userData));
      return { success: true, data: userData };
    } catch (err) {
      console.error('Login failed:', err);
      const message = err.response?.data?.message || 'Invalid credentials. Please try again.';
      return { success: false, error: message };
    }
  };

  const register = async (registerData) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/register`, registerData);
      const { token: newToken, ...rawUserData } = response.data;
      const userData = {
        ...rawUserData,
        frontendRole: mapBackendRole(rawUserData.role),
      };
      setToken(newToken);
      setUser(userData);
      localStorage.setItem('helpdesk_user', JSON.stringify(userData));
      return { success: true, data: userData };
    } catch (err) {
      console.error('Registration failed:', err);
      const message = err.response?.data?.message || 'Registration failed. Please check your inputs.';
      return { success: false, error: message };
    }
  };

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('helpdesk_token');
    localStorage.removeItem('helpdesk_user');
    delete axios.defaults.headers.common['Authorization'];
  }, []);

  const isAuthenticated = !!user && !!token;

  /**
   * Check if user has one of the allowed roles.
   * Checks both frontendRole (e.g. END_USER, DEPARTMENT_MANAGER, ADMIN)
   * and raw backend role (e.g. STUDENT, LECTURER, SYSTEM_ADMINISTRATOR).
   * @param {string[]} allowedRoles - Array of allowed roles
   */
  const hasRole = useCallback((allowedRoles) => {
    if (!user) return false;
    return allowedRoles.includes(user.frontendRole) ||
           allowedRoles.includes(user.role) ||
           (user.frontendRole === 'DEPARTMENT_MANAGER' && allowedRoles.includes('EXECUTIVE')) ||
           (user.frontendRole === 'ADMIN' && allowedRoles.includes('SYSTEM_ADMINISTRATOR'));
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated,
        login,
        register,
        logout,
        hasRole,
        getLandingPath: () => getLandingPath(user?.frontendRole),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
