import BaseRepository from './BaseRepository.js';
import CaptivePortalSession from '../models/CaptivePortalSession.js';

class CaptivePortalSessionRepository extends BaseRepository {
  constructor() {
    super(CaptivePortalSession);
  }

  async findByPortalSessionId(portalSessionId) {
    return this.findOne({ portalSessionId });
  }

  async createPortalSession(sessionData) {
    return this.create(sessionData);
  }

  async updateStatus(portalSessionId, status) {
    return this.updateOne({ portalSessionId }, { status });
  }

  async updateFailureReason(portalSessionId, reason) {
    return this.updateOne({ portalSessionId }, { failureReason: reason });
  }

  async markAuthorized(portalSessionId, studentId, deviceId, wifiSessionId) {
    return this.updateOne(
      { portalSessionId },
      {
        status: 'authorized',
        student: studentId,
        device: deviceId,
        wifiSession: wifiSessionId,
        authenticatedAt: new Date(),
        authorizedAt: new Date()
      }
    );
  }

  async markExpired(portalSessionId) {
    return this.updateOne({ portalSessionId }, { status: 'expired' });
  }

  async markFailed(portalSessionId, reason) {
    return this.updateOne(
      { portalSessionId },
      {
        status: 'failed',
        failureReason: reason
      }
    );
  }

  async findPendingSessions() {
    return this.find({ status: 'pending' });
  }

  async findExpiredSessions() {
    return this.find({ status: 'expired' });
  }

  async findWithPopulations(portalSessionId) {
    return this.model.findOne({ portalSessionId })
      .populate('student', 'studentId name')
      .populate('device', 'deviceId deviceInfo')
      .populate('wifiSession', 'sessionId status expiresAt');
  }
}

export default new CaptivePortalSessionRepository();
