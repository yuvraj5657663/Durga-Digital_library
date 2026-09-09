import Payment from '../models/Payment.js';
import { successResponse, paginatedResponse } from '../utils/response.js';
import { asyncHandler, NotFoundError, ValidationError } from '../utils/errors.js';
import { refundPayment } from '../services/paymentService.js';
import { generateAdmissionReceipt, generateRenewalReceipt } from '../services/pdfService.js';

export const listPaymentsController = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, studentId, status } = req.query;
  const parsedPage = Math.max(1, parseInt(page, 10));
  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const filter = {};
  if (studentId) filter.student = studentId;
  if (status) filter.status = status;

  const skip = (parsedPage - 1) * parsedLimit;
  const [payments, total] = await Promise.all([
    Payment.find(filter)
      .populate('student', 'name studentId mobile email')
      .populate('membership')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit),
    Payment.countDocuments(filter)
  ]);

  return paginatedResponse(res, payments, {
    page: parsedPage,
    limit: parsedLimit,
    total
  }, 'Payment history retrieved');
});

export const refundPaymentController = asyncHandler(async (req, res) => {
  const { reason = '' } = req.body;
  const payment = await Payment.findById(req.params.id);
  if (!payment) throw new NotFoundError('Payment not found');
  if (!['PAID', 'completed'].includes(payment.status)) {
    throw new ValidationError('Only paid payments can be refunded');
  }

  await refundPayment(payment, { actorId: req.user.id, reason });

  return successResponse(res, payment, 'Payment refunded');
});

export const downloadPaymentReceiptController = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id).populate('student').populate('membership');
  if (!payment) throw new NotFoundError('Payment not found');
  const receipt = payment.type === 'renewal'
    ? await generateRenewalReceipt({ student: payment.student, membership: payment.membership, payment })
    : await generateAdmissionReceipt({ student: payment.student, payment });
  res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="Receipt_${payment.receiptNo || payment._id}.pdf"` });
  return res.send(receipt);
});
