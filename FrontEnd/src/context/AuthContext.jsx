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
        hasRole,
        getLandingPath: () => getLandingPath(user?.frontendRole),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
