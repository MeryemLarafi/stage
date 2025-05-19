import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setIsAuthenticated(true);
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const login = (email, password) => {
    // نشوفو واش الإيميل وكلمة المرور موجودين فـ localStorage
    const storedCredentials = localStorage.getItem('credentials');
    if (storedCredentials) {
      const { email: storedEmail, password: storedPassword } = JSON.parse(storedCredentials);
      if (email === storedEmail && password === storedPassword) {
        const userData = { email };
        localStorage.setItem('user', JSON.stringify(userData));
        setIsAuthenticated(true);
        setUser(userData);
        return true;
      }
    }
    return false;
  };

  const register = (email, password) => {
    // نسجلو الإيميل وكلمة المرور فـ localStorage
    const credentials = { email, password };
    localStorage.setItem('credentials', JSON.stringify(credentials));
    const userData = { email };
    localStorage.setItem('user', JSON.stringify(userData));
    setIsAuthenticated(true);
    setUser(userData);
    return true;
  };

  const logout = () => {
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};