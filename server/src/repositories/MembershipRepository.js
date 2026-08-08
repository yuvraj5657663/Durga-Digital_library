import BaseRepository from './BaseRepository.js';
import Membership from '../models/Membership.js';

class MembershipRepository extends BaseRepository {
  constructor() {
    super(Membership);
  }

  async findActiveByStudent(studentId) {
    return this.findOne({ 
      student: studentId, 
      status: 'Active' 
    });
  }

  async findByStudent(studentId, options = {}) {
    return this.find({ student: studentId }, options);
  }

  async findExpiring(date) {
    return this.find({
      status: 'Active',
      expiryDate: { $lt: date }
    });
  }

  async deactivateActiveMemberships(studentId) {
    return this.updateMany(
      { student: studentId, status: 'Active' },
      { status: 'Inactive' }
    );
  }

  async expireMemberships(date) {
    return this.updateMany(
      { status: 'Active', expiryDate: { $lt: date } },
      { status: 'Expired' }
    );
  }

  async getHistory(studentId, options = {}) {
    return this.paginate({ student: studentId }, options);
  }

  async getActiveCount() {
    return this.count({ status: 'Active' });
  }

  async getExpiringCount(date) {
    return this.count({
      status: 'Active',
      expiryDate: { $lt: date }
    });
  }
}

export default new MembershipRepository();
