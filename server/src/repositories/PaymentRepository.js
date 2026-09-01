import BaseRepository from './BaseRepository.js';
import Payment from '../models/Payment.js';

class PaymentRepository extends BaseRepository {
  constructor() {
    super(Payment);
  }

  async createPayment(paymentData) {
    return this.create(paymentData);
  }

  async findByPaymentId(paymentId) {
    return this.findOne({ paymentId });
  }

  async findByMembershipId(membershipId) {
    return this.find({ membershipRef: membershipId });
  }

  async findByStudentId(studentId, options = {}) {
    return this.find({ student: studentId }, options);
  }

  async findByReceiptNo(receiptNo) {
    return this.findOne({ receiptNo });
  }

  async findByDateRange(startDate, endDate) {
    return this.find({
      paidOn: { $gte: startDate, $lte: endDate }
    });
  }

  async updateStatus(paymentId, status) {
    return this.updateOne({ paymentId }, { status });
  }
}

export default new PaymentRepository();
