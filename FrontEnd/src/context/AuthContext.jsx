import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext();

const API_BASE_URL = 'http://localhost:8080/api';

// ── Proposal Concrete Roles ──
export const ROLES = {
  STUDENT: 'STUDENT',
  LECTURER: 'LECTURER',
  SUPPORT_AGENT: 'SUPPORT_AGENT',
  TEAM_LEAD: 'TEAM_LEAD',
  KNOWLEDGE_MANAGER: 'KNOWLEDGE_MANAGER',
  SYSTEM_ADMINISTRATOR: 'SYSTEM_ADMINISTRATOR',
  MANAGER_EXECUTIVE: 'MANAGER_EXECUTIVE',
};

export const ROLE_LABELS = {
  STUDENT: 'Student',
  LECTURER: 'Lecturer',
  SUPPORT_AGENT: 'Support Agent',
  TEAM_LEAD: 'Team Lead / Supervisor',
  KNOWLEDGE_MANAGER: 'Knowledge Manager',
  SYSTEM_ADMINISTRATOR: 'System Administrator',
  MANAGER_EXECUTIVE: 'Manager / Executive',
};

/**
 * Maps backend role directly to standard proposal role.
 */
const mapBackendRole = (backendRole) => {
  return backendRole || 'STUDENT';
};

/**
 * Returns the default landing path for a given role.
 * All authenticated users land on the unified role-adaptive dashboard at /home.
 */
export const getLandingPath = (role) => {
  return '/home';
};

// Purge legacy cross-tab authentication keys to prevent credential contamination
try {
  localStorage.removeItem('helpdesk_token');
  localStorage.removeItem('helpdesk_user');
  localStorage.removeItem('token');
  delete axios.defaults.headers.common['Authorization'];
} catch {
  // Ignore storage exceptions if access is restricted
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = sessionStorage.getItem('helpdesk_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    return sessionStorage.getItem('helpdesk_token') || null;
  });

  const [loading, setLoading] = useState(true);

  // Single source of Authorization header via Axios request interceptor
  useEffect(() => {
    const interceptorId = axios.interceptors.request.use(
      (config) => {
        const currentToken = sessionStorage.getItem('helpdesk_token');
        if (currentToken) {
          config.headers = config.headers || {};
          config.headers['Authorization'] = `Bearer ${currentToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    return () => {
      axios.interceptors.request.eject(interceptorId);
    };
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem('helpdesk_token');
    sessionStorage.removeItem('helpdesk_user');
    setToken(null);
    setUser(null);
  }, []);

  // Validate token with backend /api/auth/me on initial load for current tab
  useEffect(() => {
    const verifyToken = async () => {
      const currentToken = sessionStorage.getItem('helpdesk_token');
      if (currentToken) {
        try {
          const response = await axios.get(`${API_BASE_URL}/auth/me`);
          const userData = {
            ...response.data,
            frontendRole: mapBackendRole(response.data.role),
          };
          setUser(userData);
          sessionStorage.setItem('helpdesk_user', JSON.stringify(userData));
        } catch (err) {
          console.error('Session expired or invalid token:', err);
          logout();
        }
      }
      setLoading(false);
    };

    verifyToken();
  }, [logout]);

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
      sessionStorage.setItem('helpdesk_token', newToken);
      sessionStorage.setItem('helpdesk_user', JSON.stringify(userData));
      setToken(newToken);
      setUser(userData);
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
      sessionStorage.setItem('helpdesk_token', newToken);
      sessionStorage.setItem('helpdesk_user', JSON.stringify(userData));
      setToken(newToken);
      setUser(userData);
      return { success: true, data: userData };
    } catch (err) {
      console.error('Registration failed:', err);
      const message = err.response?.data?.message || 'Registration failed. Please check your inputs.';
      return { success: false, error: message };
    }
  };

  const updateCurrentUser = useCallback((updatedUser) => {
    setUser((currentUser) => {
      const userData = {
        ...currentUser,
        ...updatedUser,
        frontendRole: mapBackendRole(updatedUser.role || currentUser?.role),
      };
      sessionStorage.setItem('helpdesk_user', JSON.stringify(userData));
      return userData;
    });
  }, []);

  const isAuthenticated = !!user && !!token;

  /**
   * Check if user has one of the allowed roles.
   * @param {string[]} allowedRoles - Array of allowed roles
   */
  const hasRole = useCallback((allowedRoles) => {
    if (!user) return false;
    const currentRole = user.role || user.frontendRole;
    return allowedRoles.includes(currentRole);
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
        updateCurrentUser,
        hasRole,
        getLandingPath: () => getLandingPath(user?.frontendRole),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
