import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  CreditCard, Download, ChevronLeft, ChevronRight,
  IndianRupee, CheckCircle, Clock, AlertCircle
} from 'lucide-react';
import { portalService } from '../../services/portalService';

/* ── helpers ───────────────────────────────────────────────────────────────── */
const TYPE_MAP = {
  admission: { label: 'Admission',   color: 'bg-blue-100 text-blue-700'   },
  renewal:   { label: 'Renewal',     color: 'bg-green-100 text-green-700' },
  penalty:   { label: 'Penalty',     color: 'bg-red-100 text-red-700'     },
  refund:    { label: 'Refund',      color: 'bg-purple-100 text-purple-700'},
  other:     { label: 'Other',       color: 'bg-gray-100 text-gray-600'   },
};

const STATUS_ICON = {
  completed: <CheckCircle className="w-4 h-4 text-green-500" />,
  pending:   <Clock       className="w-4 h-4 text-yellow-500" />,
  failed:    <AlertCircle className="w-4 h-4 text-red-500"   />,
  refunded:  <IndianRupee className="w-4 h-4 text-purple-500" />,
};

function TypeBadge({ type }) {
  const { label, color } = TYPE_MAP[type] || TYPE_MAP.other;
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>
      {label}
    </span>
  );
}

/* ── PDF download ─────────────────────────────────────────────────────────── */
async function downloadReceipt(paymentId, receiptNo) {
  try {
    // Use role-scoped token storage — never raw localStorage
    const { getAccessToken } = await import('../../utils/tokenStorage');
    const token = getAccessToken();
    const res   = await fetch(`/api/v1/student/receipts/${paymentId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Receipt not available');

    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/pdf')) {
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `Receipt_${receiptNo || paymentId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      // API returned JSON (receipt data only) — show toast
      toast('PDF generation coming soon. Receipt data loaded.', { icon: '📄' });
    }
  } catch (err) {
    toast.error(err.message || 'Failed to download receipt');
  }
}

/* ── Page ─────────────────────────────────────────────────────────────────── */
const LIMIT = 10;

export default function PaymentsPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['student', 'payments', page],
    queryFn:  () => portalService.getPayments({ page, limit: LIMIT }),
  });

  const payments   = data?.data       || [];
  const pagination = data?.pagination || {};
  const total      = pagination.total || 0;

  // Summary totals
  const totalPaid = payments
    .filter((p) => p.status === 'completed')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  return (
    <div className="space-y-5 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900">My Payments</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="card !py-4 text-center">
          <p className="text-2xl font-bold text-library-blue">
            {isLoading ? '—' : total}
          </p>
          <p className="text-xs text-gray-500 mt-1">Total Transactions</p>
        </div>
        <div className="card !py-4 text-center">
          <p className="text-2xl font-bold text-green-600">
            {isLoading ? '—' : `₹${totalPaid.toLocaleString('en-IN')}`}
          </p>
          <p className="text-xs text-gray-500 mt-1">Paid (this page)</p>
        </div>
        <div className="card !py-4 text-center col-span-2 sm:col-span-1">
          <p className="text-2xl font-bold text-gray-700">
            {isLoading ? '—' : payments.filter((p) => p.type === 'renewal').length}
          </p>
          <p className="text-xs text-gray-500 mt-1">Renewals</p>
        </div>
      </div>

      {/* Table */}
      <div className="card !p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-700">Payment History</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Date', 'Receipt No', 'Type', 'Amount', 'Mode', 'Status', 'Receipt'].map((h) => (
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
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="animate-pulse bg-gray-200 h-4 rounded w-20" />
                        </td>
                      ))}
                    </tr>
                  ))
                : payments.length === 0
                  ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center">
                          <CreditCard className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                          <p className="text-gray-400 text-sm">No payment records yet</p>
                        </td>
                      </tr>
                    )
                  : payments.map((p) => (
                      <tr key={p._id || p.id} className="hover:bg-gray-50 transition-colors">
                        {/* Date */}
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          {p.paidOn
                            ? new Date(p.paidOn).toLocaleDateString('en-IN', {
                                day: '2-digit', month: 'short', year: 'numeric',
                              })
                            : '—'}
                        </td>

                        {/* Receipt No */}
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">
                          {p.receiptNo || '—'}
                        </td>

                        {/* Type */}
                        <td className="px-4 py-3">
                          <TypeBadge type={p.type} />
                        </td>

                        {/* Amount */}
                        <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">
                          ₹{(p.amount || 0).toLocaleString('en-IN')}
                        </td>

                        {/* Mode */}
                        <td className="px-4 py-3 text-gray-500 capitalize whitespace-nowrap">
                          {p.mode || '—'}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {STATUS_ICON[p.status] || null}
                            <span className="text-xs text-gray-600 capitalize">{p.status}</span>
                          </div>
                        </td>

                        {/* Download */}
                        <td className="px-4 py-3">
                          <button
                            onClick={() => downloadReceipt(p._id || p.id, p.receiptNo)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-library-blue hover:text-blue-800 hover:underline"
                            title="Download Receipt PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                            PDF
                          </button>
                        </td>
                      </tr>
                    ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > LIMIT && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
            <span>
              Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}
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
                disabled={page * LIMIT >= total}
                className="btn btn-secondary p-1.5 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
