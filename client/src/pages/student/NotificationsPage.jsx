import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Bell, BellOff, CheckCheck, RefreshCw,
  Info, AlertTriangle, CheckCircle, CreditCard, Calendar, Megaphone
} from 'lucide-react';
import { portalService } from '../../services/portalService';
import { formatDistanceToNow, parseISO } from 'date-fns';

/* ── type → icon + colour ─────────────────────────────────────────────────── */
const TYPE_CONFIG = {
  renewal_reminder:     { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-50'  },
  membership_activated: { icon: CheckCircle,   color: 'text-green-500',  bg: 'bg-green-50'   },
  membership_expired:   { icon: BellOff,       color: 'text-red-500',    bg: 'bg-red-50'     },
  payment_received:     { icon: CreditCard,    color: 'text-blue-500',   bg: 'bg-blue-50'    },
  attendance_marked:    { icon: Calendar,      color: 'text-purple-500', bg: 'bg-purple-50'  },
  announcement:         { icon: Megaphone,     color: 'text-indigo-500', bg: 'bg-indigo-50'  },
  password_reset:       { icon: Info,          color: 'text-gray-500',   bg: 'bg-gray-50'    },
  custom:               { icon: Bell,          color: 'text-gray-500',   bg: 'bg-gray-50'    },
};

function NotifIcon({ type }) {
  const cfg  = TYPE_CONFIG[type] || TYPE_CONFIG.custom;
  const Icon = cfg.icon;
  return (
    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
      <Icon className={`w-4 h-4 ${cfg.color}`} />
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────────── */
const LIMIT = 20;

export default function NotificationsPage() {
  const qc          = useQueryClient();
  const [page,      setPage]      = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['student', 'notifications', page, unreadOnly],
    queryFn:  () => portalService.getNotifications({
      page, limit: LIMIT, unread: unreadOnly ? 'true' : undefined,
    }),
  });

  const notifications = data?.data       || [];
  const pagination    = data?.pagination || {};
  const unreadCount   = data?.unreadCount || 0;
  const total         = pagination.total  || 0;

  /* mark all read */
  const markAllMutation = useMutation({
    mutationFn: () => portalService.markNotificationsRead([]),   // empty = all
    onSuccess: () => {
      toast.success('All notifications marked as read');
      qc.invalidateQueries({ queryKey: ['student', 'notifications'] });
    },
    onError: () => toast.error('Failed to mark as read'),
  });

  /* mark single read */
  const markOneMutation = useMutation({
    mutationFn: (id) => portalService.markNotificationsRead([id]),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['student', 'notifications'] }),
    onError:   () => {},
  });

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          {unreadCount > 0 && (
            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="btn btn-secondary p-2"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllMutation.mutate()}
              disabled={markAllMutation.isPending}
              className="btn btn-secondary flex items-center gap-1.5 text-sm"
            >
              <CheckCheck className="w-4 h-4" />
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Filter toggle */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {[
          { label: 'All',    value: false },
          { label: 'Unread', value: true  },
        ].map(({ label, value }) => (
          <button
            key={label}
            onClick={() => { setUnreadOnly(value); setPage(1); }}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              unreadOnly === value
                ? 'bg-white shadow text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="card !p-0 overflow-hidden divide-y divide-gray-100">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 px-5 py-4 animate-pulse">
                <div className="w-9 h-9 rounded-full bg-gray-200 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                  <div className="h-3 bg-gray-200 rounded w-full" />
                  <div className="h-3 bg-gray-200 rounded w-1/4" />
                </div>
              </div>
            ))
          : notifications.length === 0
            ? (
                <div className="px-5 py-14 text-center">
                  <Bell className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">
                    {unreadOnly ? 'No unread notifications' : 'No notifications yet'}
                  </p>
                </div>
              )
            : notifications.map((n) => (
                <div
                  key={n._id || n.id}
                  className={`flex items-start gap-3 px-5 py-4 transition-colors ${
                    n.isRead ? 'bg-white' : 'bg-blue-50/40'
                  }`}
                >
                  <NotifIcon type={n.type} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm leading-snug ${n.isRead ? 'text-gray-700' : 'text-gray-900 font-semibold'}`}>
                        {n.title}
                      </p>
                      {!n.isRead && (
                        <button
                          onClick={() => markOneMutation.mutate(n._id || n.id)}
                          className="flex-shrink-0 text-xs text-blue-600 hover:text-blue-800 whitespace-nowrap"
                          title="Mark as read"
                        >
                          Mark read
                        </button>
                      )}
                    </div>

                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>

                    <p className="text-xs text-gray-400 mt-1.5">
                      {n.createdAt
                        ? formatDistanceToNow(parseISO(n.createdAt), { addSuffix: true })
                        : ''}
                    </p>
                  </div>

                  {/* Unread dot */}
                  {!n.isRead && (
                    <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                  )}
                </div>
              ))}
      </div>

      {/* Pagination */}
      {total > LIMIT && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>
            Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn btn-secondary p-1.5 disabled:opacity-40"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page * LIMIT >= total}
              className="btn btn-secondary p-1.5 disabled:opacity-40"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
