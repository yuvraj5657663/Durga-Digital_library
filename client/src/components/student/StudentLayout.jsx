import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, Routes, Route } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Home, User, Calendar, CreditCard, Bell, LogOut, Menu, X } from 'lucide-react';

// Real page components
import StudentDashboard   from '../../pages/student/StudentDashboard';
import ProfilePage        from '../../pages/student/ProfilePage';
import AttendancePage     from '../../pages/student/AttendancePage';
import PaymentsPage       from '../../pages/student/PaymentsPage';
import NotificationsPage  from '../../pages/student/NotificationsPage';

const StudentLayout = () => {
  const { logout, user } = useAuth();
  const location = useLocation();
  const navigate  = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar automatically on route change (mobile UX)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    try { await logout(); } catch {}
    navigate('/login');
  };

  const navigation = [
    { name: 'Dashboard',     href: '/student',               icon: Home      },
    { name: 'Profile',       href: '/student/profile',       icon: User      },
    { name: 'Attendance',    href: '/student/attendance',    icon: Calendar  },
    { name: 'Payments',      href: '/student/payments',      icon: CreditCard},
    { name: 'Notifications', href: '/student/notifications', icon: Bell      },
  ];

  // Exact match for index route, prefix match for the rest
  const isActive = (href) =>
    href === '/student'
      ? location.pathname === '/student' || location.pathname === '/student/'
      : location.pathname.startsWith(href);

  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* ── Mobile backdrop ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-600/75 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── fixed on mobile, static on desktop ── */}
      <div
        className={`
          fixed inset-y-0 left-0 z-50 w-64 flex flex-col flex-shrink-0
          bg-library-blue text-white
          transform transition-transform duration-300 ease-in-out
          lg:relative lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Brand */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-white/10 flex-shrink-0">
          <span className="text-xl font-bold tracking-tight">DDL Portal</span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white/70 hover:text-white"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto mt-4 px-3 space-y-1">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={`
                flex items-center px-3 py-2.5 rounded-lg text-sm font-medium
                transition-colors duration-150
                ${isActive(item.href)
                  ? 'bg-white/20 text-white shadow-sm'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'}
              `}
            >
              <item.icon className="w-5 h-5 mr-3 flex-shrink-0" />
              {item.name}
            </Link>
          ))}
        </nav>

        {/* User info + logout */}
        <div className="p-4 border-t border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3 mb-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold flex-shrink-0">
              {(user?.username || 'S').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.username || 'Student'}</p>
              <p className="text-xs text-white/50 truncate">{user?.email || ''}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-3 py-2 text-sm text-white/70 rounded-lg hover:bg-white/10 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4 mr-3 flex-shrink-0" />
            Logout
          </button>
        </div>
      </div>

      {/* ── Main content — flex-1, no extra left padding ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar */}
        <div className="bg-white border-b border-gray-200 h-14 flex items-center justify-between px-4 shadow-sm flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-500 hover:text-gray-800 p-1"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-sm font-semibold text-gray-800 hidden sm:block">
              Durga Digital Library
            </span>
          </div>
          <div className="text-sm text-gray-500">
            Welcome,{' '}
            <span className="font-semibold text-gray-900">{user?.username || 'Student'}</span>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <Routes>
            <Route index              element={<StudentDashboard  />} />
            <Route path="profile"       element={<ProfilePage       />} />
            <Route path="attendance"    element={<AttendancePage    />} />
            <Route path="payments"      element={<PaymentsPage      />} />
            <Route path="notifications" element={<NotificationsPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default StudentLayout;
