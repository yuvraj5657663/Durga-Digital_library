import Payment from '../models/Payment.js';
import AuditLog from '../models/AuditLog.js';
import { toActorId } from '../utils/actorId.js';

export async function createPayment({
  student,
  membership = null,
  type = 'admission',
  amount,
  paidOn = new Date().toISOString().slice(0, 10),
  plan = '',
  reference = '',
  notes = '',
  collectedBy,
  method = 'CASH',
  status = 'PAID',
  receiptNo,
  session
}) {
  const [payment] = await Payment.create([{
    student,
    membership,
    receiptNo,
    type,
    amount: parseFloat(amount),
    method,
    mode: method === 'CASH' ? 'cash' : 'other',
    status,
    paidOn,
    reference,
    transactionId: reference,
    notes,
    duration: plan,
    collectedBy: toActorId(collectedBy)
  }], session ? { session } : undefined);

  return payment;
}

export async function recordCashPayment(options) {
  return createPayment({ ...options, method: 'CASH', status: options.status || 'PAID' });
}

export async function refundPayment(payment, { actorId, reason = '' } = {}) {
  payment.status = 'REFUNDED';
  payment.notes = [payment.notes, reason].filter(Boolean).join(' | ');
  payment.metadata = {
    ...(payment.metadata || {}),
    refundedBy: toActorId(actorId),
    refundedAt: new Date().toISOString(),
    refundReason: reason
  };
  await payment.save();
  await AuditLog.create({
    action: 'payment_refunded',
    actorId: toActorId(actorId),
    targetType: 'Payment',
    targetId: payment._id.toString(),
    targetName: payment.receiptNo || '',
    details: { reason, amount: payment.amount, method: payment.method || payment.mode }
  });
  return payment;
}
