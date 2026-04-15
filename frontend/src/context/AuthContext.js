import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('ea_token');
    const saved = localStorage.getItem('ea_user');
    if (token && saved) {
      try { setUser(JSON.parse(saved)); } catch { logout(); }
    }
    setLoading(false);
  }, []);

  const _save = (token, user) => {
    localStorage.setItem('ea_token', token);
    localStorage.setItem('ea_user', JSON.stringify(user));
    setUser(user);
    return user;
  };

  const adminLogin     = async (loginId, password) => { const r = await authAPI.adminLogin({ loginId, password });     return _save(r.data.token, r.data.user); };
  const instituteLogin = async (loginId, password) => { const r = await authAPI.instituteLogin({ loginId, password }); return _save(r.data.token, r.data.user); };
  const studentLogin   = async (loginId, password) => { const r = await authAPI.studentLogin({ loginId, password });   return _save(r.data.token, r.data.user); };

  const logout = () => {
    localStorage.removeItem('ea_token');
    localStorage.removeItem('ea_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user, loading, logout,
      adminLogin, instituteLogin, studentLogin,
      isAdmin:     user?.role === 'superadmin',
      isInstitute: user?.role === 'institute',
      isStudent:   user?.role === 'student',
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
