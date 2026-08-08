import BaseRepository from './BaseRepository.js';
import User from '../models/User.js';

class UserRepository extends BaseRepository {
  constructor() {
    super(User);
  }

  async findByEmail(email) {
    return this.findOne({ email: email.toLowerCase() });
  }

  async findByUsername(username) {
    return this.findOne({ username: username.toLowerCase() });
  }

  async findByMobile(mobile) {
    return this.findOne({ mobile });
  }

  async findByLoginId(loginId) {
    const normalized = String(loginId).trim().toLowerCase();
    return this.findOne({
      $or: [
        { username: normalized },
        { email: normalized },
        { mobile: String(loginId).trim() }
      ]
    });
  }

  async findByStudentRef(studentId) {
    return this.findOne({ studentRef: studentId });
  }

  async updateRefreshToken(userId, tokenHash, expiresAt) {
    return this.updateById(userId, {
      $push: {
        refreshTokens: { tokenHash, createdAt: new Date(), expiresAt }
      }
    });
  }

  async removeRefreshToken(userId, tokenHash) {
    return this.updateById(userId, {
      $pull: { refreshTokens: { tokenHash } }
    });
  }

  async clearExpiredRefreshTokens(userId) {
    return this.updateById(userId, {
      $pull: { refreshTokens: { expiresAt: { $lt: new Date() } } }
    });
  }

  async createAdmin(data) {
    return this.create({
      ...data,
      role: 'admin',
      username: data.username.toLowerCase(),
      email: data.email.toLowerCase()
    });
  }

  async createStudent(data) {
    return this.create({
      ...data,
      role: 'student',
      username: data.username?.toLowerCase(),
      email: data.email?.toLowerCase()
    });
  }
}

export default new UserRepository();
