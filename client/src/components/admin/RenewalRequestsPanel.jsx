import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { CheckCircle, X, Clock, RefreshCw, AlertTriangle, CreditCard, Calendar, User, Loader2 } from 'lucide-react';
import { renewalService } from '../../services/renewalService';

export default function RenewalRequestsPanel() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  const { data: requests, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'renewal-requests', statusFilter],
    queryFn: () => renewalService.getRenewalRequests({ status: statusFilter }),
    refetchInterval: 30_000, // Refresh every 30 seconds
  });

  const approveMutation = useMutation({
    mutationFn: ({ requestId, adminNotes }) => renewalService.approveRenewalRequest(requestId, adminNotes),
    onSuccess: () => {
      toast.success('✅ Renewal approved and processed successfully!');
      queryClient.invalidateQueries({ queryKey: ['admin', 'renewal-requests'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      setSelectedRequest(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to approve renewal');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ requestId, rejectionReason }) => renewalService.rejectRenewalRequest(requestId, rejectionReason),
    onSuccess: () => {
      toast.success('✅ Renewal request rejected');
      queryClient.invalidateQueries({ queryKey: ['admin', 'renewal-requests'] });
      setShowRejectModal(false);
      setSelectedRequest(null);
      setRejectionReason('');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to reject renewal');
    },
  });

  const handleApprove = (request) => {
    if (window.confirm(`Approve renewal request for ${request.student?.name}?`)) {
      approveMutation.mutate({ 
        requestId: request._id, 
        adminNotes: `Approved by admin` 
      });
    }
  };

  const handleReject = () => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    rejectMutation.mutate({ 
      requestId: selectedRequest._id, 
      rejectionReason 
    });
  };

  const formatTimeRemaining = (expiresAt) => {
    if (!expiresAt) return 'N/A';
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = Math.max(0, Math.floor((expires - now) / 1000));
    const mins = Math.floor(diff / 60);
    const secs = diff % 60;
    return `${mins}m ${secs}s`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'processing': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'completed': return 'bg-green-100 text-green-700 border-green-200';
      case 'failed': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900">Renewal Requests</h2>
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-library-blue focus:border-transparent"
          >
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
          <button
            onClick={() => refetch()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : !requests?.data || requests.data.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">
          No renewal requests found
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {requests.data.map((request) => (
            <div key={request._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(request.status)}`}>
                      {request.status}
                    </span>
                    {request.expiresAt && request.status === 'pending' && (
                      <span className="flex items-center gap-1 text-xs text-orange-600">
                        <Clock className="w-3 h-3" />
                        {formatTimeRemaining(request.expiresAt)}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="font-medium text-gray-900">{request.student?.name || 'Unknown'}</span>
                    <span className="text-xs text-gray-400">({request.student?.studentId || 'N/A'})</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <CreditCard className="w-3 h-3" />
                      <span>₹{request.amount}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{request.duration}</span>
                    </div>
                  </div>

                  {request.screenshotUrl && (
                    <div className="mt-2">
                      <a
                        href={request.screenshotUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-library-blue hover:underline"
                      >
                        View Payment Screenshot
                      </a>
                    </div>
                  )}

                  {request.notes && (
                    <p className="text-xs text-gray-500 mt-1 italic">"{request.notes}"</p>
                  )}

                  {request.rejectionReason && (
                    <div className="mt-2 bg-red-50 border border-red-200 rounded p-2">
                      <p className="text-xs text-red-700 font-medium">Rejected: {request.rejectionReason}</p>
                    </div>
                  )}
                </div>

                {request.status === 'pending' && (
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleApprove(request)}
                      disabled={approveMutation.isPending}
                      className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors disabled:opacity-50"
                      title="Approve"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedRequest(request);
                        setShowRejectModal(true);
                      }}
                      disabled={rejectMutation.isPending}
                      className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50"
                      title="Reject"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Reject Renewal Request</h3>
              <p className="text-sm text-gray-600 mb-4">
                Reject renewal request for <strong>{selectedRequest.student?.name}</strong>?
              </p>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter rejection reason..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-library-blue focus:border-transparent resize-none"
              />
              <div className="flex items-center justify-end gap-3 mt-4">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setSelectedRequest(null);
                    setRejectionReason('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={rejectMutation.isPending}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}