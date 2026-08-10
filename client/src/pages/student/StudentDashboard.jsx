import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import toast from 'react-hot-toast';
import {
  Calendar, CreditCard, Bell, CheckCircle, Clock,
  Armchair, User, ChevronRight, Loader2, AlertTriangle,
  History, RefreshCw
} from 'lucide-react';
import { portalService } from '../../services/portalService';
import AspirantQuoteCard from '../../components/student/AspirantQuoteCard';
import RenewalModal from '../../components/student/RenewalModal';
import { differenceInDays, parseISO } from 'date-fns';

/* ─── Skeleton block ────────────────────────────────────────────────────────── */
const Sk = ({ className = '' }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
);

/* ─── Membership countdown badge ───────────────────────────────────────────── */
function ExpiryBadge({ expiryDate }) {
  if (!expiryDate) return null;
  const days = differenceInDays(parseISO(expiryDate), new Date());
  if (days > 30) return null; // only show when ≤ 30 days
  const cls = days > 7
    ? 'bg-yellow-100 text-yellow-700 border border-yellow-200'
    : days >= 0
      ? 'bg-red-100 text-red-700 border border-red-200'
      : 'bg-gray-100 text-gray-500 border border-gray-200';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      <AlertTriangle className="w-3 h-3" />
      {days > 0 ? `${days}d left` : days === 0 ? 'Expires today' : 'Expired'}
    </span>
  );
}

