import BaseRepository from './BaseRepository.js';
import AuditLog from '../models/AuditLog.js';

class AuditLogRepository extends BaseRepository {
  constructor() {
    super(AuditLog);
  }

  async createLog(logData) {
    return this.create(logData);
  }

  async findByActor(actorId, options = {}) {
    const { limit = 100, skip = 0, sort = { createdAt: -1 } } = options;
    return this.find({ actorId }, { limit, skip, sort });
  }

  async findByAction(action, options = {}) {
    const { limit = 100, skip = 0, sort = { createdAt: -1 } } = options;
    return this.find({ action }, { limit, skip, sort });
  }

  async findByTargetType(targetType, options = {}) {
    const { limit = 100, skip = 0, sort = { createdAt: -1 } } = options;
    return this.find({ targetType }, { limit, skip, sort });
  }

  async findByDateRange(startDate, endDate) {
    return this.find({
      createdAt: { $gte: startDate, $lte: endDate }
    });
  }

  async findRecentLogs(limit = 50) {
    return this.find({}, { limit, sort: { createdAt: -1 } });
  }

  async deleteOldLogs(beforeDate) {
    return this.deleteMany({ createdAt: { $lt: beforeDate } });
  }
}

export default new AuditLogRepository();
