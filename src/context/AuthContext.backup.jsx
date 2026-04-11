import React, { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext();

const MOCK_CREDENTIALS = { email: 'arjun@appinventiv.com', password: 'Admin@123' };
const MOCK_OPERATOR = { name: 'Arjun P', email: 'arjun@appinventiv.com', role: 'Platform Operator', org: 'Appinventiv', avatar: 'AO' };

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [operator, setOperator] = useState(null);

  const login = useCallback((email, password) => {
    if (email === MOCK_CREDENTIALS.email && password === MOCK_CREDENTIALS.password) {
      return { success: true };
    }
    return { success: false, error: 'Invalid email or password. Please try again.' };
  }, []);

  const completeAuth = useCallback(() => {
    setIsAuthenticated(true);
    setOperator(MOCK_OPERATOR);
  }, []);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    setOperator(null);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, operator, login, completeAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
