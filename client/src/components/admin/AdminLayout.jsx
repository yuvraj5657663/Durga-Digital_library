import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, Routes, Route } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  LayoutDashboard, Users, Calendar, Megaphone,
  FileText, LogOut, Menu, X, Bell, Check, UserPlus
} from 'lucide-react';
import { notificationService } from '../../services/notificationService';
import api from '../../services/api';

// Real page components
import AdminDashboard    from '../../pages/admin/AdminDashboard';
import StudentsPage      from '../../pages/admin/StudentsPage';
import AttendancePage    from '../../pages/admin/AttendancePage';
import AnnouncementsPage from '../../pages/admin/AnnouncementsPage';
import AdmissionsPage    from '../../pages/admin/AdmissionsPage';
import OnlineAdmissionRequests from './OnlineAdmissionRequests';

const AdminLayout = () => {
  const { logout, user } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const qc = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);

  // Fetch pending admission inquiries count
  const { data: pendingAdmissionsData } = useQuery({
    queryKey: ['admission-inquiries-pending-count'],
    queryFn: async () => {
      const response = await api.get('/admission/admissions/pending-count');
      return response.data;
    },
    refetchInterval: 30000,
  });

  const pendingAdmissionsCount = pendingAdmissionsData?.data?.count || 0;

  // Fetch notifications
  const { data: notifData, error: notifError } = useQuery({
    queryKey: ['admin', 'notifications'],
    queryFn: () => notificationService.getNotifications({ limit: 10 }),
    refetchInterval: 60000, // Refetch every minute
    onError: (error) => {
      console.error('Notification fetch error:', error);
      // Don't show toast for notification errors to avoid annoying user
    }
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'notifications'] });
      toast.success('All notifications marked as read');
    },
    onError: () => toast.error('Failed to mark notifications as read'),
  });

  const createTestNotificationMutation = useMutation({
    mutationFn: () => notificationService.createTestNotification({
      title: '🔔 Test Notification',
      body: 'This is a test notification to verify the notification system is working correctly.',
      type: 'custom'
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'notifications'] });
      toast.success('Test notification created');
    },
    onError: () => toast.error('Failed to create test notification'),
  });

  const notifications = notifData?.notifications || [];
  const unreadCount = notifData?.unreadCount || 0;

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Close notification dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationOpen && !event.target.closest('.notification-dropdown')) {
        setNotificationOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [notificationOpen]);

  const handleLogout = async () => {
    try { await logout(); } catch {}
    navigate('/login');
  };

  const navigation = [
    { name: 'Dashboard',   href: '/admin',              icon: LayoutDashboard },
    { name: 'Students',    href: '/admin/students',      icon: Users           },
    { name: 'Attendance',  href: '/admin/attendance',    icon: Calendar        },
    { name: 'Admissions',  href: '/admin/admissions',    icon: FileText        },
    { name: 'Online Admission', href: '/admin/online-admissions', icon: UserPlus, badge: pendingAdmissionsCount },
    { name: 'Announcements', href: '/admin/announcements', icon: Megaphone     },
  ];

  // Active link: exact match for dashboard, prefix match for the rest
  const isActive = (href) =>
    href === '/admin'
      ? location.pathname === '/admin' || location.pathname === '/admin/'
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
          <span className="text-xl font-bold tracking-tight">DDL Admin</span>
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
              <span className="flex-1">{item.name}</span>
              {item.badge > 0 && (
                <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}
            </Link>
          ))}
        </nav>

        {/* User + Logout */}
        <div className="p-4 border-t border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3 mb-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold flex-shrink-0">
              {(user?.username || 'A').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.username || 'Admin'}</p>
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

      {/* ── Main content area ── flex-1, no extra left padding ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar */}
        <div className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 lg:px-6 shadow-sm flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-500 hover:text-gray-900 p-1"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold text-gray-900 hidden sm:block">
              Durga Digital Library
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="notification-dropdown relative">
              <button
                onClick={() => setNotificationOpen(!notificationOpen)}
                className="relative text-gray-500 hover:text-gray-900 p-1"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {notificationOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  <div className="p-3 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          createTestNotificationMutation.mutate();
                        }}
                        disabled={createTestNotificationMutation.isPending}
                        className="text-xs text-purple-600 hover:text-purple-800 font-medium disabled:opacity-50"
                        title="Create test notification"
                      >
                        + Test
                      </button>
                      {unreadCount > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAllAsReadMutation.mutate();
                          }}
                          disabled={markAllAsReadMutation.isPending}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
                        >
                          {markAllAsReadMutation.isPending ? 'Marking...' : 'Mark all as read'}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifError ? (
                      <div className="p-4 text-center text-red-500 text-sm">
                        Failed to load notifications
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="p-4 text-center text-gray-500 text-sm">
                        No notifications
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id || notif._id}
                          className={`p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                            !notif.isRead ? 'bg-blue-50/50' : ''
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            {!notif.isRead && (
                              <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {notif.title}
                              </p>
                              <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">
                                {notif.body}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">
                                {notif.createdAt ? new Date(notif.createdAt).toLocaleString() : 'Just now'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            <span className="text-sm text-gray-600 hidden sm:block">
              Welcome, <span className="font-semibold text-gray-900">{user?.username || 'Admin'}</span>
            </span>
            <button
              onClick={handleLogout}
              className="text-gray-500 hover:text-gray-900 p-1"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <Routes>
            <Route index                  element={<AdminDashboard />} />
            <Route path="students"        element={<StudentsPage />} />
            <Route path="attendance"      element={<AttendancePage />} />
            <Route path="admissions"      element={<AdmissionsPage />} />
            <Route path="online-admissions" element={<OnlineAdmissionRequests />} />
            <Route path="announcements"   element={<AnnouncementsPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
