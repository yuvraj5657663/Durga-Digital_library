import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { X, Loader2, CopyCheck } from 'lucide-react';
import { studentService } from '../../../services/studentService';

const today = new Date().toISOString().slice(0, 10);
const oneMonthLater = (() => {
  const d = new Date(); d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
})();

const schema = z.object({
  name:         z.string().min(2, 'Name is required'),
  mobile:       z.string().regex(/^\d{10}$/, '10-digit mobile required'),
  email:        z.string().email('Invalid email').optional().or(z.literal('')),
  preparation:  z.string().optional(),
  seatCode:     z.string().min(1, 'Seat code is required'),
  shift:        z.string().min(1, 'Shift is required'),
  shiftHours:   z.string().optional(),
  customTiming: z.string().optional(),
  joiningDate:  z.string().min(1, 'Joining date required'),
  expiryDate:   z.string().min(1, 'Expiry date required'),
  duration:     z.string(),
  fee:          z.coerce.number().min(0, 'Fee must be ≥ 0'),
  paymentMode:  z.string(),
  branch:       z.string().optional(),
}).refine((data) => {
  if (data.shift === 'Custom' && !data.customTiming) {
    return false;
  }
  return true;
}, {
  message: "Custom timing is required when shift is Custom",
  path: ["customTiming"]
});

export default function AddStudentModal({ open, onClose, onSuccess, selectedSeat }) {
  const {
    register, handleSubmit, reset, watch,
    formState: { errors },
    setValue
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      joiningDate:  today,
      expiryDate:   oneMonthLater,
      duration:     '1 Month(s)',
      fee:          400,
      paymentMode:  'Cash',
      shift:        'Shift 1',
      shiftHours:   '6 AM - 12 PM (6 Hours)',
      customTiming: '',
      seatCode:     selectedSeat || '',
    }
  });

  // Auto-fill seat code when selectedSeat changes
  useEffect(() => {
    if (selectedSeat) {
      setValue('seatCode', selectedSeat);
    }
  }, [selectedSeat, setValue]);

  // Auto-calculate expiry from joining + duration
  const joiningDate = watch('joiningDate');
  const duration    = watch('duration');
  const shiftValue  = watch('shift');
  const isCustomShift = shiftValue === 'Custom';
  useEffect(() => {
    if (!joiningDate || !duration) return;
    const months = parseInt(duration) || 1;
    const d = new Date(joiningDate);
    d.setMonth(d.getMonth() + months);
    setValue('expiryDate', d.toISOString().slice(0, 10));
  }, [joiningDate, duration, setValue]);

  const mutation = useMutation({
    mutationFn: (data) => studentService.createStudent(data),
    onSuccess: (result) => {
      const creds = result?.credentials;
      toast.success(
        creds
          ? `✅ Student created!\nID: ${creds.studentId}\nPassword: ${creds.password}`
          : '✅ Student created successfully!',
        { duration: 8000 }
      );
      reset();
      onSuccess?.();
      onClose();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to create student');
    }
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900">Add New Student</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))}
          className="overflow-y-auto px-6 py-4 space-y-4">

          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 flex items-center gap-2 text-sm text-blue-800">
            <CopyCheck className="w-4 h-4 flex-shrink-0" />
            Login credentials will be auto-generated and sent via WhatsApp & Email.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <div>
              <label className="label">Full Name *</label>
              <input {...register('name')} className="input" placeholder="e.g. Ramesh Kumar" />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>
            {/* Mobile */}
            <div>
              <label className="label">Mobile *</label>
              <input {...register('mobile')} className="input" placeholder="10-digit mobile" maxLength={10} />
              {errors.mobile && <p className="text-red-500 text-xs mt-1">{errors.mobile.message}</p>}
            </div>
            {/* Email */}
            <div>
              <label className="label">Email</label>
              <input {...register('email')} className="input" type="email" placeholder="student@example.com" />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>
            {/* Preparation */}
            <div>
              <label className="label">Preparation For</label>
              <input {...register('preparation')} className="input" placeholder="e.g. UPSC, SSC, BPSC" />
            </div>
            {/* Seat */}
            <div>
              <label className="label">Seat Code *</label>
              <input {...register('seatCode')} className="input" placeholder="e.g. DDL001" />
              {errors.seatCode && <p className="text-red-500 text-xs mt-1">{errors.seatCode.message}</p>}
            </div>
            {/* Shift */}
            <div>
              <label className="label">Shift *</label>
              <select {...register('shift')} className="input">
                <option value="Shift 1">Shift 1 (Morning)</option>
                <option value="Shift 2">Shift 2 (Afternoon)</option>
                <option value="Shift 3">Shift 3 (Evening)</option>
                <option value="Shift 4">Shift 4 (Full Day)</option>
                <option value="Custom">Custom / Double Shift</option>
              </select>
            </div>
            {/* Shift Hours or Custom Timing */}
            <div>
              {isCustomShift ? (
                <>
                  <label className="label">Custom Timing *</label>
                  <input
                    {...register('customTiming')}
                    className="input"
                    placeholder="e.g. 06:00 AM - 11:00 AM & 04:00 PM - 09:00 PM"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Enter both shifts separated by &amp; for double shift
                  </p>
                </>
              ) : (
                <>
                  <label className="label">Shift Hours</label>
                  <input {...register('shiftHours')} className="input" placeholder="e.g. 6 AM - 12 PM" />
                </>
              )}
            </div>
            {/* Duration */}
            <div>
              <label className="label">Duration</label>
              <select {...register('duration')} className="input">
                <option value="1 Month(s)">1 Month</option>
                <option value="2 Month(s)">2 Months</option>
                <option value="3 Month(s)">3 Months</option>
                <option value="6 Month(s)">6 Months</option>
                <option value="12 Month(s)">12 Months</option>
              </select>
            </div>
            {/* Joining Date */}
            <div>
              <label className="label">Joining Date *</label>
              <input {...register('joiningDate')} className="input" type="date" />
              {errors.joiningDate && <p className="text-red-500 text-xs mt-1">{errors.joiningDate.message}</p>}
            </div>
            {/* Expiry Date */}
            <div>
              <label className="label">Expiry Date *</label>
              <input {...register('expiryDate')} className="input" type="date" />
              {errors.expiryDate && <p className="text-red-500 text-xs mt-1">{errors.expiryDate.message}</p>}
            </div>
            {/* Fee */}
            <div>
              <label className="label">Fee (₹) *</label>
              <input {...register('fee')} className="input" type="number" min="0" />
              {errors.fee && <p className="text-red-500 text-xs mt-1">{errors.fee.message}</p>}
            </div>
            {/* Payment Mode */}
            <div>
              <label className="label">Payment Mode</label>
              <select {...register('paymentMode')} className="input">
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>
            {/* Branch */}
            <div className="md:col-span-2">
              <label className="label">Branch</label>
              <input {...register('branch')} className="input" placeholder="e.g. Munger Main" />
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-2 pb-1">
            <button type="button" onClick={onClose} className="btn btn-secondary"
              disabled={mutation.isPending}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary flex items-center gap-2"
              disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {mutation.isPending ? 'Creating…' : 'Create Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
