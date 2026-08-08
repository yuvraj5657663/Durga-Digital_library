import { useQuery } from '@tanstack/react-query';
import { portalService } from '../../services/portalService';
import { Calendar, CreditCard, Bell, CheckCircle } from 'lucide-react';

const StudentDashboard = () => {
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['student', 'dashboard'],
    queryFn: () => portalService.getDashboard(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-library-blue"></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Welcome, {dashboard?.student?.name || 'Student'}</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Membership Status</p>
              <p className="text-lg font-bold text-gray-900 mt-2">
                {dashboard?.membership?.status || 'N/A'}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-green-500">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Expiry Date</p>
              <p className="text-lg font-bold text-gray-900 mt-2">
                {dashboard?.membership?.expiryDate || 'N/A'}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-blue-500">
              <Calendar className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Today's Attendance</p>
              <p className="text-lg font-bold text-gray-900 mt-2">
                {dashboard?.todayAttendance?.checkIn ? 'Present' : 'Not marked'}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-purple-500">
              <Calendar className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Unread Notifications</p>
              <p className="text-lg font-bold text-gray-900 mt-2">
                {dashboard?.unreadNotifications || 0}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-yellow-500">
              <Bell className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Information</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Seat Code:</span>
              <span className="font-medium">{dashboard?.student?.seatCode || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Shift:</span>
              <span className="font-medium">{dashboard?.student?.shift || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Mobile:</span>
              <span className="font-medium">{dashboard?.student?.mobile || 'N/A'}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button className="btn btn-primary w-full">View ID Card</button>
            <button className="btn btn-secondary w-full">View Attendance History</button>
            <button className="btn btn-secondary w-full">View Payment History</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
