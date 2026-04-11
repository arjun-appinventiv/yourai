import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { getMe, logout as apiLogout, login as apiLogin } from '../lib/auth';

// Removed: MOCK_CREDENTIALS — replaced with real API call to /api/auth/login
// Removed: MOCK_OPERATOR — replaced with real user from /api/auth/me
// See: tech-stack.md — Backend API section

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [operator, setOperator] = useState(null);
  const [loading, setLoading] = useState(true); // true while checking session on mount

  // On mount, check if the user has a valid session cookie
  useEffect(() => {
    getMe()
      .then((user) => {
        if (user) {
          setIsAuthenticated(true);
          setOperator(user);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  // Removed: mock credential comparison — now calls /api/auth/login
  const login = useCallback(async (email, password) => {
    const result = await apiLogin(email, password);
    if (result.success && result.user) {
      setIsAuthenticated(true);
      setOperator(result.user);
    }
    return result;
  }, []);

  // Removed: mock completeAuth that set MOCK_OPERATOR — now login sets user directly
  const completeAuth = useCallback((user) => {
    setIsAuthenticated(true);
    if (user) setOperator(user);
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setIsAuthenticated(false);
    setOperator(null);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, operator, login, completeAuth, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
