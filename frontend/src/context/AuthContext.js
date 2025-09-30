import React, { createContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Check if user is already logged in on app startup
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  // Login function
  const login = async (email, password) => {
    try {
      const { data } = await api.post('/users/login', { email, password });
      localStorage.setItem('user', JSON.stringify(data));
      setUser(data);
      navigate('/'); // Redirect to homepage after login
    } catch (error) {
      console.error('Login failed', error.response.data);
      // You can add error handling here, e.g., showing a toast notification
    }
  };

  // Register function
  const register = async (email, password) => {
    try {
      const { data } = await api.post('/users/register', { email, password });
      localStorage.setItem('user', JSON.stringify(data));
      setUser(data);
      navigate('/'); // Redirect to homepage after registration
    } catch (error) {
      console.error('Registration failed', error.response.data);
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login'); // Redirect to login page after logout
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;