/* ─── Today Attendance Card with self check-in/out ──────────────────────────────── */
function TodayAttendanceCard({ todayAttendance, isLoading, student }) {
  const qc = useQueryClient();
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  const checkInMutation = useMutation({
    mutationFn: () => portalService.selfCheckIn(),
    onSuccess: (record) => {
      toast.success(`✅ Attendance marked at ${record?.checkIn || timeStr}!`, { duration: 4000 });
      // Invalidate both student dashboard and admin attendance so both panels update
      qc.invalidateQueries({ queryKey: ['student', 'dashboard'] });
      qc.invalidateQueries({ queryKey: ['admin', 'attendance']  });
      qc.invalidateQueries({ queryKey: ['admin', 'stats']       });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Check-in failed. Please try again.');
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: () => portalService.selfCheckOut(),
    onSuccess: (record) => {
      toast.success(`✅ Check-out marked at ${record?.checkOut || timeStr}!`, { duration: 4000 });
      // Invalidate both student dashboard and admin attendance so both panels update
      qc.invalidateQueries({ queryKey: ['student', 'dashboard'] });
      qc.invalidateQueries({ queryKey: ['admin', 'attendance']  });
      qc.invalidateQueries({ queryKey: ['admin', 'stats']       });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Check-out failed. Please try again.');
    },
  });

  const isPresent  = !!todayAttendance?.checkIn;
  const isCheckedOut = !!todayAttendance?.checkOut;
  const checkInAt  = todayAttendance?.checkIn;
  const checkOutAt = todayAttendance?.checkOut;
  const duration   = todayAttendance?.durationMins;
  const studentShift = student?.shift || 'Shift 1';

  return (
    <div className={`card flex flex-col gap-3 ${isCheckedOut ? 'border-l-4 border-blue-500' : isPresent ? 'border-l-4 border-green-500' : 'border-l-4 border-orange-400'}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Today's Attendance</p>
          <p className="text-xs text-gray-400 mt-1">Shift: {studentShift}</p>
          {isLoading
            ? <Sk className="h-6 w-24 mt-2" />
            : isCheckedOut
              ? (
                  <div className="mt-1.5">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-bold bg-blue-100 text-blue-700">
                      <Clock className="w-4 h-4" /> Completed
                    </span>
                    <p className="text-xs text-gray-400 mt-1">In: {checkInAt} | Out: {checkOutAt}</p>
                    {duration && <p className="text-xs text-gray-400">Duration: {duration} min</p>}
                  </div>
                )
              : isPresent
                ? (
                    <div className="mt-1.5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-bold bg-green-100 text-green-700">
                        <CheckCircle className="w-4 h-4" /> Present
                      </span>
                      <p className="text-xs text-gray-400 mt-1">Checked in at {checkInAt}</p>
                    </div>
                  )
                : (
                    <p className="text-sm font-semibold text-orange-600 mt-1.5 flex items-center gap-1">
                      <Clock className="w-4 h-4" /> Not marked yet
                    </p>
                  )}
        </div>
        <div className={`p-2.5 rounded-xl ${isCheckedOut ? 'bg-blue-100' : isPresent ? 'bg-green-100' : 'bg-orange-100'}`}>
          <Calendar className={`w-5 h-5 ${isCheckedOut ? 'text-blue-600' : isPresent ? 'text-green-600' : 'text-orange-500'}`} />
        </div>
      </div>

      {/* Mark Attendance buttons */}
      {!isLoading && !isPresent && (
        <button
          onClick={() => checkInMutation.mutate()}
          disabled={checkInMutation.isPending}
          className="w-full mt-1 flex items-center justify-center gap-2 py-2.5
            bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold
            rounded-lg transition-colors active:scale-95 disabled:opacity-60"
        >
          {checkInMutation.isPending
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Marking…</>
            : <><CheckCircle className="w-4 h-4" /> Mark My Attendance</>
          }
        </button>
      )}

      {!isLoading && isPresent && !isCheckedOut && (
        <button
          onClick={() => checkOutMutation.mutate()}
          disabled={checkOutMutation.isPending}
          className="w-full mt-1 flex items-center justify-center gap-2 py-2.5
            bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold
            rounded-lg transition-colors active:scale-95 disabled:opacity-60"
        >
          {checkOutMutation.isPending
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Checking out…</>
            : <><Clock className="w-4 h-4" /> Check Out</>
          }
        </button>
      )}
    </div>
  );
}

/* ─── Main Dashboard ─────────────────────────────────────────────────────────── */
export default function StudentDashboard() {
  const navigate = useNavigate();
  const [renewalModalOpen, setRenewalModalOpen] = useState(false);

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['student', 'dashboard'],
    queryFn:  () => portalService.getDashboard(),
    staleTime: 30_000,
  });

  const student    = dashboard?.student;
  const membership = dashboard?.membership;
  const todayAtt   = dashboard?.todayAttendance;
  const unreadN    = dashboard?.unreadNotifications || 0;

  const daysLeft = membership?.expiryDate
    ? differenceInDays(parseISO(membership.expiryDate), new Date())
    : null;

  return (
    <div className="space-y-5">

      {/* ── Greeting ── */}
      <div className="flex items-center justify-between">
        <div>
          {isLoading
            ? <Sk className="h-8 w-48" />
            : <h1 className="text-2xl font-bold text-gray-900">
                Namaste, {student?.name?.split(' ')[0] || 'Student'} 👋
              </h1>}
          <p className="text-sm text-gray-500 mt-0.5">
            {new Date().toLocaleDateString('en-IN', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
            })}
          </p>
        </div>
        {unreadN > 0 && (
          <button
            onClick={() => navigate('/student/notifications')}
            className="relative text-gray-500 hover:text-library-blue transition-colors"
            title={`${unreadN} unread notifications`}
          >
            <Bell className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadN > 9 ? '9+' : unreadN}
            </span>
          </button>
        )}
      </div>

      {/* ── 4 Metric Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Membership Status */}
        <div className={`card flex flex-col gap-2 ${
          membership?.status === 'Active' ? 'border-l-4 border-green-500' : 'border-l-4 border-red-400'
        }`}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Membership</p>
            <div className={`p-2 rounded-lg ${membership?.status === 'Active' ? 'bg-green-100' : 'bg-red-100'}`}>
              <CheckCircle className={`w-4 h-4 ${membership?.status === 'Active' ? 'text-green-600' : 'text-red-500'}`} />
            </div>
          </div>
          {isLoading
            ? <Sk className="h-6 w-16" />
            : <>
                <p className={`text-lg font-bold ${membership?.status === 'Active' ? 'text-green-700' : 'text-red-600'}`}>
                  {membership?.status || 'N/A'}
                </p>
                <ExpiryBadge expiryDate={membership?.expiryDate} />
                <button
                  onClick={() => setRenewalModalOpen(true)}
                  className="mt-2 w-full flex items-center justify-center gap-2 py-2 bg-library-blue hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  <RefreshCw className="w-4 h-4" /> Renew
                </button>
              </>}
        </div>

        {/* Expiry Date */}
        <div className="card flex flex-col gap-2 border-l-4 border-blue-400">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Valid Until</p>
            <div className="p-2 rounded-lg bg-blue-100">
              <Calendar className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          {isLoading
            ? <Sk className="h-6 w-24" />
            : <>
                <p className="text-base font-bold text-gray-900">{membership?.expiryDate || 'N/A'}</p>
                {daysLeft !== null && daysLeft >= 0 && (
                  <p className="text-xs text-gray-400">{daysLeft} day{daysLeft !== 1 ? 's' : ''} remaining</p>
                )}
              </>}
        </div>

        {/* Today Attendance — full card with check-in button */}
        <div className="col-span-2 lg:col-span-1">
          <TodayAttendanceCard todayAttendance={todayAtt} isLoading={isLoading} student={student} />
        </div>

        {/* Unread Notifications */}
        <div
          onClick={() => navigate('/student/notifications')}
          className="card flex flex-col gap-2 border-l-4 border-yellow-400 cursor-pointer hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Notifications</p>
            <div className="p-2 rounded-lg bg-yellow-100">
              <Bell className="w-4 h-4 text-yellow-600" />
            </div>
          </div>
          {isLoading
            ? <Sk className="h-6 w-10" />
            : <p className={`text-2xl font-bold ${unreadN > 0 ? 'text-yellow-600' : 'text-gray-900'}`}>
                {unreadN}
              </p>}
          <p className="text-xs text-gray-400">unread message{unreadN !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* ── Info + Quick Actions ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Your Information */}
        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <User className="w-4 h-4 text-library-blue" /> Your Information
          </h2>
          <div className="space-y-3 text-sm">
            {[
              { label: 'Seat Code',  value: student?.seatCode   || 'N/A', icon: <Armchair className="w-3.5 h-3.5" /> },
              { label: 'Shift',      value: student?.shift      || 'N/A', icon: <Clock    className="w-3.5 h-3.5" /> },
              { label: 'Student ID', value: student?.studentId  || 'N/A', icon: <User     className="w-3.5 h-3.5" /> },
              { label: 'Mobile',     value: student?.mobile     || 'N/A', icon: null },
              { label: 'Preparation',value: student?.preparation|| 'N/A', icon: null },
            ].map(({ label, value, icon }) => (
              <div key={label} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                <span className="text-gray-500 flex items-center gap-1.5">
                  {icon}<span>{label}</span>
                </span>
                {isLoading
                  ? <Sk className="h-4 w-20" />
                  : <span className="font-semibold text-gray-900 text-right">{value}</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-2.5">

            <button
              onClick={() => navigate('/student/profile', { state: { openIdCard: true } })}
              className="w-full flex items-center justify-between px-4 py-3 rounded-lg
                bg-library-blue text-white text-sm font-semibold
                hover:bg-blue-800 transition-colors active:scale-[.99]"
            >
              <span className="flex items-center gap-2"><User className="w-4 h-4" /> View ID Card</span>
              <ChevronRight className="w-4 h-4 opacity-70" />
            </button>

            <button
              onClick={() => navigate('/student/attendance')}
              className="w-full flex items-center justify-between px-4 py-3 rounded-lg
                border border-gray-200 bg-white text-gray-700 text-sm font-semibold
                hover:bg-gray-50 transition-colors active:scale-[.99]"
            >
              <span className="flex items-center gap-2">
                <History className="w-4 h-4 text-library-blue" /> View Attendance History
              </span>
              <ChevronRight className="w-4 h-4 opacity-40" />
            </button>

            <button
              onClick={() => navigate('/student/payments')}
              className="w-full flex items-center justify-between px-4 py-3 rounded-lg
                border border-gray-200 bg-white text-gray-700 text-sm font-semibold
                hover:bg-gray-50 transition-colors active:scale-[.99]"
            >
              <span className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-library-blue" /> View Payment History
              </span>
              <ChevronRight className="w-4 h-4 opacity-40" />
            </button>

            <button
              onClick={() => navigate('/student/notifications')}
              className="w-full flex items-center justify-between px-4 py-3 rounded-lg
                border border-gray-200 bg-white text-gray-700 text-sm font-semibold
                hover:bg-gray-50 transition-colors active:scale-[.99]"
            >
              <span className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-library-blue" />
                Notifications
                {unreadN > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full">
                    {unreadN}
                  </span>
                )}
              </span>
              <ChevronRight className="w-4 h-4 opacity-40" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Daily Motivational Quote Banner (fills bottom white space) ── */}
      <AspirantQuoteCard />

      {/* ── Renewal Modal ── */}
      <RenewalModal 
        open={renewalModalOpen} 
        onClose={() => setRenewalModalOpen(false)}
        currentExpiry={membership?.expiryDate}
      />
    </div>
  );
}
