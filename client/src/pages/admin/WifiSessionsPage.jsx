import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Eye, RefreshCw, Search, ShieldAlert, Wifi, X } from 'lucide-react';
import { wifiSessionService } from '../../services/wifiSessionService';

const STATUS_STYLES = {
  ACTIVE: 'bg-green-100 text-green-700',
  EXPIRED: 'bg-gray-100 text-gray-600',
  REVOKED: 'bg-red-100 text-red-700',
  DISCONNECTED: 'bg-orange-100 text-orange-700'
};

function formatDate(value) {
  return value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '-';
}

function StatusBadge({ status }) {
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[status] || 'bg-gray-100 text-gray-600'}`}>{status}</span>;
}

export default function WifiSessionsPage() {
  const queryClient = useQueryClient();
  const [view, setView] = useState('active');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'wifi-sessions', view, status, search],
    queryFn: () => wifiSessionService.getSessions({ view: view === 'today' ? 'today' : 'all', status, search, limit: 100 }),
    refetchInterval: 10000,
    refetchIntervalInBackground: true,
  });

  const revokeMutation = useMutation({
    mutationFn: ({ sessionId, reason }) => wifiSessionService.revoke(sessionId, reason),
    onSuccess: () => {
      toast.success('WiFi session revoked');
      queryClient.invalidateQueries({ queryKey: ['admin', 'wifi-sessions'] });
      setSelected(null);
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Unable to revoke session')
  });

  const revokeAllMutation = useMutation({
    mutationFn: (studentId) => wifiSessionService.revokeAllForStudent(studentId),
    onSuccess: () => {
      toast.success('All student WiFi sessions revoked');
      queryClient.invalidateQueries({ queryKey: ['admin', 'wifi-sessions'] });
      setSelected(null);
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Unable to revoke sessions')
  });

  const sessions = data?.sessions || [];
  const activeCount = sessions.filter((session) => session.liveStatus === 'ACTIVE').length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Connected Now</h1>
          <p className="text-sm text-gray-500 mt-1">Application-level session visibility; physical router enforcement is not verified here.</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600"><Wifi className="w-4 h-4 text-green-600" /> {activeCount} active</div>
      </div>

      <div className="card !p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="input pl-9 text-sm" placeholder="Search student, ID, mobile, session, gateway" value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
        <select className="input w-44 text-sm" value={view} onChange={(event) => setView(event.target.value)}>
          <option value="active">All sessions</option>
          <option value="today">Today's users</option>
        </select>
        <select className="input w-40 text-sm" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="revoked">Revoked</option>
          <option value="disconnected">Disconnected</option>
        </select>
        <button className="btn btn-secondary p-2" onClick={() => queryClient.invalidateQueries({ queryKey: ['admin', 'wifi-sessions'] })} title="Refresh now"><RefreshCw className="w-4 h-4" /></button>
      </div>

      <div className="card !p-0 overflow-hidden">
        {isError && <div className="p-5 text-sm text-red-700 bg-red-50">Unable to load WiFi sessions.</div>}
        <div className="overflow-x-auto">
          <table className="min-w-[1250px] w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>{['Status', 'Student', 'Contact', 'Membership', 'Device', 'Network', 'Session', 'Attendance', 'Actions'].map((heading) => <th key={heading} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{heading}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-400">Loading live sessions...</td></tr> : sessions.length === 0 ? <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-400">No matching WiFi sessions.</td></tr> : sessions.map((session) => {
                const student = session.student;
                const device = session.device;
                return <tr key={session.sessionId} className="hover:bg-gray-50 align-top">
                  <td className="px-4 py-4"><StatusBadge status={session.liveStatus} /><div className="mt-1 text-[11px]">{session.authorized ? 'Authorized' : 'Unrecognized'}</div></td>
                  <td className="px-4 py-4"><div className="font-semibold text-gray-900">{student?.name || 'Unknown student'}</div><div className="text-xs text-gray-500">{student?.studentId || student?._id || 'No student ref'}</div></td>
                  <td className="px-4 py-4 text-gray-600">{student?.mobile || '-'}</td>
                  <td className="px-4 py-4"><div>{student?.membershipStatus || '-'}</div><div className="text-xs text-gray-500">{student?.expiryDate || '-'}</div><div className="text-xs text-gray-500">Seat {student?.seatCode || '-'}</div></td>
                  <td className="px-4 py-4"><div className="font-medium text-gray-900">{device?.name || 'Unknown device'}</div><div className="text-xs text-gray-500">{device?.type || 'other'} {device?.browserOs ? `· ${device.browserOs}` : ''}</div></td>
                  <td className="px-4 py-4 text-xs text-gray-600"><div>IP {session.connection?.ipAddress || '-'}</div><div>GW {session.connection?.gatewayId || '-'}</div></td>
                  <td className="px-4 py-4 text-xs text-gray-600"><div className="font-mono">{session.sessionId}</div><div>Connected {formatDate(session.connection?.connectionTime)}</div><div>Seen {formatDate(session.connection?.lastSeen)}</div><div>Expires {formatDate(session.connection?.expiresAt)}</div></td>
                  <td className="px-4 py-4 text-xs text-gray-600">{session.attendance ? <><div>In {session.attendance.checkIn || '-'}</div><div>Out {session.attendance.checkOut || '-'}</div><div>{session.attendance.durationMins || 0} min</div></> : 'Not linked'}</td>
                  <td className="px-4 py-4"><button className="p-2 text-gray-500 hover:text-library-blue" onClick={() => setSelected(session)} title="View session detail"><Eye className="w-4 h-4" /></button></td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selected && <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={() => setSelected(null)}>
        <div className="bg-white w-full max-w-md h-full p-6 overflow-y-auto" onClick={(event) => event.stopPropagation()}>
          <div className="flex justify-between items-center mb-6"><h2 className="text-lg font-bold">Session detail</h2><button onClick={() => setSelected(null)}><X className="w-5 h-5 text-gray-400" /></button></div>
          {!selected.authorized && <div className="mb-4 flex gap-2 items-start bg-amber-50 text-amber-800 p-3 text-sm"><ShieldAlert className="w-4 h-4 mt-0.5" /> This device is not linked to an admitted student.</div>}
          <dl className="space-y-3 text-sm">{[['Student', selected.student?.name], ['Student ref', selected.student?.studentId || selected.student?._id], ['Device', selected.device?.name], ['Type', selected.device?.type], ['Browser / OS', selected.device?.browserOs], ['Session ID', selected.sessionId], ['IP', selected.connection?.ipAddress], ['Gateway', selected.connection?.gatewayId], ['Last seen', formatDate(selected.connection?.lastSeen)], ['Attendance check-in', selected.attendance?.checkIn], ['Attendance check-out', selected.attendance?.checkOut]].map(([label, value]) => <div key={label} className="flex justify-between gap-4 border-b border-gray-100 pb-2"><dt className="text-gray-500">{label}</dt><dd className="text-right font-medium text-gray-900 break-all">{value || '-'}</dd></div>)}</dl>
          <div className="mt-8 space-y-2"><button className="btn btn-secondary w-full" disabled={revokeMutation.isPending} onClick={() => revokeMutation.mutate({ sessionId: selected.sessionId, reason: 'admin_action' })}>Revoke this session</button>{selected.student?._id && <button className="btn btn-secondary w-full text-red-700" disabled={revokeAllMutation.isPending} onClick={() => revokeAllMutation.mutate(selected.student._id)}>Revoke all sessions for this student</button>}</div>
        </div>
      </div>}
    </div>
  );
}
