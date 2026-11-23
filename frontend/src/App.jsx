import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';

// Layouts
import StudentLayout from './components/StudentLayout';
import AdminLayout from './components/AdminLayout';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Student Pages
import StudentDashboard from './pages/student/StudentDashboard';
import MyGroup from './pages/student/MyGroup';
import StudentAssignments from './pages/student/StudentAssignments';
import Profile from './pages/student/Profile';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import ManageAssignments from './pages/admin/ManageAssignments';
import ManageGroups from './pages/admin/ManageGroups';
import SubmissionTracking from './pages/admin/SubmissionTracking';
import AdminAnalytics from './pages/admin/AdminAnalytics';

// Root Redirect component based on auth state and role
function RootRedirect() {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) return null;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Student Protected Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute allowedRole="student">
                  <StudentLayout />
                </ProtectedRoute>
              }
            >
              <Route path="dashboard" element={<StudentDashboard />} />
              <Route path="group" element={<MyGroup />} />
              <Route path="assignments" element={<StudentAssignments />} />
              <Route path="profile" element={<Profile />} />
            </Route>

            {/* Admin Protected Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRole="admin">
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="assignments" element={<ManageAssignments />} />
              <Route path="groups" element={<ManageGroups />} />
              <Route path="submissions" element={<SubmissionTracking />} />
              <Route path="analytics" element={<AdminAnalytics />} />
            </Route>

            {/* Default & Fallback */}
            <Route path="/" element={<RootRedirect />} />
            <Route path="*" element={<RootRedirect />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}