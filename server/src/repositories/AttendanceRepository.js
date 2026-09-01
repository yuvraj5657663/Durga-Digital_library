import BaseRepository from './BaseRepository.js';
import Attendance from '../models/Attendance.js';

class AttendanceRepository extends BaseRepository {
  constructor() {
    super(Attendance);
  }

  async findByStudentAndDate(studentId, date) {
    return this.findOne({ student: studentId, date });
  }

  async createAttendance(attendanceData) {
    return this.create(attendanceData);
  }

  async findOneAndUpdateAttendance(filter, update, options = {}) {
    return this.model.findOneAndUpdate(filter, update, {
      upsert: true,
      new: true,
      ...options
    });
  }

  async findById(attendanceId) {
    return this.findById(attendanceId);
  }

  async findByStudentId(studentId, options = {}) {
    const { limit = 50, skip = 0, sort = { date: -1 } } = options;
    return this.find({ student: studentId }, { limit, skip, sort });
  }

  async findByDateRange(startDate, endDate) {
    return this.find({
      date: { $gte: startDate, $lte: endDate }
    });
  }

  async findByShift(shift, date) {
    const filter = { shift };
    if (date) filter.date = date;
    return this.find(filter);
  }

  async findByBranch(branch, date) {
    const filter = { branch };
    if (date) filter.date = date;
    return this.find(filter);
  }

  async updateCheckOut(attendanceId, checkOut, checkOutTimestamp, durationMins) {
    return this.updateOne(
      { _id: attendanceId },
      {
        checkOut,
        checkOutTimestamp,
        durationMins,
        status: 'CHECKED_OUT'
      }
    );
  }

  async findTodayAttendance(studentId) {
    const today = new Date().toISOString().slice(0, 10);
    return this.findOne({ student: studentId, date: today });
  }
}

export default new AttendanceRepository();
