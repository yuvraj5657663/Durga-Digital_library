import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  Search, Plus, Pencil, Trash2, RefreshCw, X, Loader2,
  ChevronLeft, ChevronRight, CreditCard
} from 'lucide-react';
import { studentService }    from '../../services/studentService';
import { membershipService } from '../../services/membershipService';
import AddStudentModal        from './components/AddStudentModal';

/* ─── helpers ─────────────────────────────────────────────────────────────── */
const SHIFTS   = ['', 'Shift 1', 'Shift 2', 'Shift 3', 'Shift 4'];
const STATUSES = ['', 'Active', 'Inactive', 'Expired'];
const LIMIT    = 20;

const StatusBadge = ({ status }) => {
  const map = {
    Active:   'bg-green-100 text-green-700',
    Inactive: 'bg-yellow-100 text-yellow-700',
    Expired:  'bg-red-100 text-red-700',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${map[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
};

/* ─── Edit Drawer ──────────────────────────────────────────────────────────── */
function EditStudentDrawer({ student, onClose, onSuccess }) {
  const { register, handleSubmit } = useForm({
    defaultValues: {
      name:        student.name        || '',
      email:       student.email       || '',
      mobile:      student.mobile      || '',
      preparation: student.preparation || '',
      seatCode:    student.seatCode    || '',
      shift:       student.shift       || 'Shift 1',
      shiftHours:  student.shiftHours  || '',
      branch:      student.branch      || '',
    },
  });

  const mutation = useMutation({
    mutationFn: (data) => studentService.updateStudent(student._id || student.id, data),
    onSuccess: () => { toast.success('Student updated'); onSuccess?.(); onClose(); },
    onError:   (e) => toast.error(e.response?.data?.message || 'Update failed'),
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div className="bg-white w-full max-w-md h-full flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900">Edit Student</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit((d) => mutation.mutate(d))}
          className="flex-1 overflow-y-auto p-6 space-y-4"
        >
          {[
            { field: 'name',        label: 'Full Name',   type: 'text'  },
            { field: 'email',       label: 'Email',       type: 'email' },
            { field: 'mobile',      label: 'Mobile',      type: 'text'  },
            { field: 'preparation', label: 'Preparation', type: 'text'  },
            { field: 'seatCode',    label: 'Seat Code',   type: 'text'  },
            { field: 'shiftHours',  label: 'Shift Hours', type: 'text'  },
            { field: 'branch',      label: 'Branch',      type: 'text'  },
          ].map(({ field, label, type }) => (
            <div key={field}>
              <label className="label">{label}</label>
              <input {...register(field)} type={type} className="input" />
            </div>
          ))}

          <div>
            <label className="label">Shift</label>
            <select {...register('shift')} className="input">
              {['Shift 1', 'Shift 2', 'Shift 3', 'Shift 4'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary flex-1 flex items-center justify-center gap-2"
              disabled={mutation.isPending}
            >
              {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Renew Membership Modal ───────────────────────────────────────────────── */
function RenewMembershipModal({ student, onClose, onSuccess }) {
  const today = new Date().toISOString().slice(0, 10);

  const { register, handleSubmit, watch, setValue } = useForm({
    defaultValues: {
      studentId:   student._id || student.id,
      duration:    '1 Month(s)',
      fee:         500,
      paymentMode: 'Cash',
      joiningDate: today,
      expiryDate:  '',
    },
  });

  const joiningDate = watch('joiningDate');
  const duration    = watch('duration');

  // Auto-calculate expiry when joining date or duration changes
  useEffect(() => {
    if (!joiningDate) return;
    const months = parseInt(duration) || 1;
    const d = new Date(joiningDate);
    d.setMonth(d.getMonth() + months);
    setValue('expiryDate', d.toISOString().slice(0, 10));
  }, [joiningDate, duration, setValue]);

  const mutation = useMutation({
    mutationFn: (data) => membershipService.renewMembership(data),
    onSuccess: () => { toast.success('Membership renewed!'); onSuccess?.(); onClose(); },
    onError:   (e) => toast.error(e.response?.data?.message || 'Renewal failed'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-gray-900">Renew Membership</h2>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6 space-y-4">
          {/* Student info pill */}
          <div className="bg-gray-50 rounded-lg px-4 py-2 text-sm text-gray-700">
            <span className="font-semibold">{student.name}</span>
            {student.seatCode && <> · {student.seatCode}</>}
            {student.shift    && <> · {student.shift}</>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Duration</label>
              <select {...register('duration')} className="input">
                {['1 Month(s)', '2 Month(s)', '3 Month(s)', '6 Month(s)', '12 Month(s)'].map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Fee (₹)</label>
              <input {...register('fee')} type="number" className="input" min="0" />
            </div>
            <div>
              <label className="label">Joining Date</label>
              <input {...register('joiningDate')} type="date" className="input" />
            </div>
            <div>
              <label className="label">Expiry (auto)</label>
              <input {...register('expiryDate')} type="date" className="input bg-gray-50" readOnly />
            </div>
            <div className="col-span-2">
              <label className="label">Payment Mode</label>
              <select {...register('paymentMode')} className="input">
                {['Cash', 'UPI', 'Bank Transfer', 'Cheque'].map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">Cancel</button>
            <button
              type="submit"
              className="btn btn-primary flex-1 flex items-center justify-center gap-2"
              disabled={mutation.isPending}
            >
              {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Renew
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Students Page ────────────────────────────────────────────────────────── */
export default function StudentsPage() {
  const qc = useQueryClient();

  const [addOpen,      setAddOpen]   = useState(false);
  const [editOpen,     setEditOpen]  = useState(false);
  const [renewOpen,    setRenewOpen] = useState(false);
  const [selected,     setSelected]  = useState(null);
  const [page,         setPage]      = useState(1);
  const [search,       setSearch]    = useState('');
  const [statusFilter, setStatus]    = useState('');
  const [shiftFilter,  setShift]     = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'students', page, search, statusFilter, shiftFilter],
    queryFn:  () => studentService.getStudents({
      page, limit: LIMIT, search, status: statusFilter, shift: shiftFilter,
    }),
    keepPreviousData: true,
  });

  const students   = data?.data       || [];
  const pagination = data?.pagination || {};

  const deactivateMutation = useMutation({
    mutationFn: (id) => studentService.deactivateStudent(id),
    onSuccess:  () => {
      toast.success('Student deactivated');
      qc.invalidateQueries({ queryKey: ['admin', 'students'] });
      qc.invalidateQueries({ queryKey: ['admin', 'stats']    });
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const handleDeactivate = (s) => {
    if (!window.confirm(`Deactivate ${s.name}? Their seat will be freed.`)) return;
    deactivateMutation.mutate(s._id || s.id);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Students</h1>
        <button onClick={() => setAddOpen(true)} className="btn btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Student
        </button>
      </div>

      {/* Filters */}
      <div className="card !p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="input pl-9 text-sm"
            placeholder="Search name, mobile, seat…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select
          className="input w-36 text-sm"
          value={statusFilter}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
        >
          {STATUSES.map((s) => <option key={s} value={s}>{s || 'All Status'}</option>)}
        </select>
        <select
          className="input w-36 text-sm"
          value={shiftFilter}
          onChange={(e) => { setShift(e.target.value); setPage(1); }}
        >
          {SHIFTS.map((s) => <option key={s} value={s}>{s || 'All Shifts'}</option>)}
        </select>
        <button
          onClick={() => qc.invalidateQueries({ queryKey: ['admin', 'students'] })}
          className="btn btn-secondary p-2"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Table */}
      <div className="card !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Student ID', 'Name', 'Mobile', 'Seat', 'Shift', 'Status', 'Expiry', 'Actions'].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                  >
                    {h}
                  </th>
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
                : students.length === 0
                  ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                          No students found
                        </td>
                      </tr>
                    )
                  : students.map((s) => (
                      <tr key={s._id || s.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{s.studentId || '—'}</td>
                        <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{s.name}</td>
                        <td className="px-4 py-3 text-gray-600">{s.mobile}</td>
                        <td className="px-4 py-3 text-gray-600 font-mono">{s.seatCode || '—'}</td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{s.shift || '—'}</td>
                        <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{s.expiryDate || '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => { setSelected(s); setEditOpen(true); }}
                              className="p-1.5 text-gray-400 hover:text-library-blue hover:bg-blue-50 rounded"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => { setSelected(s); setRenewOpen(true); }}
                              className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
                              title="Renew Membership"
                            >
                              <CreditCard className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeactivate(s)}
                              disabled={deactivateMutation.isPending}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-40"
                              title="Deactivate"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {(pagination.total || 0) > LIMIT && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
            <span>
              Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, pagination.total)} of {pagination.total}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn btn-secondary p-1.5 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page * LIMIT >= pagination.total}
                className="btn btn-secondary p-1.5 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals / drawers */}
      <AddStudentModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ['admin', 'students'] });
          qc.invalidateQueries({ queryKey: ['admin', 'stats']    });
        }}
      />

      {editOpen && selected && (
        <EditStudentDrawer
          student={selected}
          onClose={() => { setEditOpen(false); setSelected(null); }}
          onSuccess={() => qc.invalidateQueries({ queryKey: ['admin', 'students'] })}
        />
      )}

      {renewOpen && selected && (
        <RenewMembershipModal
          student={selected}
          onClose={() => { setRenewOpen(false); setSelected(null); }}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['admin', 'students'] });
            qc.invalidateQueries({ queryKey: ['admin', 'stats']    });
          }}
        />
      )}
    </div>
  );
}
