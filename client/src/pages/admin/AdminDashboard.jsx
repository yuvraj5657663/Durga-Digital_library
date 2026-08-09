import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  Users, UserCheck, UserX, Clock, Plus, TrendingUp,
  AlertTriangle, Armchair, FileText, IndianRupee
} from 'lucide-react';
import { studentService } from '../../services/studentService';
import AddStudentModal from './components/AddStudentModal';
import SeatMatrixGrid from '../../components/admin/SeatMatrixGrid';

// ── Skeleton ──────────────────────────────────────────────────────────────────
const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
);

// ── Stat card ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, icon: Icon, color, sub, loading }) => (
  <div className="card flex items-center gap-4">
    <div className={`p-3 rounded-xl ${color} flex-shrink-0`}>
      <Icon className="w-6 h-6 text-white" />
    </div>
    <div className="min-w-0">
      <p className="text-sm text-gray-500 truncate">{label}</p>
      {loading
        ? <Skeleton className="h-8 w-16 mt-1" />
        : <p className="text-3xl font-bold text-gray-900">{value ?? 0}</p>}
      {sub && !loading && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  </div>
);

const COLORS = ['#1b365d', '#2563eb', '#10b981', '#f59e0b', '#ef4444'];

export default function AdminDashboard() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [selectedShift, setSelectedShift] = useState('Shift 1');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => studentService.getDashboardStats(),
    refetchInterval: 60_000,
  });

  const handleSeatClick = (seat) => {
    console.log('Seat clicked in dashboard:', seat);
    if (seat.status === 'available') {
      setSelectedSeat(seat.id);
      setModalOpen(true);
    } else {
      // Handle occupied seat click - could open student profile drawer
      toast.info(`Seat ${seat.id} is occupied by ${seat.student?.name || 'Unknown'}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Seat Matrix Grid - Replaces white space */}
      <SeatMatrixGrid 
        onSeatClick={handleSeatClick}
        selectedShift={selectedShift}
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Students"      value={stats?.total}           icon={Users}         color="bg-library-blue"  loading={isLoading} />
        <StatCard label="Active"              value={stats?.active}          icon={UserCheck}     color="bg-green-500"     loading={isLoading} sub="currently enrolled" />
        <StatCard label="Expiring ≤ 5 days"  value={stats?.expiringSoon}    icon={AlertTriangle} color="bg-yellow-500"    loading={isLoading} />
        <StatCard label="Expired"             value={stats?.expired}         icon={Clock}         color="bg-red-500"       loading={isLoading} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Today's Attendance"  value={stats?.todayAttendance} icon={UserCheck}     color="bg-purple-500"    loading={isLoading} />
        <StatCard label="Monthly Revenue"     value={stats ? `₹${(stats.monthRevenue||0).toLocaleString('en-IN')}` : '—'} icon={IndianRupee} color="bg-emerald-600" loading={isLoading} />
        <StatCard label="Seats Occupied"      value={stats?.seatsOccupied}   icon={Armchair}      color="bg-indigo-500"    loading={isLoading} />
        <StatCard label="Pending Admissions"  value={stats?.pendingAdmissions} icon={FileText}    color="bg-orange-500"    loading={isLoading}
          sub={stats?.pendingAdmissions > 0 ? 'needs review' : undefined} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance trend */}
        <div className="card lg:col-span-2">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Attendance — Last 7 Days</h2>
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats?.attendanceTrend || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => v?.slice(5)} 
                />
                <YAxis 
                  tick={{ fontSize: 11 }} 
                  allowDecimals={false} 
                />
                <Tooltip 
                  formatter={(v) => [v, 'Students']}
                  labelFormatter={(l) => `Date: ${l}`} 
                />
                <Bar dataKey="count" fill="#1b365d" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Shift occupancy pie */}
        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Shift Occupancy</h2>
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : (stats?.shiftOccupancy?.length || 0) === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie 
                  data={stats.shiftOccupancy} 
                  dataKey="count" 
                  nameKey="shift"
                  cx="50%" 
                  cy="50%" 
                  outerRadius={72} 
                  labelLine={false}
                  label={(entry) => `${entry.shift}: ${entry.count}`}
                >
                  {stats.shiftOccupancy.map((entry, i) => (
                    <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Revenue trend */}
      <div className="card">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Monthly Revenue (₹)</h2>
        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={stats?.revenueByMonth || []}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 11 }} 
              />
              <YAxis 
                tick={{ fontSize: 11 }} 
                tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} 
              />
              <Tooltip 
                formatter={(v) => [`₹${v.toLocaleString('en-IN')}`, 'Revenue']} 
              />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="#1b365d" 
                strokeWidth={2.5}
                dot={{ r: 4 }} 
                activeDot={{ r: 6 }} 
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Quick actions */}
      <div className="card">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button onClick={() => setModalOpen(true)} className="btn btn-primary flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" /> Add Student
          </button>
          <button onClick={() => navigate('/admin/attendance')} className="btn btn-secondary">Mark Attendance</button>
          <button onClick={() => navigate('/admin/admissions')} className="btn btn-secondary flex items-center justify-center gap-2">
            {stats?.pendingAdmissions > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold bg-red-500 text-white rounded-full">
                {stats.pendingAdmissions > 9 ? '9+' : stats.pendingAdmissions}
              </span>
            )}
            Admissions
          </button>
          <button onClick={() => navigate('/admin/announcements')} className="btn btn-secondary">Announcement</button>
        </div>
      </div>

      {/* Add Student Modal */}
      <AddStudentModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedSeat(null);
        }}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
          queryClient.invalidateQueries({ queryKey: ['admin', 'students'] });
        }}
        selectedSeat={selectedSeat}
      />
    </div>
  );
}
