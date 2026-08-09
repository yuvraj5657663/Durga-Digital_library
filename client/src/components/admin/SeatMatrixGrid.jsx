import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Armchair, Users, AlertTriangle } from 'lucide-react';
import api from '../../services/api';

const SHIFTS = [
  { value: 1, label: 'Shift 1 — Morning (6 AM – 11 AM)' },
  { value: 2, label: 'Shift 2 — Afternoon (11 AM – 4 PM)' },
  { value: 3, label: 'Shift 3 — Evening (4 PM – 9 PM)' },
  { value: 4, label: 'Shift 4 — Full Day' },
];

function getSeatStyle(seat) {
  if (!seat.is_booked) return 'bg-emerald-500 hover:bg-emerald-600 border-emerald-600 text-white';
  const today = new Date().toISOString().slice(0, 10);
  const exp   = seat.expiry_date;
  if (exp) {
    const days = Math.ceil((new Date(exp) - new Date(today)) / 86400000);
    if (days >= 0 && days <= 5) return 'bg-yellow-400 hover:bg-yellow-500 border-yellow-500 text-white';
  }
  return 'bg-red-500 hover:bg-red-600 border-red-600 text-white';
}

function SeatButton({ seat, onClick }) {
  const [tip, setTip] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => onClick(seat)}
        onMouseEnter={() => setTip(true)}
        onMouseLeave={() => setTip(false)}
        className={`
          w-full aspect-square rounded-lg border-2 transition-all duration-150
          flex flex-col items-center justify-center gap-0.5
          focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-library-blue
          active:scale-95 hover:scale-105 hover:shadow-md
          ${getSeatStyle(seat)}
        `}
        title={seat.is_booked
          ? `${seat.seat_code} — ${seat.student_name || 'Booked'} (Exp: ${seat.expiry_date || '?'})`
          : `${seat.seat_code} — Available`}
      >
        <Armchair className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
        <span className="text-[9px] sm:text-[10px] font-bold leading-none truncate w-full text-center px-0.5">
          {seat.seat_code}
        </span>
      </button>

      {/* Tooltip — above the button */}
      {tip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-30
          bg-gray-900 text-white text-xs rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-xl pointer-events-none">
          <p className="font-semibold">{seat.seat_code}</p>
          {seat.is_booked
            ? <>
                <p className="text-gray-300">{seat.student_name || 'Booked'}</p>
                {seat.expiry_date && <p className="text-gray-400">Exp: {seat.expiry_date}</p>}
              </>
            : <p className="text-emerald-300">Available</p>}
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  );
}

export default function SeatMatrixGrid({ onSeatClick }) {
  const [shift, setShift] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'seats', shift],
    queryFn: async () => {
      const res = await api.get(`/admin/seats?shift=${shift}`);
      return res.data?.data || res.data?.seats || [];
    },
    staleTime: 30_000,
  });

  // Normalise response — always produce exactly 24 seats (DDL001–DDL024)
  // The API returns { success, data: [...] } where each item has seat_code + is_booked etc.
  // If the API returns fewer than 24 items (or nothing), fill the rest as vacant.
  const apiSeats = Array.isArray(data) ? data : (data?.data || data?.seats || []);

  const TOTAL = 24;
  // Build a map by seat_number so we can fill gaps
  const apiMap = {};
  apiSeats.forEach((s, i) => {
    const num = s.seat_number || (i + 1);
    apiMap[num] = s;
  });

  const seats = Array.from({ length: TOTAL }, (_, i) => {
    const num  = i + 1;
    const code = `DDL${String(num).padStart(3, '0')}`;
    const raw  = apiMap[num];
    if (raw) {
      return {
        seat_code:    raw.seat_code    || raw.seatCode  || code,
        is_booked:    !!(raw.is_booked),
        student_name: raw.student_name || raw.studentName || '',
        expiry_date:  raw.expiry_date  || raw.expiryDate  || '',
        shift:        raw.shift        || shift,
        seat_number:  num,
      };
    }
    return { seat_code: code, is_booked: false, student_name: '', expiry_date: '', shift, seat_number: num };
  });

  const availableCount = seats.filter(s => !s.is_booked).length;
  const occupiedCount  = seats.filter(s => s.is_booked).length;
  const expiringCount  = seats.filter(s => {
    if (!s.is_booked || !s.expiry_date) return false;
    const days = Math.ceil((new Date(s.expiry_date) - new Date()) / 86400000);
    return days >= 0 && days <= 5;
  }).length;

  const handleClick = (seat) => {
    if (onSeatClick) onSeatClick(seat);
  };

  return (
    <div className="card !p-4 sm:!p-6 space-y-4">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-base font-semibold text-gray-900">Seat Matrix</h2>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Shift selector */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-600 whitespace-nowrap">Select Shift:</label>
            <select
              value={shift}
              onChange={e => setShift(Number(e.target.value))}
              className="input !py-1.5 !px-2.5 text-sm w-auto"
            >
              {SHIFTS.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 text-xs font-medium">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded bg-emerald-500 flex-shrink-0" />
              <span className="text-gray-600">Available ({availableCount})</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded bg-red-500 flex-shrink-0" />
              <span className="text-gray-600">Occupied ({occupiedCount})</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded bg-yellow-400 flex-shrink-0" />
              <span className="text-gray-600">Expiring ({expiringCount})</span>
            </span>
          </div>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-6 sm:grid-cols-8 lg:grid-cols-12 gap-2">
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-lg bg-gray-200 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-6 sm:grid-cols-8 lg:grid-cols-12 gap-1.5 sm:gap-2">
          {seats.map((seat) => (
            <SeatButton
              key={seat.seat_code}
              seat={seat}
              onClick={handleClick}
            />
          ))}
        </div>
      )}

      {/* Mini stats bar */}
      <div className="flex items-center gap-4 pt-2 border-t border-gray-100 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Users className="w-3.5 h-3.5" />
          {seats.length} total seats
        </span>
        <span className="flex items-center gap-1 text-emerald-600 font-medium">
          {availableCount} free
        </span>
        <span className="flex items-center gap-1 text-red-500 font-medium">
          {occupiedCount} occupied
        </span>
        {expiringCount > 0 && (
          <span className="flex items-center gap-1 text-yellow-600 font-medium">
            <AlertTriangle className="w-3.5 h-3.5" />
            {expiringCount} expiring soon
          </span>
        )}
      </div>
    </div>
  );
}
