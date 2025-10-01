import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "./supabaseClient.jsx";

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
      const savedUser = localStorage.getItem('adminUser');
      const savedSession = localStorage.getItem('adminSession');
      
      if (savedUser && savedSession) {
        const userData = JSON.parse(savedUser);
        const sessionData = JSON.parse(savedSession);
        
        // Check if session is still valid (not expired)
        const now = new Date().getTime();
        const sessionExpiry = new Date(sessionData.expiresAt).getTime();
        
        if (now < sessionExpiry) {
          setUser(userData);
          setIsAdmin(true);
        } else {
          // Session expired, clear storage
          localStorage.removeItem('adminUser');
          localStorage.removeItem('adminSession');
        }
      }
    } catch (error) {
      console.error('Session restoration error:', error);
      // Clear invalid session data
      localStorage.removeItem('adminUser');
      localStorage.removeItem('adminSession');
    } finally {
      setLoading(false);
    }
  }

  // Admin login funksiyasi
  async function loginAdmin(username, password) {
    const { data, error } = await supabase
      .from("admin")
      .select("*")
      .eq("username", username)
      .eq("password", password)
      .single();
    
    if (error || !data) return { error: "Username yoki parol xato!" };
    
    // Save session to localStorage
    const sessionData = {
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      createdAt: new Date().toISOString()
    };
    
    localStorage.setItem('adminUser', JSON.stringify(data));
    localStorage.setItem('adminSession', JSON.stringify(sessionData));
    
    setUser(data);
    setIsAdmin(true);
    return { data };
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
      // Update only if current password matches
      const { data, error } = await supabase
        .from("admin")
        .update(payload)
        .eq("id", user.id)
        .eq("password", currentPassword)
        .select()
        .single();

      if (error) return { error: error.message };

      if (!data) return { error: "Joriy parol noto'g'ri" };

      // Persist new user data
      localStorage.setItem('adminUser', JSON.stringify(data));
      setUser(data);
      return { data };
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