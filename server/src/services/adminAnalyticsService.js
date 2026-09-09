import Student from '../models/Student.js';
import Attendance from '../models/Attendance.js';
import Payment from '../models/Payment.js';

const PAID_STATUSES = { $in: ['PAID', 'completed'] };

function dateOnly(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function studentSummary(student) {
  return {
    name: student.name,
    studentId: student.studentId,
    mobile: student.mobile,
    seatCode: student.seatCode,
    expiryDate: student.expiryDate,
    status: student.status
  };
}

export function parseAnalyticsIntent(question = '') {
  const normalized = String(question).trim().toLowerCase();
  const expiryMatch = normalized.match(/expir(?:e|es|ing|y)\s+(?:in|within|next)\s+(\d+)\s+days?/)
    || normalized.match(/(?:next|within)\s+(\d+)\s+days?.*(?:expir|renew)/);
  if (expiryMatch) return { type: 'expiring', days: Math.min(365, Math.max(0, Number(expiryMatch[1]))) };

  const absentMatch = normalized.match(/absent\s+(\d+)\+?\s+days?/) || normalized.match(/(?:no attendance|not attended).*(\d+)\s+days?/);
  if (absentMatch) return { type: 'absent', days: Math.min(90, Math.max(1, Number(absentMatch[1]))) };

  if ((normalized.includes('today') || normalized.includes('today\'s')) && (normalized.includes('cash') || normalized.includes('collection') || normalized.includes('revenue'))) {
    return { type: 'cash_today' };
  }

  return { type: 'unsupported' };
}

export async function answerAnalyticsQuestion(question) {
  const intent = parseAnalyticsIntent(question);
  const today = dateOnly(new Date());

  if (intent.type === 'expiring') {
    const endDate = dateOnly(addDays(new Date(), intent.days));
    const students = await Student.find({
      status: 'Active',
      expiryDate: { $gte: today, $lte: endDate }
    }).select('name studentId mobile seatCode expiryDate status').sort({ expiryDate: 1 }).lean();
    return {
      provider: 'deterministic-analytics',
      intent,
      answer: `${students.length} student${students.length === 1 ? '' : 's'} expire${students.length === 1 ? 's' : ''} within ${intent.days} days.`,
      results: students.map(studentSummary)
    };
  }

  if (intent.type === 'absent') {
    const dates = Array.from({ length: intent.days }, (_, index) => dateOnly(addDays(new Date(), -index - 1)));
    const attendance = await Attendance.find({ date: { $in: dates } }).select('student date').lean();
    const attended = new Set(attendance.map(record => String(record.student)));
    const students = await Student.find({ status: 'Active' }).select('name studentId mobile seatCode expiryDate status').lean();
    const absentStudents = students.filter(student => !attended.has(String(student._id)));
    return {
      provider: 'deterministic-analytics',
      intent,
      answer: `${absentStudents.length} active student${absentStudents.length === 1 ? '' : 's'} had no attendance in the last ${intent.days} days.`,
      results: absentStudents.map(studentSummary)
    };
  }

  if (intent.type === 'cash_today') {
    const payments = await Payment.find({
      paidOn: today,
      method: { $in: ['CASH', 'cash'] },
      status: PAID_STATUSES
    }).populate('student', 'name studentId seatCode').select('amount receiptNo reference type paidOn collectedBy student notes').lean();
    const total = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    return {
      provider: 'deterministic-analytics',
      intent,
      answer: `Today's cash collection is Rs. ${total.toLocaleString('en-IN')} across ${payments.length} payment${payments.length === 1 ? '' : 's'}.`,
      total,
      results: payments.map(payment => ({
        amount: payment.amount,
        receiptNo: payment.receiptNo,
        reference: payment.reference,
        type: payment.type,
        paidOn: payment.paidOn,
        collectedBy: payment.collectedBy,
        student: payment.student,
        notes: payment.notes
      }))
    };
  }

  return {
    provider: 'deterministic-analytics',
    intent,
    answer: 'I can answer expiry, absence, and today\'s cash collection questions. Try: "who expires in 7 days?"',
    results: []
  };
}
