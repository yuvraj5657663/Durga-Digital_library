import { createContext, useContext, useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { authService } from '../services/authService';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const { user, isAuthenticated, setAuth, logout } = useAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (token && !user) {
        try {
          const currentUser = await authService.getCurrentUser();
          setAuth({ 
            user: currentUser, 
            accessToken: token, 
            refreshToken: localStorage.getItem('refreshToken') 
          });
        } catch (error) {
          console.error('Auth check failed:', error);
          logout();
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (credentials) => {
    const user = await authService.login(credentials);
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    setAuth({ user, accessToken, refreshToken });
    return user;
  };

  const handleLogout = async () => {
    await authService.logout();
    logout();
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    login: handleLogin,
    logout: handleLogout,
    isAdmin: user?.role === 'admin',
    isStudent: user?.role === 'student',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
