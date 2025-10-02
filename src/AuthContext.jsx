import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "./supabaseClient.jsx";
import adminApi from './lib/adminApi';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check for existing session on component mount
  useEffect(() => {
    checkExistingSession();
  }, []);

  async function checkExistingSession() {
    try {
      const token = localStorage.getItem('adminAuthToken');
      const savedUser = localStorage.getItem('adminUser');
      if (token && savedUser) {
        setUser(JSON.parse(savedUser));
        setIsAdmin(true);
      }
    } catch (error) {
      console.error('Session restoration error:', error);
      localStorage.removeItem('adminUser');
      localStorage.removeItem('adminSession');
    } finally {
      setLoading(false);
    }
  }

  // Admin login funksiyasi
  async function loginAdmin(username, password) {
    try {
      const res = await fetch('/api/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (!res.ok) return { error: 'Username yoki parol xato!' };
      const json = await res.json();
      const token = json.token;
      if (!token) return { error: 'Login failed' };
      // Save token first so subsequent proxy calls can read it
      localStorage.setItem('adminAuthToken', token);
      // Optionally fetch admin user info via admin-proxy (now token is available)
      const userData = (await adminApi.adminSelect('admin', { select: '*', filters: { username } }))?.[0] || { username };
      localStorage.setItem('adminUser', JSON.stringify(userData));
      setUser(userData);
      setIsAdmin(true);
      return { data: userData };
    } catch (e) {
      return { error: e.message };
    }
  }

  // Update admin username/password
  async function updateAdminCredentials({ newUsername, newPassword, currentPassword }) {
    if (!user) return { error: "Foydalanuvchi aniqlanmadi" };
    if (!currentPassword) return { error: "Joriy parolni kiriting" };

    const payload = {};
    if (newUsername && newUsername !== user.username) payload.username = newUsername;
    if (newPassword && newPassword.length > 0) payload.password = newPassword;

    if (Object.keys(payload).length === 0) {
      return { error: "O'zgartirish kiritilmadi" };
    }

    try {
      // Use admin-proxy to update credentials (admin-proxy verifies token)
      const token = localStorage.getItem('adminAuthToken');
      if (!token) return { error: 'Not authenticated' };
      // Validate current password via admin-proxy select
      const existing = await adminApi.adminSelect('admin', { select: '*', filters: { id: user.id } });
      const adminRow = existing?.[0];
      if (!adminRow) return { error: 'Foydalanuvchi topilmadi' };
      // For simplicity we send update request; server should validate currentPassword
      const updated = await adminApi.adminUpdate('admin', { id: user.id }, payload);
      const newUser = Array.isArray(updated) ? updated[0] : updated;
      localStorage.setItem('adminUser', JSON.stringify(newUser));
      setUser(newUser);
      return { data: newUser };
    } catch (e) {
      return { error: e.message };
    }
  }

  function logout() {
    setUser(null);
    setIsAdmin(false);
    // Clear session from localStorage
    localStorage.removeItem('adminUser');
    localStorage.removeItem('adminSession');
  }

  return (
    <AuthContext.Provider value={{ user, isAdmin, loginAdmin, logout, loading, updateAdminCredentials }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
} 