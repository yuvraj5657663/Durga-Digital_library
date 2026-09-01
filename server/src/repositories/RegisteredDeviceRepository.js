import BaseRepository from './BaseRepository.js';
import RegisteredDevice from '../models/RegisteredDevice.js';

class RegisteredDeviceRepository extends BaseRepository {
  constructor() {
    super(RegisteredDevice);
  }

  async findByDeviceId(deviceId) {
    return this.findOne({ deviceId });
  }

  async findByFingerprint(studentId, fingerprint) {
    const { macAddress, userAgent } = fingerprint;
    
    if (macAddress) {
      const deviceByMac = await this.findOne({
        student: studentId,
        'deviceFingerprint.macAddress': macAddress
      });
      if (deviceByMac) return deviceByMac;
    }
    
    if (userAgent) {
      const deviceByUA = await this.findOne({
        student: studentId,
        'deviceFingerprint.userAgent': userAgent
      });
      if (deviceByUA) return deviceByUA;
    }
    
    return null;
  }

  async findByMacAddress(studentId, macAddress) {
    return this.findOne({
      student: studentId,
      'deviceFingerprint.macAddress': macAddress
    });
  }

  async findByUserAgent(studentId, userAgent) {
    return this.findOne({
      student: studentId,
      'deviceFingerprint.userAgent': userAgent
    });
  }

  async createDevice(deviceData) {
    return this.create(deviceData);
  }

  async updateLastSeen(deviceId) {
    return this.updateOne(
      { deviceId },
      { 'deviceInfo.lastSeen': new Date() }
    );
  }

  async updateSecurityCheck(deviceId) {
    return this.updateOne(
      { deviceId },
      { 'security.lastSecurityCheck': new Date() }
    );
  }

  async updateStatus(deviceId, status) {
    return this.updateOne({ deviceId }, { status });
  }

  async countActiveByStudentId(studentId) {
    return this.count({
      student: studentId,
      status: 'active'
    });
  }

  async findByStudentId(studentId, options = {}) {
    const { sort = { createdAt: -1 } } = options;
    return this.find({ student: studentId }, { sort });
  }

  async findActiveByStudentId(studentId) {
    return this.find({
      student: studentId,
      status: 'active'
    });
  }
}

export default new RegisteredDeviceRepository();
