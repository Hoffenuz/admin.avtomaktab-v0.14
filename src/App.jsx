import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import Navbar from "./components/Navbar.jsx";
import Login from "./pages/Login.jsx";
import Admin from "./pages/Admin.jsx";
import AdminUsers from "./pages/AdminUsers.jsx";
import AdminDarsliklar from "./pages/AdminDarsliklar.jsx";
import AdminSorovlar from "./pages/AdminSorovlar.jsx";

// Protected Route komponenti
function ProtectedRoute({ children, requireAdmin = false }) {
  const { user, isAdmin, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-secondary-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-secondary-600">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }
  
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
}

function AppRoutes() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-secondary-600">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Admin login */}
      <Route path="/login" element={<Login />} />
      
      {/* Admin routes */}
      <Route 
        path="/admin" 
        element={
          <ProtectedRoute requireAdmin={true}>
            <Admin />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin-users" 
        element={
          <ProtectedRoute requireAdmin={true}>
            <AdminUsers />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin-darsliklar" 
        element={
          <ProtectedRoute requireAdmin={true}>
            <AdminDarsliklar />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin-sorovlar" 
        element={
          <ProtectedRoute requireAdmin={true}>
            <AdminSorovlar />
          </ProtectedRoute>
        } 
      />
      
      {/* Default redirect to admin */}
      <Route path="/" element={<Navigate to="/admin" replace />} />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Navbar />
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App; 