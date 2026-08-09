import BaseRepository from './BaseRepository.js';
import Student from '../models/Student.js';

class StudentRepository extends BaseRepository {
  constructor() {
    super(Student);
  }

  async createStudent(data) {
    // Normalize mobile number
    const mobile = String(data.mobile || '').replace(/\D/g, '');
    const normalizedMobile = mobile.length === 10 ? `91${mobile}` : mobile;
    
    const studentData = {
      ...data,
      mobile,
      normalizedMobile,
      status: 'Active'
    };
    
    return this.create(studentData);
  }

  async findByStudentId(studentId) {
    return this.findOne({ studentId });
  }

  async findByMobile(mobile) {
    return this.findOne({ mobile });
  }

  async findByEmail(email) {
    return this.findOne({ email: email.toLowerCase() });
  }

  async findBySeatCode(seatCode, shift) {
    const filter = { seatCode };
    if (shift) filter.shift = shift;
    return this.findOne(filter);
  }

  async findActiveByExpiryDate(date) {
    return this.find({ 
      status: 'Active',
      expiryDate: { $lt: date }
    });
  }

  async findExpiringSoon(withinDays = 5) {
    const today = new Date().toISOString().slice(0, 10);
    const limit = new Date();
    limit.setDate(limit.getDate() + withinDays);
    const limitStr = limit.toISOString().slice(0, 10);

    return this.find({
      status: 'Active',
      expiryDate: { $gte: today, $lte: limitStr }
    });
  }

  async findByBranch(branch) {
    return this.find({ branch });
  }

  async findByShift(shift) {
    return this.find({ shift });
  }

  async updateStatus(studentId, status) {
    return this.updateById(studentId, { status });
  }

  async updateSeat(studentId, seatCode, shift) {
    return this.updateById(studentId, { seatCode, shift });
  }

  async updateMembershipRef(studentId, membershipId) {
    return this.updateById(studentId, { membershipRef: membershipId });
  }

  async deactivateStudent(studentId) {
    return this.updateById(studentId, { status: 'Inactive' });
  }

  async getStatsByBranch(branch) {
    const stats = await this.model.aggregate([
      { $match: branch ? { branch } : {} },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    return stats;
  }
}

export default new StudentRepository();
