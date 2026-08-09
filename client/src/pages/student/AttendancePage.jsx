import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, CheckCircle, XCircle, Clock } from 'lucide-react';
import { portalService } from '../../services/portalService';
import {
  format, getDaysInMonth, startOfMonth, getDay, isToday, parseISO, isBefore
} from 'date-fns';

/* ─── Calendar ──────────────────────────────────────────────────────────────── */
function CalendarView({ year, month, records }) {
  const presentSet = new Set();
  const lateSet    = new Set();

  records.forEach(r => {
    if (!r.date) return;
    // Late = checked in after 10:00 AM (heuristic, adjust as needed)
    const hour = r.checkIn ? parseInt(r.checkIn.split(':')[0], 10) : 0;
    if (hour >= 10) lateSet.add(r.date);
    else            presentSet.add(r.date);
  });

  const totalDays = getDaysInMonth(new Date(year, month - 1));
  const firstDay  = getDay(startOfMonth(new Date(year, month - 1))); // 0=Sun
  const todayStr  = format(new Date(), 'yyyy-MM-dd');
  const thisMonth = format(new Date(), 'yyyy-MM') === `${year}-${String(month).padStart(2, '0')}`;

  // All past days in this month (up to yesterday) that aren't present or late = absent
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null); // empty padding
  for (let d = 1; d <= totalDays; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ day: d, dateStr });
  }

  const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getCellStyle = (dateStr) => {
    if (presentSet.has(dateStr)) return 'bg-green-100 text-green-700 font-bold';
    if (lateSet.has(dateStr))    return 'bg-yellow-100 text-yellow-700 font-bold';
    // Show as absent only for past days in the current/past month, not future
    const isDateToday  = dateStr === todayStr;
    const isPastOrToday = dateStr <= todayStr;
    if (isPastOrToday && !isDateToday) return 'bg-red-50 text-red-400';
    return 'text-gray-400';
  };

  return (
    <div>
      {/* Day-of-week header */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map(d => (
          <div key={d} className="text-center text-[11px] font-bold text-gray-400 py-1">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) => {
          if (!cell) return <div key={`pad-${i}`} />;
          const isDateToday = cell.dateStr === todayStr;
          const cellStyle   = getCellStyle(cell.dateStr);
          return (
            <div
              key={cell.dateStr}
              className={`
                aspect-square flex items-center justify-center rounded-full
                text-sm transition-colors cursor-default
                ${cellStyle}
                ${isDateToday ? 'ring-2 ring-library-blue ring-offset-1' : ''}
              `}
              title={
                presentSet.has(cell.dateStr) ? `Present — ${cell.dateStr}` :
                lateSet.has(cell.dateStr)    ? `Late — ${cell.dateStr}` :
                cell.dateStr <= todayStr && !isDateToday ? `Absent — ${cell.dateStr}` :
                cell.dateStr
              }
            >
              {cell.day}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-4 flex-wrap text-xs font-medium">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-green-400 flex-shrink-0" />
          <span className="text-gray-600">Present</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-300 flex-shrink-0" />
          <span className="text-gray-600">Absent</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-yellow-300 flex-shrink-0" />
          <span className="text-gray-600">Late / Half-Day</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full ring-2 ring-library-blue bg-white flex-shrink-0" />
          <span className="text-gray-600">Today</span>
        </span>
      </div>
    </div>
  );
}

/* ─── Attendance History Page ───────────────────────────────────────────────── */
export default function StudentAttendancePage() {
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const monthStr = `${year}-${String(month).padStart(2, '0')}`;

  const { data, isLoading } = useQuery({
    queryKey: ['student', 'attendance', monthStr],
    queryFn:  () => portalService.getAttendance({ month: monthStr, limit: 100 }),
  });

  const records = data?.data || [];

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  };

  // Stats
  const daysInMonth = getDaysInMonth(new Date(year, month - 1));
  const todayStr    = format(now, 'yyyy-MM-dd');
  const isPastMonth = monthStr < format(now, 'yyyy-MM');
  const isCurrMonth = monthStr === format(now, 'yyyy-MM');

  // Days elapsed (past + today) in the selected month
  const daysElapsed = isPastMonth
    ? daysInMonth
    : isCurrMonth
      ? now.getDate()
      : 0; // future month

  const daysPresent = records.length;
  const daysAbsent  = Math.max(0, daysElapsed - daysPresent);
  const pct = daysElapsed ? Math.round((daysPresent / daysElapsed) * 100) : 0;
  const totalMins = records.reduce((s, r) => s + (r.durationMins || 0), 0);
  const totalHours = Math.round(totalMins / 60);

  // Can navigate to future months?
  const isCurrentOrFuture = monthStr >= format(now, 'yyyy-MM');

  return (
    <div className="space-y-5 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">Attendance History</h1>

      {/* Attendance % summary banner */}
      {daysElapsed > 0 && (
        <div className={`rounded-xl px-5 py-4 flex items-center justify-between
          ${pct >= 75 ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'}`}>
          <div>
            <p className={`text-3xl font-black ${pct >= 75 ? 'text-green-700' : 'text-orange-600'}`}>
              {pct}%
            </p>
            <p className="text-sm text-gray-600 mt-0.5">Attendance this month</p>
          </div>
          <div className="text-right text-sm">
            <p className="text-green-700 font-semibold">{daysPresent} Present</p>
            <p className="text-red-500 font-semibold">{daysAbsent} Absent</p>
            <p className="text-gray-500 mt-0.5">{totalHours}h total study time</p>
          </div>
        </div>
      )}

      {/* Calendar card */}
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <button onClick={prevMonth} className="btn btn-secondary p-1.5">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h2 className="text-base font-semibold text-gray-900">
            {format(new Date(year, month - 1), 'MMMM yyyy')}
          </h2>
          <button
            onClick={nextMonth}
            disabled={isCurrentOrFuture}
            className="btn btn-secondary p-1.5 disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {isLoading
          ? <div className="h-52 animate-pulse bg-gray-100 rounded-lg" />
          : <CalendarView year={year} month={month} records={records} />}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Days Present',  value: daysPresent,  color: 'text-green-600',  bg: 'bg-green-50'  },
          { label: 'Days Absent',   value: daysAbsent,   color: 'text-red-500',    bg: 'bg-red-50'    },
          { label: 'Attendance %',  value: `${pct}%`,    color: 'text-blue-600',   bg: 'bg-blue-50'   },
          { label: 'Study Hours',   value: `${totalHours}h`, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl p-4 text-center ${s.bg}`}>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5 font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Attendance Log */}
      {records.length > 0 && (
        <div className="card !p-0 overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">Attendance Log</h3>
            <span className="text-xs text-gray-400">{records.length} records</span>
          </div>
          <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
            {records.map(r => {
              const hour = r.checkIn ? parseInt(r.checkIn.split(':')[0], 10) : 0;
              const isLate = hour >= 10;
              return (
                <div key={r._id || r.id} className="flex items-center justify-between px-4 py-3 text-sm hover:bg-gray-50">
                  <div className="flex items-center gap-2.5">
                    {isLate
                      ? <Clock className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                      : <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />}
                    <div>
                      <span className="font-semibold text-gray-900">{r.date}</span>
                      {isLate && <span className="ml-2 text-xs text-yellow-600 font-medium">Late</span>}
                    </div>
                  </div>
                  <div className="text-gray-500 text-xs flex items-center gap-3">
                    {r.checkIn  && <span className="text-green-600 font-medium">In: {r.checkIn}</span>}
                    {r.checkOut && <span className="text-red-500 font-medium">Out: {r.checkOut}</span>}
                    {r.durationMins > 0 && <span>{r.durationMins} min</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && records.length === 0 && (
        <div className="card text-center py-12 text-gray-400">
          <XCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm font-medium">No attendance records for {format(new Date(year, month - 1), 'MMMM yyyy')}</p>
          <p className="text-xs mt-1 text-gray-300">Check-in from the Dashboard to start tracking</p>
        </div>
      )}
    </div>
  );
}
