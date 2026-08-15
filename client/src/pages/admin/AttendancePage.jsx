import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Search, CheckCircle, XCircle, Clock, RefreshCw, ChevronLeft, ChevronRight, Users, LogOut, AlertTriangle } from 'lucide-react';
import { attendanceService } from '../../services/attendanceService';
import { studentService } from '../../services/studentService';
import { shiftService } from '../../services/shiftService';

const today = new Date().toISOString().slice(0, 10);
const LIMIT = 50;

// Shift timing configuration (must match backend shiftConfig.js)
const SHIFT_CONFIG = {
  'Shift 1': { startTime: '06:00', endTime: '11:00', description: 'Morning (6 AM – 11 AM)' },
  'Shift 2': { startTime: '11:00', endTime: '16:00', description: 'Afternoon (11 AM – 4 PM)' },
  'Shift 3': { startTime: '16:00', endTime: '21:00', description: 'Evening (4 PM – 9 PM)' },
  'Shift 4': { startTime: '06:00', endTime: '21:00', description: 'Full Day (6 AM – 9 PM)' },
  'Night Shift': { startTime: '21:00', endTime: '06:00', description: 'Night (9 PM – 6 AM)' },
  'Custom': { startTime: null, endTime: null, description: 'Custom Shift' }
};

// Helper function to convert time string to minutes
function timeToMinutes(timeStr) {
  if (!timeStr) return null;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

// Helper function to get current time in minutes
function getCurrentMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

// Helper function to determine attendance status
function getAttendanceStatus(attendance, studentShift) {
  if (!attendance?.checkIn) {
    return { status: 'Absent', color: 'red', isOverstay: false };
  }

  const shiftConfig = SHIFT_CONFIG[studentShift] || SHIFT_CONFIG['Shift 1'];
  const checkInMinutes = timeToMinutes(attendance.checkIn);
  const shiftStartMinutes = timeToMinutes(shiftConfig.startTime);
  const shiftEndMinutes = timeToMinutes(shiftConfig.endTime);
  const currentMinutes = getCurrentMinutes();

  // Determine if checked in
  const isCheckedIn = !attendance.checkOut;
  const isCheckedOut = !!attendance.checkOut;

  // Late entry: check-in time is after shift start time
  const isLateEntry = shiftStartMinutes && checkInMinutes > shiftStartMinutes;

  // Overstay: current time > shift end time AND student has NOT checked out OR checked out late
  const isOverstay = shiftEndMinutes && currentMinutes > shiftEndMinutes && isCheckedIn;
  const isLateCheckout = shiftEndMinutes && attendance.checkOut && timeToMinutes(attendance.checkOut) > shiftEndMinutes;

  if (isOverstay) {
    return { status: 'Overstay / Shift Ended', color: 'red', isOverstay: true };
  }

  if (isLateCheckout) {
    return { status: 'Late Check-out', color: 'orange', isOverstay: false };
  }

  if (isCheckedIn) {
    if (isLateEntry) {
      return { status: 'Late Entry', color: 'orange', isOverstay: false };
    }
    return { status: 'Present (In Shift)', color: 'green', isOverstay: false };
  }

  if (isCheckedOut) {
    if (isLateEntry) {
      return { status: 'Late Entry - Checked Out', color: 'blue', isOverstay: false };
    }
    return { status: 'Checked Out', color: 'blue', isOverstay: false };
  }

  return { status: 'Present', color: 'green', isOverstay: false };
}

export default function AttendancePage() {
  const qc      = useQueryClient();
  const [date,  setDate]  = useState(today);
  const [shift, setShift] = useState('');
  const [search,setSearch]= useState('');
  const [page,  setPage]  = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Auto-refresh attendance every minute for real-time status updates
  useEffect(() => {
    const interval = setInterval(() => {
      if (date === today) { // Only auto-refresh for today's attendance
        refetchAttendance();
      }
    }, 60000); // Refresh every 60 seconds

    return () => clearInterval(interval);
  }, [date, today]);

  // Fetch dynamic shifts
  const { data: shiftsData } = useQuery({
    queryKey: ['admin', 'shifts'],
    queryFn: () => shiftService.getShifts(),
    staleTime: 10 * 60_000,
  });

  // Fetch ALL active students for the roster
  const { data: studentData, isLoading: studentsLoading } = useQuery({
    queryKey: ['admin', 'students', 'all', shift],
    queryFn:  () => studentService.getStudents({ limit: 200, status: 'Active', shift }),
    staleTime: 2 * 60_000,
  });

  // Fetch today's attendance
  const { data: attendanceData, isLoading: attLoading, refetch: refetchAttendance } = useQuery({
    queryKey: ['admin', 'attendance', date, shift],
    queryFn:  () => attendanceService.getAttendance({ date, shift, limit: 200 }),
  });

  // Stats
  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['admin', 'attendance', 'stats', date],
    queryFn:  () => attendanceService.getAttendanceStats({ date }),
  });

  const markMutation = useMutation({
    mutationFn: (payload) => attendanceService.markAttendance(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'attendance'] });
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to mark attendance'),
  });

  const checkoutMutation = useMutation({
    mutationFn: (payload) => attendanceService.checkoutAttendance(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'attendance'] });
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] });
      toast.success('Student checked out successfully');
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to check out student'),
  });

  const students = studentData?.data || [];
  const attendance = attendanceData?.data || [];
  const shifts = shiftsData || [];

  // Build a map: studentId → attendance record
  const attMap = {};
  attendance.forEach(a => {
    const sid = a.student?._id || a.student;
    if (sid) attMap[String(sid)] = a;
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetchAttendance(), refetchStats()]);
      toast.success('Attendance data refreshed');
    } catch (error) {
      toast.error('Failed to refresh attendance data');
    } finally {
      setIsRefreshing(false);
    }
  };

  const filtered = students.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.name?.toLowerCase().includes(q)
      || s.mobile?.includes(q)
      || s.seatCode?.toLowerCase().includes(q)
      || s.studentId?.toLowerCase().includes(q);
  });

  const paged = filtered.slice((page - 1) * LIMIT, page * LIMIT);

  const markPresent = (student) => {
    markMutation.mutate({
      studentId: student._id || student.id,
      date,
      checkIn: new Date().toTimeString().slice(0, 5),
      method: 'manual',
    });
  };

  const handleCheckout = (attendance) => {
    console.log('Checkout attendance record:', attendance);
    if (!window.confirm(`Check out ${attendance.student?.name || 'student'}?`)) return;
    
    // Try to use attendanceId first, fallback to studentId
    const payload = {};
    if (attendance.id || attendance._id) {
      payload.attendanceId = attendance.id || attendance._id;
    }
    if (attendance.student?._id || attendance.student) {
      payload.studentId = attendance.student._id || attendance.student;
    }
    
    console.log('Checkout payload:', payload);
    checkoutMutation.mutate(payload);
  };

  const markBulkPresent = () => {
    const unmarked = filtered.filter(s => !attMap[s._id || s.id]);
    if (!unmarked.length) { toast('All students are already marked!'); return; }
    if (!window.confirm(`Mark ${unmarked.length} students as present for ${date}?`)) return;
    const now = new Date().toTimeString().slice(0, 5);
    Promise.all(unmarked.map(s => attendanceService.markAttendance({
      studentId: s._id || s.id, date, checkIn: now, method: 'manual'
    }))).then(() => {
      toast.success(`Marked ${unmarked.length} students present`);
      qc.invalidateQueries({ queryKey: ['admin', 'attendance'] });
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] });
    }).catch(() => toast.error('Bulk mark failed'));
  };

  const presentCount = Object.keys(attMap).length;
  const totalCount   = students.length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
        <button 
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="btn btn-secondary flex items-center gap-2 disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} /> 
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Students', value: totalCount,                 color: 'text-gray-700' },
          { label: 'Present Today',  value: presentCount,               color: 'text-green-600' },
          { label: 'Absent',         value: totalCount - presentCount,  color: 'text-red-500'   },
          { label: 'Attendance %',   value: totalCount
              ? `${Math.round((presentCount / totalCount) * 100)}%` : '0%', color: 'text-blue-600' },
        ].map(s => (
          <div key={s.label} className="card text-center !py-4">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card !p-4 flex flex-wrap gap-3 items-center">
        <input type="date" value={date} onChange={e => { setDate(e.target.value); setPage(1); }}
          className="input w-40 text-sm" />
        <select className="input w-48 text-sm" value={shift}
          onChange={e => { setShift(e.target.value); setPage(1); }}>
          <option value="">All Shifts</option>
          {shifts.map(s => (
            <option key={s.key} value={s.key}>
              {s.name} ({s.startTime} - {s.endTime})
            </option>
          ))}
        </select>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="input pl-9 text-sm" placeholder="Search student…"
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <button onClick={markBulkPresent}
          className="btn btn-primary flex items-center gap-2 whitespace-nowrap">
          <Users className="w-4 h-4" /> Bulk Mark Present
        </button>
      </div>

      {/* Roster table */}
      <div className="card !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Seat','Name','Shift & Timing','Mobile','Check In','Check Out','Live Status','Action'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(studentsLoading || attLoading)
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="animate-pulse bg-gray-200 h-4 rounded w-20" />
                        </td>
                      ))}
                    </tr>
                  ))
                : paged.length === 0
                  ? <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">No students found</td></tr>
                  : paged.map(s => {
                      const sid  = s._id || s.id;
                      const rec  = attMap[String(sid)];
                      const isPresent = !!rec?.checkIn;
                      const studentShift = s.shift || 'Shift 1';
                      const shiftConfig = SHIFT_CONFIG[studentShift] || SHIFT_CONFIG['Shift 1'];
                      const { status: liveStatus, color: statusColor, isOverstay } = getAttendanceStatus(rec, studentShift);
                      
                      // Check status field first, then fallback to checkIn/checkOut logic
                      const isCheckedIn = rec?.status === 'CHECKED_IN' || (rec?.checkIn && !rec?.checkOut);
                      const isCheckedOut = rec?.status === 'CHECKED_OUT' || (rec?.checkIn && rec?.checkOut);
                      
                      // Get status badge styling
                      const getStatusBadge = () => {
                        const colorMap = {
                          'red': 'bg-red-100 text-red-700',
                          'orange': 'bg-orange-100 text-orange-700',
                          'green': 'bg-green-100 text-green-700',
                          'blue': 'bg-blue-100 text-blue-700'
                        };
                        const iconMap = {
                          'red': <AlertTriangle className="w-3 h-3" />,
                          'orange': <Clock className="w-3 h-3" />,
                          'green': <CheckCircle className="w-3 h-3" />,
                          'blue': <CheckCircle className="w-3 h-3" />
                        };
                        
                        return (
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold ${colorMap[statusColor]} px-2 py-0.5 rounded-full`}>
                            {iconMap[statusColor]} {liveStatus}
                          </span>
                        );
                      };
                      
                      return (
                        <tr key={sid} className={`hover:bg-gray-50 ${isOverstay ? 'bg-red-50' : isPresent ? 'bg-green-50/30' : ''}`}>
                          <td className="px-4 py-3 font-mono text-xs text-gray-500">{s.seatCode || '—'}</td>
                          <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                          <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="text-xs font-medium">{studentShift}</span>
                              <span className="text-[10px] text-gray-400">
                                {shiftConfig.startTime && shiftConfig.endTime 
                                  ? `${shiftConfig.startTime} - ${shiftConfig.endTime}`
                                  : 'Custom Timing'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-500">{s.mobile}</td>
                          <td className="px-4 py-3 text-gray-600">{rec?.checkIn || '—'}</td>
                          <td className="px-4 py-3 text-gray-600">{rec?.checkOut || '—:—'}</td>
                          <td className="px-4 py-3">
                            {getStatusBadge()}
                          </td>
                          <td className="px-4 py-3">
                            {!isPresent && (
                              <button
                                onClick={() => markPresent(s)}
                                disabled={markMutation.isPending}
                                className="btn btn-primary !py-1 !px-3 text-xs flex items-center gap-1">
                                <CheckCircle className="w-3.5 h-3.5" /> Mark Present
                              </button>
                            )}
                            {isCheckedIn && (
                              <button
                                onClick={() => handleCheckout(rec)}
                                disabled={checkoutMutation.isPending}
                                className="btn btn-secondary !py-1 !px-3 text-xs flex items-center gap-1">
                                <LogOut className="w-3.5 h-3.5" /> Check Out
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
            </tbody>
          </table>
        </div>

        {filtered.length > LIMIT && (
          <div className="px-4 py-3 border-t flex items-center justify-between text-sm text-gray-500">
            <span>Showing {((page-1)*LIMIT)+1}–{Math.min(page*LIMIT, filtered.length)} of {filtered.length}</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}
                className="btn btn-secondary p-1.5 disabled:opacity-40"><ChevronLeft className="w-4 h-4"/></button>
              <button onClick={() => setPage(p => p+1)} disabled={page*LIMIT>=filtered.length}
                className="btn btn-secondary p-1.5 disabled:opacity-40"><ChevronRight className="w-4 h-4"/></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
