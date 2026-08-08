import { useQuery } from '@tanstack/react-query';
import { studentService } from '../../services/studentService';
import { Users, UserCheck, UserX, Clock } from 'lucide-react';

const AdminDashboard = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => studentService.getDashboardStats(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-library-blue"></div>
      </div>
    );
  }

  const statCards = [
    {
      name: 'Total Students',
      value: stats?.total || 0,
      icon: Users,
      color: 'bg-blue-500',
    },
    {
      name: 'Active Students',
      value: stats?.active || 0,
      icon: UserCheck,
      color: 'bg-green-500',
    },
    {
      name: 'Inactive Students',
      value: stats?.inactive || 0,
      icon: UserX,
      color: 'bg-yellow-500',
    },
    {
      name: 'Expired Memberships',
      value: stats?.expired || 0,
      icon: Clock,
      color: 'bg-red-500',
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat) => (
          <div key={stat.name} className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="btn btn-primary">Add New Student</button>
          <button className="btn btn-secondary">Mark Attendance</button>
          <button className="btn btn-secondary">Create Announcement</button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
