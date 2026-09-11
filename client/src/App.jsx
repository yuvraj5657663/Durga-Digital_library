import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/shared/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import LandingPage from './pages/LandingPage';
import AdminLayout from './components/admin/AdminLayout';
import StudentLayout from './components/student/StudentLayout';

const STAFF_ROLES = ['admin', 'SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'ACCOUNTANT', 'LIBRARIAN', 'SUPPORT'];

function AppRoutes() {
  const { isAuthenticated, loading, isAdmin, user } = useAuth();

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Landing page - public route */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      
      {/* Admin Routes */}
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminLayout />
          </ProtectedRoute>
        }
      />
      
      {/* Student Routes */}
      <Route
        path="/student/*"
        element={
          <ProtectedRoute requiredRole="student">
            <StudentLayout />
          </ProtectedRoute>
        }
      />
      
      {/* Default redirect based on role */}
      <Route
        path="/dashboard"
        element={
          isAuthenticated ? (
            <Navigate to={STAFF_ROLES.includes(user?.role) ? '/admin' : '/student'} replace />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      
      {/* Catch all - redirect to landing page */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
