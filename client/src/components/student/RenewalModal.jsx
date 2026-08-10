import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Clock, Upload, CheckCircle, X, AlertTriangle } from 'lucide-react';
import { renewalService } from '../../services/renewalService';

export default function RenewalModal({ open, onClose, currentExpiry }) {
  const queryClient = useQueryClient();
  const [duration, setDuration] = useState('1 Month(s)');
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('upi');
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(600); // 10 minutes in seconds
  const [requestSubmitted, setRequestSubmitted] = useState(false);

  // 10-minute timer countdown
  useEffect(() => {
    if (!open || requestSubmitted) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [open, requestSubmitted]);

  // Format time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      setDuration('1 Month(s)');
      setAmount('');
      setPaymentMode('upi');
      setScreenshotUrl('');
      setNotes('');
      setTimeRemaining(600);
      setRequestSubmitted(false);
    }
  }, [open]);

  const createRenewalMutation = useMutation({
    mutationFn: (data) => renewalService.createRenewalRequest(data),
    onSuccess: (data) => {
      toast.success('✅ Renewal request submitted successfully!');
      setRequestSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ['student', 'renewal-status'] });
      queryClient.invalidateQueries({ queryKey: ['student', 'dashboard'] });
      
      // Auto-close after 3 seconds
      setTimeout(() => {
        onClose();
      }, 3000);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to submit renewal request');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!duration || !amount || !screenshotUrl) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (timeRemaining <= 0) {
      toast.error('Time expired. Please refresh and try again');
      return;
    }

    createRenewalMutation.mutate({
      duration,
      amount: parseFloat(amount),
      paymentMode,
      screenshotUrl,
      notes
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Renew Membership</h2>
              <p className="text-sm text-gray-500 mt-1">Current expiry: {currentExpiry || 'N/A'}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Timer Display */}
        {!requestSubmitted && (
          <div className="bg-orange-50 border-b border-orange-100 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className={`w-5 h-5 ${timeRemaining <= 60 ? 'text-red-500' : 'text-orange-500'}`} />
                <span className="text-sm font-medium text-gray-700">
                  {timeRemaining <= 60 ? 'Hurry! Time expires soon' : 'Complete verification within'}
                </span>
              </div>
              <div className={`text-2xl font-bold ${timeRemaining <= 60 ? 'text-red-600' : 'text-orange-600'}`}>
                {formatTime(timeRemaining)}
              </div>
            </div>
          </div>
        )}

        {/* Success Message */}
        {requestSubmitted && (
          <div className="bg-green-50 border-b border-green-100 p-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div>
                <p className="font-semibold text-green-800">Request Submitted!</p>
                <p className="text-sm text-green-600">Admin will verify your payment shortly</p>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        {!requestSubmitted && (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration *</label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-library-blue focus:border-transparent"
              >
                <option value="1 Month(s)">1 Month</option>
                <option value="2 Month(s)">2 Months</option>
                <option value="3 Month(s)">3 Months</option>
                <option value="6 Month(s)">6 Months</option>
                <option value="12 Month(s)">12 Months</option>
              </select>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹) *</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-library-blue focus:border-transparent"
                required
              />
            </div>

            {/* Payment Mode */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode *</label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-library-blue focus:border-transparent"
              >
                <option value="upi">UPI</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cash">Cash</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Screenshot Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Screenshot/QR Confirmation *</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-library-blue transition-colors">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <input
                  type="text"
                  value={screenshotUrl}
                  onChange={(e) => setScreenshotUrl(e.target.value)}
                  placeholder="Paste screenshot URL here"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-library-blue focus:border-transparent text-sm"
                  required
                />
                <p className="text-xs text-gray-400 mt-2">Upload screenshot and paste the URL here</p>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-library-blue focus:border-transparent resize-none"
              />
            </div>

            {/* Warning */}
            {timeRemaining <= 60 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">
                  Less than 1 minute remaining! Submit your request quickly or refresh to start over.
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={createRenewalMutation.isPending || timeRemaining <= 0}
              className="w-full py-3 bg-library-blue hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {createRenewalMutation.isPending ? (
                <>
                  <Clock className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Submit Renewal Request
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}