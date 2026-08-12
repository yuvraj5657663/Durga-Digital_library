import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/shared/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import LandingPage from './pages/LandingPage';
import AdminLayout from './components/admin/AdminLayout';
import StudentLayout from './components/student/StudentLayout';

function AppRoutes() {
  const { isAuthenticated, loading, isAdmin } = useAuth();

  // Landing page दिखाएं जब loading हो या जब user authenticated न हो
  if (loading) {
    return <LandingPage />;
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
            <Navigate to={isAdmin ? '/admin' : '/student'} replace />
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
