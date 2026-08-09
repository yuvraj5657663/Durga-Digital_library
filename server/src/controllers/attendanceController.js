import Attendance from '../models/Attendance.js';
import Student from '../models/Student.js';
import { successResponse, paginatedResponse } from '../utils/response.js';
import { asyncHandler, NotFoundError } from '../utils/errors.js';
import AuditLog from '../models/AuditLog.js';
import { toActorId } from '../utils/actorId.js';

export const listAttendanceController = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, date, shift, branch, studentId } = req.query;

  const filter = {};
  if (date)      filter.date    = date;
  if (shift)     filter.shift   = new RegExp(shift, 'i');
  if (branch)    filter.branch  = branch;
  if (studentId) filter.student = studentId;
  // date range support
  if (req.query.from || req.query.to) {
    filter.date = {};
    if (req.query.from) filter.date.$gte = req.query.from;
    if (req.query.to)   filter.date.$lte = req.query.to;
  }

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const [attendance, total] = await Promise.all([
    Attendance.find(filter)
      .populate('student', 'name mobile seatCode studentId')
      .sort({ date: -1, checkIn: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10)),
    Attendance.countDocuments(filter)
  ]);

  return paginatedResponse(res, attendance,
    { page: parseInt(page, 10), limit: parseInt(limit, 10), total },
    'Attendance retrieved');
});

export const markAttendanceController = asyncHandler(async (req, res) => {
  const { studentId, date, checkIn, checkOut, method, shift, seatCode, notes } = req.body;

  const student = await Student.findById(studentId);
  if (!student) throw new NotFoundError('Student not found');

  const attendDate = date     || new Date().toISOString().slice(0, 10);
  const inTime     = checkIn  || new Date().toTimeString().slice(0, 5);

  let durationMins = 0;
  if (inTime && checkOut) {
    const [ih, im] = inTime.split(':').map(Number);
    const [oh, om] = checkOut.split(':').map(Number);
    durationMins = Math.max(0, (oh * 60 + om) - (ih * 60 + im));
  }

  const attendance = await Attendance.findOneAndUpdate(
    { student: studentId, date: attendDate },
    {
      $setOnInsert: { student: studentId, date: attendDate },
      $set: {
        checkIn:     inTime,
        checkOut:    checkOut || '',
        durationMins,
        method:      method    || 'manual',
        shift:       shift     || student.shift     || '',
        seatCode:    seatCode  || student.seatCode  || '',
        markedBy:    toActorId(req.user.id),          // ← safe cast
        notes:       notes || '',
        branch:      student.branch || ''
      }
    },
    { upsert: true, new: true }
  );

  // AuditLog.actorId is also ObjectId — use toActorId
  await AuditLog.create({
    action:     'attendance_marked',
    actorId:    toActorId(req.user.id),               // ← safe cast
    actorRole:  req.user.role,
    actorName:  req.user.username,
    targetType: 'Attendance',
    targetId:   attendance._id.toString(),
    targetName: `${student.name} - ${attendDate}`,
    details:    { method, checkIn: inTime, checkOut, durationMins }
  });

  return successResponse(res, attendance, 'Attendance marked successfully');
});

export const scanQrAttendanceController = asyncHandler(async (req, res) => {
  // Accepts GET (QR scan) or POST
  const sid  = req.query.sid  || req.body.sid  || req.body.studentId;
  const date = req.query.date || req.body.date || new Date().toISOString().slice(0, 10);

  if (!sid) throw new NotFoundError('studentId (sid) is required');

  // Resolve by studentId field or Mongo _id
  const mongoose = (await import('mongoose')).default;
  const student = mongoose.Types.ObjectId.isValid(sid)
    ? await Student.findById(sid)
    : await Student.findOne({ studentId: sid });

  if (!student) throw new NotFoundError('Student not found');

  const now = new Date().toTimeString().slice(0, 5);

  // Toggle: if already checked in with no checkout → check out; else check in
  const existing = await Attendance.findOne({ student: student._id, date });
  let attendance;

  if (existing?.checkIn && !existing?.checkOut) {
    const [ih, im] = existing.checkIn.split(':').map(Number);
    const [oh, om] = now.split(':').map(Number);
    const durationMins = Math.max(0, (oh * 60 + om) - (ih * 60 + im));
    attendance = await Attendance.findByIdAndUpdate(
      existing._id,
      { checkOut: now, durationMins, method: 'qr_scan' },
      { new: true }
    );
  } else {
    attendance = await Attendance.findOneAndUpdate(
      { student: student._id, date },
      {
        $setOnInsert: { student: student._id, date },
        $set: {
          checkIn:  now,
          checkOut: '',
          durationMins: 0,
          method:   'qr_scan',
          shift:    student.shift    || '',
          seatCode: student.seatCode || '',
          markedBy: toActorId(req.user?.id),           // ← safe cast
          branch:   student.branch   || ''
        }
      },
      { upsert: true, new: true }
    );
  }

  await AuditLog.create({
    action:     'attendance_qr_scan',
    actorId:    toActorId(req.user?.id),               // ← safe cast
    actorRole:  req.user?.role   || 'system',
    actorName:  req.user?.username || 'QR',
    targetType: 'Attendance',
    targetId:   attendance._id.toString(),
    targetName: `${student.name} - ${date}`,
    details:    { method: 'qr_scan', checkIn: now, action: existing?.checkIn && !existing?.checkOut ? 'checkout' : 'checkin' }
  });

  return successResponse(res, {
    action:  existing?.checkIn && !existing?.checkOut ? 'checked_out' : 'checked_in',
    time:    now,
    student: { name: student.name, studentId: student.studentId, seatCode: student.seatCode },
    attendance
  }, 'QR attendance processed');
});

export const getAttendanceStatsController = asyncHandler(async (req, res) => {
  const { date, branch } = req.query;
  const targetDate = date || new Date().toISOString().slice(0, 10);
  const month      = targetDate.slice(0, 7);

  const filter = { date: targetDate };
  if (branch) filter.branch = branch;

  const [todayCount, monthCount, avgDuration] = await Promise.all([
    Attendance.countDocuments(filter),
    Attendance.countDocuments({ date: { $regex: `^${month}` }, ...(branch ? { branch } : {}) }),
    Attendance.aggregate([
      { $match: { date: { $regex: `^${month}` }, durationMins: { $gt: 0 } } },
      { $group: { _id: null, avg: { $avg: '$durationMins' } } }
    ])
  ]);

  return successResponse(res, {
    date: targetDate, month,
    todayCount,
    monthCount,
    avgDurationMins: Math.round(avgDuration[0]?.avg || 0)
  }, 'Attendance stats retrieved');
});

export const deleteAttendanceController = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const attendance = await Attendance.findByIdAndDelete(id);
  if (!attendance) throw new NotFoundError('Attendance record not found');

  await AuditLog.create({
    action:     'attendance_deleted',
    actorId:    toActorId(req.user.id),                // ← safe cast
    actorRole:  req.user.role,
    actorName:  req.user.username,
    targetType: 'Attendance',
    targetId:   id,
    details:    { date: attendance.date }
  });

  return successResponse(res, null, 'Attendance deleted successfully');
});
