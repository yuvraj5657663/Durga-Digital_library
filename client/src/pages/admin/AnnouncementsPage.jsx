import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, Pin, PinOff, X, Loader2, Megaphone } from 'lucide-react';
import { announcementService } from '../../services/announcementService';
import { format } from 'date-fns';

const TYPES = ['general','holiday','maintenance','fee','exam','urgent'];
const TYPE_COLORS = {
  general:'bg-blue-100 text-blue-700', holiday:'bg-green-100 text-green-700',
  maintenance:'bg-yellow-100 text-yellow-700', fee:'bg-purple-100 text-purple-700',
  exam:'bg-orange-100 text-orange-700', urgent:'bg-red-100 text-red-700',
};

function AnnouncementForm({ initial, onSubmit, onCancel, isLoading }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      title:       initial?.title   || '',
      body:        initial?.body    || '',
      type:        initial?.type    || 'general',
      pinned:      initial?.pinned  || false,
      targetShift: initial?.targetShift || '',
    }
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="label">Title *</label>
        <input {...register('title', { required: 'Title is required' })} className="input"
          placeholder="Announcement title" />
        {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
      </div>
      <div>
        <label className="label">Body *</label>
        <textarea {...register('body', { required: 'Body is required' })} className="input resize-none"
          rows={4} placeholder="Announcement details…" />
        {errors.body && <p className="text-red-500 text-xs mt-1">{errors.body.message}</p>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Type</label>
          <select {...register('type')} className="input">
            {TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Target Shift (optional)</label>
          <select {...register('targetShift')} className="input">
            <option value="">All Shifts</option>
            {['Shift 1','Shift 2','Shift 3','Shift 4'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input {...register('pinned')} type="checkbox" id="pinned"
          className="w-4 h-4 accent-library-blue" />
        <label htmlFor="pinned" className="text-sm text-gray-700 cursor-pointer">Pin this announcement</label>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn btn-secondary flex-1">Cancel</button>
        <button type="submit" className="btn btn-primary flex-1 flex items-center justify-center gap-2"
          disabled={isLoading}>
          {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          {initial ? 'Save Changes' : 'Publish'}
        </button>
      </div>
    </form>
  );
}

export default function AnnouncementsPage() {
  const qc = useQueryClient();
  const [formMode, setFormMode] = useState(null); // 'create' | 'edit'
  const [selected, setSelected] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'announcements'],
    queryFn:  () => announcementService.getAnnouncements({ limit: 50 }),
  });
  const announcements = data?.data || [];

  const createMutation = useMutation({
    mutationFn: (d) => announcementService.createAnnouncement(d),
    onSuccess: () => {
      toast.success('Announcement published!');
      qc.invalidateQueries({ queryKey: ['admin', 'announcements'] });
      setFormMode(null);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => announcementService.updateAnnouncement(id, data),
    onSuccess: () => {
      toast.success('Announcement updated!');
      qc.invalidateQueries({ queryKey: ['admin', 'announcements'] });
      setFormMode(null); setSelected(null);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => announcementService.deleteAnnouncement(id),
    onSuccess: () => {
      toast.success('Deleted');
      qc.invalidateQueries({ queryKey: ['admin', 'announcements'] });
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const handleDelete = (a) => {
    if (!window.confirm(`Delete "${a.title}"?`)) return;
    deleteMutation.mutate(a._id || a.id);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
        <button onClick={() => { setFormMode('create'); setSelected(null); }}
          className="btn btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Announcement
        </button>
      </div>

      {/* Create / Edit form panel */}
      {formMode && (
        <div className="card border-library-blue border-l-4">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            {formMode === 'edit' ? 'Edit Announcement' : 'New Announcement'}
          </h2>
          <AnnouncementForm
            initial={formMode === 'edit' ? selected : null}
            onSubmit={(d) => {
              if (formMode === 'edit') {
                updateMutation.mutate({ id: selected._id || selected.id, data: d });
              } else {
                createMutation.mutate(d);
              }
            }}
            onCancel={() => { setFormMode(null); setSelected(null); }}
            isLoading={createMutation.isPending || updateMutation.isPending}
          />
        </div>
      )}

      {/* List */}
      <div className="space-y-3">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card animate-pulse space-y-2">
                <div className="h-5 bg-gray-200 rounded w-1/3" />
                <div className="h-4 bg-gray-200 rounded w-2/3" />
              </div>
            ))
          : announcements.length === 0
            ? (
                <div className="card text-center py-14 text-gray-400">
                  <Megaphone className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>No announcements yet. Create one above.</p>
                </div>
              )
            : announcements.map(a => (
                <div key={a._id || a.id}
                  className={`card relative border-l-4 ${a.pinned ? 'border-library-blue' : 'border-transparent'}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {a.pinned && <Pin className="w-3.5 h-3.5 text-library-blue flex-shrink-0" />}
                        <h3 className="font-semibold text-gray-900 truncate">{a.title}</h3>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${TYPE_COLORS[a.type] || 'bg-gray-100 text-gray-600'}`}>
                          {a.type}
                        </span>
                        {a.targetShift && (
                          <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                            {a.targetShift}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">{a.body}</p>
                      <p className="text-xs text-gray-400 mt-1.5">
                        {a.publishAt ? format(new Date(a.publishAt), 'dd MMM yyyy, hh:mm a') : ''}
                        {a.authorName && ` · by ${a.authorName}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button onClick={() => { setSelected(a); setFormMode('edit'); }}
                        className="p-1.5 text-gray-400 hover:text-library-blue hover:bg-blue-50 rounded">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(a)}
                        disabled={deleteMutation.isPending}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
      </div>
    </div>
  );
}
