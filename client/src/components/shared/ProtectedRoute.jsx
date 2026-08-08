import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const ProtectedRoute = ({ children, requiredRole }) => {
  const { isAuthenticated, isAdmin, isStudent } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole === 'admin' && !isAdmin) {
    return <Navigate to="/student" replace />;
  }

  if (requiredRole === 'student' && !isStudent) {
    return <Navigate to="/admin" replace />;
  }

  return children;
};

export default ProtectedRoute;
