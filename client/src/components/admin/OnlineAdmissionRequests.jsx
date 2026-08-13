import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Phone, MessageCircle, Check, X, Trash2, Calendar, MapPin, Clock, BadgeCheck, RefreshCw } from 'lucide-react';
import { admissionInquiryService } from '../../services/admissionInquiryService';

const statusColors = {
  'Pending': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'Approved': 'bg-green-100 text-green-800 border-green-200',
  'Rejected': 'bg-red-100 text-red-800 border-red-200',
  'Seat Assigned': 'bg-blue-100 text-blue-800 border-blue-200'
};

const statusBadge = (status) => (
  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
    {status}
  </span>
);

export default function OnlineAdmissionRequests() {
  const [filter, setFilter] = useState('all');
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: inquiriesData, isLoading, refetch, error: inquiriesError } = useQuery({
    queryKey: ['admission-inquiries', filter],
    queryFn: () => admissionInquiryService.getAll(filter !== 'all' ? { status: filter } : {}),
    refetchInterval: 30000, // Refresh every 30 seconds
    onError: (error) => {
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        navigate('/login');
      }
    }
  });

  const { data: pendingCountData, error: countError } = useQuery({
    queryKey: ['admission-inquiries-pending-count'],
    queryFn: admissionInquiryService.getPendingCount,
    refetchInterval: 30000,
    onError: (error) => {
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        navigate('/login');
      }
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => admissionInquiryService.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admission-inquiries'] });
      queryClient.invalidateQueries({ queryKey: ['admission-inquiries-pending-count'] });
      refetch(); // Force immediate refresh
      toast.success('Status updated successfully');
    },
    onError: (error) => {
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        navigate('/login');
      } else {
        toast.error(error.response?.data?.message || 'Failed to update status');
      }
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => admissionInquiryService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admission-inquiries'] });
      queryClient.invalidateQueries({ queryKey: ['admission-inquiries-pending-count'] });
      refetch(); // Force immediate refresh
      toast.success('Inquiry deleted successfully');
    },
    onError: (error) => {
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        navigate('/login');
      } else {
        toast.error(error.response?.data?.message || 'Failed to delete inquiry');
      }
    }
  });

  const handleStatusUpdate = (id, newStatus) => {
    updateStatusMutation.mutate({ id, status: newStatus });
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this inquiry?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleCall = (phone) => {
    window.open(`tel:${phone}`, '_blank');
  };

  const handleWhatsApp = (whatsapp) => {
    const normalizedNumber = whatsapp.startsWith('91') ? whatsapp : `91${whatsapp}`;
    window.open(`https://wa.me/${normalizedNumber}`, '_blank');
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatJoiningDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const inquiries = inquiriesData?.data || [];
  const pendingCount = pendingCountData?.data?.count || 0;

  const filteredInquiries = filter === 'all' 
    ? inquiries 
    : inquiries.filter(inquiry => inquiry.status === filter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Online Admission Requests</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage and respond to online admission applications
          </p>
        </div>
        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <div className="bg-orange-100 text-orange-800 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2">
              <BadgeCheck className="w-4 h-4" />
              {pendingCount} New Admission Inquiries
            </div>
          )}
          <button
            onClick={() => refetch()}
            className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 bg-white p-2 rounded-lg border border-gray-200">
        {['all', 'Pending', 'Approved', 'Rejected', 'Seat Assigned'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === status
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
            {status === 'Pending' && pendingCount > 0 && (
              <span className="ml-2 bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading inquiries...</div>
        ) : inquiriesError ? (
          <div className="p-8 text-center text-red-500">
            Failed to load inquiries. Please try refreshing.
            <button
              onClick={() => refetch()}
              className="ml-2 text-blue-600 hover:underline"
            >
              Retry
            </button>
          </div>
        ) : filteredInquiries.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No admission inquiries found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Student Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Shift
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredInquiries.map((inquiry) => (
                  <tr key={inquiry.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {formatDate(inquiry.createdAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="font-medium text-gray-900">{inquiry.name}</div>
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <MapPin className="w-3 h-3" />
                          {inquiry.address}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Clock className="w-3 h-3" />
                          Joining: {formatJoiningDate(inquiry.joiningDate)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-700">{inquiry.phone}</span>
                          <button
                            onClick={() => handleCall(inquiry.phone)}
                            className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                            title="Call"
                          >
                            <Phone className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-700">{inquiry.whatsapp}</span>
                          <button
                            onClick={() => handleWhatsApp(inquiry.whatsapp)}
                            className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                            title="WhatsApp"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-700">{inquiry.shift}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {statusBadge(inquiry.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {inquiry.status === 'Pending' && (
                          <>
                            <button
                              onClick={() => handleStatusUpdate(inquiry.id, 'Approved')}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Approve"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleStatusUpdate(inquiry.id, 'Rejected')}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Reject"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {inquiry.status === 'Approved' && (
                          <button
                            onClick={() => handleStatusUpdate(inquiry.id, 'Seat Assigned')}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Assign Seat"
                          >
                            <BadgeCheck className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleCall(inquiry.phone)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Call Student"
                        >
                          <Phone className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(inquiry.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
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
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-gray-900">{inquiries.length}</div>
          <div className="text-sm text-gray-500">Total Inquiries</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-yellow-600">{inquiries.filter(i => i.status === 'Pending').length}</div>
          <div className="text-sm text-gray-500">Pending</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-green-600">{inquiries.filter(i => i.status === 'Approved').length}</div>
          <div className="text-sm text-gray-500">Approved</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-blue-600">{inquiries.filter(i => i.status === 'Seat Assigned').length}</div>
          <div className="text-sm text-gray-500">Seat Assigned</div>
        </div>
      </div>
    </div>
  );
}