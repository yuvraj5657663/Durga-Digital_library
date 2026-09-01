import BaseRepository from './BaseRepository.js';
import WiFiSession from '../models/WiFiSession.js';

class WiFiSessionRepository extends BaseRepository {
  constructor() {
    super(WiFiSession);
  }

  async findBySessionId(sessionId) {
    return this.findOne({ sessionId });
  }

  async findByTokenHash(tokenHash) {
    return this.findOne({ tokenHash });
  }

  async findActiveByDevice(deviceId) {
    return this.findOne({
      device: deviceId,
      status: 'active',
      expiresAt: { $gt: new Date() }
    });
  }

  async findActiveByStudent(studentId) {
    return this.find({
      student: studentId,
      status: 'active',
      expiresAt: { $gt: new Date() }
    });
  }

  async createSession(sessionData) {
    return this.create(sessionData);
  }

  async updateStatus(sessionId, status) {
    return this.updateOne({ sessionId }, { status });
  }

  async updateLastActivity(sessionId) {
    return this.updateOne({ sessionId }, { lastActivityAt: new Date() });
  }

  async updateTokenHash(sessionId, tokenHash) {
    return this.updateOne({ sessionId }, { tokenHash });
  }

  async updateAttendance(sessionId, attendanceId, created = true) {
    return this.updateOne(
      { sessionId },
      {
        'attendance.attendanceId': attendanceId,
        'attendance.created': created
      }
    );
  }

  async expireOldSessions(beforeDate) {
    const result = await this.updateMany(
      {
        status: 'active',
        expiresAt: { $lt: beforeDate }
      },
      { status: 'expired' }
    );
    return result;
  }

  async revokeBySessionId(sessionId, reason) {
    return this.updateOne(
      { sessionId },
      {
        status: 'revoked',
        revokedAt: new Date(),
        revokedReason: reason
      }
    );
  }

  async revokeAllByStudent(studentId, reason) {
    return this.updateMany(
      {
        student: studentId,
        status: 'active'
      },
      {
        status: 'revoked',
        revokedAt: new Date(),
        revokedReason: reason
      }
    );
  }

  async findActiveSessions() {
    return this.find({ status: 'active' });
  }

  async findSessionsToExpire(beforeDate) {
    return this.find({
      status: 'active',
      expiresAt: { $lt: beforeDate }
    }).populate('student').populate('device');
  }

  async restoreSession(sessionId) {
    const config = await import('../config/index.js');
    const expiresAt = new Date(Date.now() + config.wifi.sessionDurationMinutes * 60 * 1000);
    
    return this.updateOne(
      { sessionId },
      {
        status: 'active',
        startedAt: new Date(),
        expiresAt,
        lastActivityAt: new Date(),
        revokedAt: null,
        revokedReason: null
      }
    );
  }
}

export default new WiFiSessionRepository();
