import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { User, Download, Loader2, CheckCircle, Clock, Armchair } from 'lucide-react';
import { portalService } from '../../services/portalService';
import { format, differenceInDays, parseISO } from 'date-fns';

function CountdownBadge({ expiryDate }) {
  if (!expiryDate) return null;
  const days = differenceInDays(parseISO(expiryDate), new Date());
  const color = days > 10 ? 'text-green-700 bg-green-100'
    : days > 3 ? 'text-yellow-700 bg-yellow-100'
    : 'text-red-700 bg-red-100';
  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${color}`}>
      <Clock className="w-4 h-4" />
      {days > 0 ? `${days} days remaining` : days === 0 ? 'Expires today!' : 'Expired'}
    </span>
  );
}

export default function ProfilePage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['student', 'profile'],
    queryFn:  () => portalService.getProfile(),
  });

  const { register, handleSubmit, reset } = useForm();
  useEffect(() => {
    if (profile) reset({ name: profile.name, email: profile.email || '', mobile: profile.mobile, preparation: profile.preparation || '' });
  }, [profile, reset]);

  const updateMutation = useMutation({
    mutationFn: (data) => portalService.updateProfile(data),
    onSuccess: () => {
      toast.success('Profile updated!');
      qc.invalidateQueries({ queryKey: ['student', 'profile'] });
      setEditing(false);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Update failed'),
  });

  const downloadIdCard = async () => {
    try {
      // Use role-scoped token storage — never raw localStorage
      const { getAccessToken } = await import('../../utils/tokenStorage');
      const response = await fetch('/api/v1/student/id-card?format=pdf', {
        headers: { Authorization: `Bearer ${getAccessToken()}` }
      });
      if (!response.ok) throw new Error('Failed');
      const blob = await response.blob();
      const url  = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url;
      a.download = `ID_Card_${profile?.studentId || 'student'}.pdf`;
      a.click(); URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download ID card');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card animate-pulse"><div className="h-16 bg-gray-200 rounded" /></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>

      {/* Seat Card */}
      <div className="rounded-xl overflow-hidden shadow-md bg-gradient-to-br from-library-blue to-blue-700 text-white p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs opacity-70 uppercase tracking-wider mb-1">DURGA DIGITAL LIBRARY</div>
            <h2 className="text-2xl font-bold">{profile?.name}</h2>
            <p className="text-sm opacity-80 mt-0.5">{profile?.studentId || '—'}</p>
          </div>
          <div className="bg-white/15 rounded-lg p-3 text-center">
            <Armchair className="w-6 h-6 mx-auto mb-1" />
            <p className="text-lg font-bold">{profile?.seatCode || '—'}</p>
            <p className="text-xs opacity-70">Seat</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-white/20 grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="opacity-70 text-xs">Shift</p>
            <p className="font-semibold">{profile?.shift || '—'}</p>
          </div>
          <div>
            <p className="opacity-70 text-xs">Joined</p>
            <p className="font-semibold">{profile?.joiningDate || '—'}</p>
          </div>
          <div>
            <p className="opacity-70 text-xs">Expires</p>
            <p className="font-semibold">{profile?.expiryDate || '—'}</p>
          </div>
        </div>
        <div className="mt-3">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
            profile?.status === 'Active' ? 'bg-green-400/30 text-green-100' : 'bg-red-400/30 text-red-100'
          }`}>
            {profile?.status === 'Active' ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
            {profile?.status || 'Active'}
          </span>
        </div>
      </div>

      {/* Countdown */}
      {profile?.expiryDate && (
        <div className="card !py-3 flex items-center justify-between">
          <span className="text-sm text-gray-600">Membership validity</span>
          <CountdownBadge expiryDate={profile.expiryDate} />
        </div>
      )}

      {/* Download ID Card */}
      <button onClick={downloadIdCard}
        className="btn btn-primary flex items-center gap-2 w-full justify-center">
        <Download className="w-4 h-4" /> Download ID Card (PDF)
      </button>

      {/* Editable Info */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Personal Information</h2>
          <button onClick={() => setEditing(e => !e)} className="btn btn-secondary !py-1.5 !px-3 text-sm">
            {editing ? 'Cancel' : 'Edit'}
          </button>
        </div>
        {editing ? (
          <form onSubmit={handleSubmit(d => updateMutation.mutate(d))} className="space-y-3">
            {[
              { field:'name',        label:'Full Name',    type:'text' },
              { field:'email',       label:'Email',        type:'email' },
              { field:'preparation', label:'Preparation',  type:'text' },
            ].map(({ field, label, type }) => (
              <div key={field}>
                <label className="label">{label}</label>
                <input {...register(field)} type={type} className="input" />
              </div>
            ))}
            <button type="submit" className="btn btn-primary flex items-center gap-2"
              disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Save
            </button>
          </form>
        ) : (
          <div className="space-y-3 text-sm">
            {[
              ['Name',        profile?.name],
              ['Email',       profile?.email || '—'],
              ['Mobile',      profile?.mobile],
              ['Preparation', profile?.preparation || '—'],
              ['Branch',      profile?.branch || '—'],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-500">{label}</span>
                <span className="font-medium text-gray-900">{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
