import { createContext, useContext, useState, useEffect } from 'react';
import { login as apiLogin, createPlayer } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('access_token'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (token) {
      const savedUser = localStorage.getItem('user_data');
      if (savedUser) {
        try { setUser(JSON.parse(savedUser)); } catch { /* ignore */ }
      }
    }
  }, [token]);

  const loginAction = async (username, password) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiLogin(username, password);
      setToken(data.access_token);
      const userData = { username, name: username };
      setUser(userData);
      localStorage.setItem('user_data', JSON.stringify(userData));
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const registerAction = async (username, password, name) => {
    setLoading(true);
    setError(null);
    try {
      // Create player with role=professor
      await createPlayer({
        _id: username,
        name: name || username,
        email: username,
        password,
        extra: { role: 'professor' },
      });
      // After creating, login
      const data = await apiLogin(username, password);
      setToken(data.access_token);
      const userData = { username, name: name || username };
      setUser(userData);
      localStorage.setItem('user_data', JSON.stringify(userData));
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_data');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, error, login: loginAction, register: registerAction, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
