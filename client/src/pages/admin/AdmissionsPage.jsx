import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  CheckCircle, XCircle, ChevronLeft, ChevronRight,
  Search, Loader2, X, RefreshCw, Eye
} from 'lucide-react';
import { admissionService } from '../../services/admissionService';

const today = () => new Date().toISOString().slice(0, 10);
const oneMonth = () => {
  const d = new Date(); d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
};

const StatusBadge = ({ status }) => {
  const map = {
    Pending:  'bg-yellow-100 text-yellow-700',
    Accepted: 'bg-green-100 text-green-700',
    Rejected: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${map[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
};

function ApproveDrawer({ admission, onClose, onSuccess }) {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      seatCode:   '',
      shift:      'Shift 1',
      shiftHours: '6 AM - 11 AM (5 Hours)',
      duration:   '1 Month(s)',
      fee:        350,
      joiningDate:today(),
      expiryDate: oneMonth(),
    }
  });

  const joiningDate  = watch('joiningDate');
  const duration     = watch('duration');
  const shiftValue   = watch('shift');
  const isCustomShift = shiftValue === 'Custom';
  useEffect(() => {
    const months = parseInt(duration) || 1;
    const d = new Date(joiningDate);
    d.setMonth(d.getMonth() + months);
    setValue('expiryDate', d.toISOString().slice(0, 10));
  }, [joiningDate, duration, setValue]);

  const mutation = useMutation({
    mutationFn: (data) => admissionService.approveAdmission(admission._id || admission.id, data),
    onSuccess: (result) => {
      const creds = result?.credentials;
      toast.success(
        creds
          ? `✅ Approved! ID: ${creds.studentId} · Password: ${creds.password}`
          : '✅ Admission approved!',
        { duration: 10000 }
      );
      onSuccess?.();
      onClose();
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Approval failed'),
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div className="bg-white w-full max-w-md h-full flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900">Approve Admission</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Applicant info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-5 text-sm space-y-1.5">
            <p><span className="text-gray-500">Name:</span> <strong>{admission.name}</strong></p>
            <p><span className="text-gray-500">Mobile:</span> {admission.mobile}</p>
            {admission.email && <p><span className="text-gray-500">Email:</span> {admission.email}</p>}
            {admission.preparation && <p><span className="text-gray-500">Prep:</span> {admission.preparation}</p>}
            {admission.preferred_shift && <p><span className="text-gray-500">Preferred Shift:</span> {admission.preferred_shift}</p>}
          </div>

          <form id="approve-form" onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
            <div>
              <label className="label">Seat Code *</label>
              <input {...register('seatCode', { required: 'Required' })} className="input" placeholder="e.g. DDL005" />
              {errors.seatCode && <p className="text-red-500 text-xs mt-1">{errors.seatCode.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Shift *</label>
                <select {...register('shift')} className="input">
                  {['Shift 1','Shift 2','Shift 3','Shift 4','Custom'].map(s => (
                    <option key={s} value={s}>{s === 'Custom' ? 'Custom / Double Shift' : s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Duration</label>
                <select {...register('duration')} className="input">
                  {['1 Month(s)','2 Month(s)','3 Month(s)','6 Month(s)','12 Month(s)'].map(d =>
                    <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Joining Date *</label>
                <input {...register('joiningDate')} type="date" className="input" />
              </div>
              <div>
                <label className="label">Expiry Date</label>
                <input {...register('expiryDate')} type="date" className="input bg-gray-50" readOnly />
              </div>
              <div className="col-span-2">
                <label className="label">Fee (₹) *</label>
                <input {...register('fee', { min: 0 })} type="number" className="input" />
              </div>
            </div>
            <div>
              <label className="label">Shift Hours</label>
              <input {...register('shiftHours')} className="input" placeholder="e.g. 6 AM - 12 PM" />
            </div>
            {isCustomShift && (
              <div>
                <label className="label">Custom Timing *</label>
                <input
                  {...register('customTiming')}
                  className="input"
                  placeholder="e.g. 06:00 AM - 11:00 AM & 04:00 PM - 09:00 PM"
                />
                <p className="text-xs text-gray-400 mt-1">Separate two shifts with &amp;</p>
              </div>
            )}
          </form>

          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
            Student ID, login credentials, WhatsApp + Email will be sent automatically after approval.
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t flex-shrink-0">
          <button onClick={onClose} className="btn btn-secondary flex-1">Cancel</button>
          <button form="approve-form" type="submit" className="btn btn-primary flex-1 flex items-center justify-center gap-2"
            disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Approve & Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdmissionsPage() {
  const qc = useQueryClient();
  const [page,    setPage]   = useState(1);
  const [status,  setStatus] = useState('Pending');
  const [search,  setSearch] = useState('');
  const [selected,setSelected] = useState(null);
  const LIMIT = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'admissions', page, status, search],
    queryFn:  () => admissionService.getAdmissions({ page, limit: LIMIT, status, search }),
    keepPreviousData: true,
  });
  const admissions = data?.data || [];
  const pagination = data?.pagination || {};

  const rejectMutation = useMutation({
    mutationFn: ({ id, notes }) => admissionService.rejectAdmission(id, { reviewNotes: notes }),
    onSuccess: () => {
      toast.success('Admission rejected');
      qc.invalidateQueries({ queryKey: ['admin', 'admissions'] });
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const handleReject = (a) => {
    const notes = window.prompt(`Reason for rejecting ${a.name}? (optional)`);
    if (notes === null) return; // cancelled
    rejectMutation.mutate({ id: a._id || a.id, notes });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Online Admissions</h1>
        <button onClick={() => qc.invalidateQueries({ queryKey: ['admin', 'admissions'] })}
          className="btn btn-secondary flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="card !p-4 flex flex-wrap gap-3 items-center">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {['Pending','Accepted','Rejected'].map(s => (
            <button key={s} onClick={() => { setStatus(s); setPage(1); }}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                status === s ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {s}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="input pl-9 text-sm" placeholder="Search name, mobile…"
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
      </div>

      {/* Table */}
      <div className="card !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Name','Mobile','Email','Preparation','Preferred Shift','Submitted','Status','Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="animate-pulse bg-gray-200 h-4 rounded w-20" />
                        </td>
                      ))}
                    </tr>
                  ))
                : admissions.length === 0
                  ? <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">No admissions found</td></tr>
                  : admissions.map(a => (
                      <tr key={a._id || a.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{a.name}</td>
                        <td className="px-4 py-3 text-gray-600">{a.mobile}</td>
                        <td className="px-4 py-3 text-gray-500 max-w-[160px] truncate">{a.email || '—'}</td>
                        <td className="px-4 py-3 text-gray-500">{a.preparation || '—'}</td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{a.preferred_shift || '—'}</td>
                        <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-xs">
                          {a.createdAt ? new Date(a.createdAt).toLocaleDateString('en-IN') : '—'}
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={a.admission_status} /></td>
                        <td className="px-4 py-3">
                          {a.admission_status === 'Pending' && (
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => setSelected(a)}
                                className="btn btn-primary !py-1 !px-2.5 text-xs flex items-center gap-1">
                                <CheckCircle className="w-3.5 h-3.5" /> Approve
                              </button>
                              <button onClick={() => handleReject(a)}
                                disabled={rejectMutation.isPending}
                                className="btn btn-danger !py-1 !px-2.5 text-xs flex items-center gap-1">
                                <XCircle className="w-3.5 h-3.5" /> Reject
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
            </tbody>
          </table>
        </div>

        {pagination.total > LIMIT && (
          <div className="px-4 py-3 border-t flex items-center justify-between text-sm text-gray-500">
            <span>Showing {((page-1)*LIMIT)+1}–{Math.min(page*LIMIT, pagination.total)} of {pagination.total}</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}
                className="btn btn-secondary p-1.5 disabled:opacity-40"><ChevronLeft className="w-4 h-4"/></button>
              <button onClick={() => setPage(p=>p+1)} disabled={page*LIMIT>=pagination.total}
                className="btn btn-secondary p-1.5 disabled:opacity-40"><ChevronRight className="w-4 h-4"/></button>
            </div>
          </div>
        )}
      </div>

      {/* Approve drawer */}
      {selected && (
        <ApproveDrawer
          admission={selected}
          onClose={() => setSelected(null)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['admin', 'admissions'] });
            qc.invalidateQueries({ queryKey: ['admin', 'stats'] });
            qc.invalidateQueries({ queryKey: ['admin', 'students'] });
          }}
        />
      )}
    </div>
  );
}
