import Attendance from '../models/Attendance.js';
import Student from '../models/Student.js';
import { successResponse, paginatedResponse } from '../utils/response.js';
import { asyncHandler } from '../utils/errors.js';
import { NotFoundError } from '../utils/errors.js';
import AuditLog from '../models/AuditLog.js';

export const listAttendanceController = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, date, shift, branch } = req.query;
  
  const filter = {};
  if (date) filter.date = date;
  if (shift) filter.shift = shift;
  if (branch) filter.branch = branch;

  const skip = (page - 1) * limit;
  const [attendance, total] = await Promise.all([
    Attendance.find(filter)
      .populate('student', 'name mobile seatCode')
      .sort({ date: -1, checkIn: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Attendance.countDocuments(filter)
  ]);

  return paginatedResponse(res, attendance, { page: parseInt(page), limit: parseInt(limit), total }, 'Attendance retrieved');
});

export const markAttendanceController = asyncHandler(async (req, res) => {
  const { studentId, date, checkIn, checkOut, method, shift, seatCode, notes } = req.body;
  
  const student = await Student.findById(studentId);
  if (!student) {
    throw new NotFoundError('Student not found');
  }

  const attendance = await Attendance.findOneAndUpdate(
    { student: studentId, date },
    {
      student: studentId,
      date,
      checkIn: checkIn || new Date().toTimeString().slice(0, 5),
      checkOut,
      method: method || 'manual',
      shift: shift || student.shift,
      seatCode: seatCode || student.seatCode,
      markedBy: req.user.id,
      notes,
      branch: student.branch
    },
    { upsert: true, new: true }
  );

  await AuditLog.create({
    action: 'attendance_marked',
    actorId: req.user.id,
    actorRole: req.user.role,
    actorName: req.user.username,
    targetType: 'Attendance',
    targetId: attendance._id.toString(),
    targetName: `${student.name} - ${date}`,
    details: { method, checkIn, checkOut }
  });

  return successResponse(res, attendance, 'Attendance marked successfully');
});

export const scanQrAttendanceController = asyncHandler(async (req, res) => {
  const { studentId, date } = req.body || req.query;
  
  const student = await Student.findById(studentId);
  if (!student) {
    throw new NotFoundError('Student not found');
  }

  const today = date || new Date().toISOString().slice(0, 10);
  const now = new Date().toTimeString().slice(0, 5);

  const attendance = await Attendance.findOneAndUpdate(
    { student: studentId, date: today },
    {
      student: studentId,
      date: today,
      checkIn: now,
      method: 'qr_scan',
      shift: student.shift,
      seatCode: student.seatCode,
      markedBy: req.user.id,
      branch: student.branch
    },
    { upsert: true, new: true }
  );

  await AuditLog.create({
    action: 'attendance_qr_scan',
    actorId: req.user.id,
    actorRole: req.user.role,
    actorName: req.user.username,
    targetType: 'Attendance',
    targetId: attendance._id.toString(),
    targetName: `${student.name} - ${today}`,
    details: { method: 'qr_scan', checkIn: now }
  });

  return successResponse(res, attendance, 'QR attendance marked successfully');
});

export const getAttendanceStatsController = asyncHandler(async (req, res) => {
  const { date, branch } = req.query;
  const targetDate = date || new Date().toISOString().slice(0, 10);

  const filter = { date: targetDate };
  if (branch) filter.branch = branch;

  const [total, present, uniqueStudents] = await Promise.all([
    Attendance.countDocuments(filter),
    Attendance.countDocuments({ ...filter, checkIn: { $ne: '' } }),
    Attendance.distinct('student', filter)
  ]);

  const stats = {
    date: targetDate,
    total,
    present,
    absent: total - present,
    uniqueStudents: uniqueStudents.length
  };

  return successResponse(res, stats, 'Attendance stats retrieved');
});

export const deleteAttendanceController = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const attendance = await Attendance.findByIdAndDelete(id);

  if (!attendance) {
    throw new NotFoundError('Attendance record not found');
  }

  await AuditLog.create({
    action: 'attendance_deleted',
    actorId: req.user.id,
    actorRole: req.user.role,
    actorName: req.user.username,
    targetType: 'Attendance',
    targetId: id,
    details: { date: attendance.date, studentId: attendance.student }
  });

  return successResponse(res, null, 'Attendance deleted successfully');
});
