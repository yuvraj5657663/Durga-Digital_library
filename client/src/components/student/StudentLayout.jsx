import { Link, useNavigate, Routes, Route } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Home, User, Calendar, CreditCard, Bell, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';
import StudentDashboard from '../../pages/student/StudentDashboard';

const StudentLayout = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navigation = [
    { name: 'Dashboard', href: '/student', icon: Home },
    { name: 'Profile', href: '/student/profile', icon: User },
    { name: 'Attendance', href: '/student/attendance', icon: Calendar },
    { name: 'Payments', href: '/student/payments', icon: CreditCard },
    { name: 'Notifications', href: '/student/notifications', icon: Bell },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-library-blue text-white transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-6 bg-library-blue">
          <div className="flex items-center">
            <span className="text-xl font-bold">DDL Portal</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white hover:text-gray-200"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="mt-6 px-4 space-y-2">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className="flex items-center px-4 py-3 text-white rounded-lg hover:bg-white hover:bg-opacity-10 transition-colors"
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4">
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-3 text-white rounded-lg hover:bg-white hover:bg-opacity-10 transition-colors"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Logout
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 lg:px-8">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-600 hover:text-gray-900"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              Welcome, <span className="font-medium">{user?.username || 'Student'}</span>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="p-4 lg:p-8">
          <Routes>
            <Route index element={<StudentDashboard />} />
            <Route path="profile" element={<div>Profile Page</div>} />
            <Route path="attendance" element={<div>Attendance Page</div>} />
            <Route path="payments" element={<div>Payments Page</div>} />
            <Route path="notifications" element={<div>Notifications Page</div>} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default StudentLayout;
