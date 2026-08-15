import Attendance from '../models/Attendance.js';
import Student from '../models/Student.js';
import { successResponse, paginatedResponse } from '../utils/response.js';
import { asyncHandler, NotFoundError, ValidationError } from '../utils/errors.js';
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

  const attendDate = date || new Date().toISOString().slice(0, 10);
  const nowTimestamp = new Date();
  const inTime = checkIn || nowTimestamp.toTimeString().slice(0, 5);
  const studentShift = shift || student.shift || '';

  // Pure timestamp logging - NO time restrictions
  let status = 'ABSENT';
  if (inTime && !checkOut) {
    status = 'CHECKED_IN';
  } else if (inTime && checkOut) {
    status = 'CHECKED_OUT';
  }

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
        checkIn: inTime,
        checkOut: checkOut || '',
        checkInTimestamp: checkIn ? nowTimestamp : null,
        checkOutTimestamp: checkOut ? nowTimestamp : null,
        durationMins,
        method: method || 'manual',
        shift: studentShift,
        shiftType: studentShift,
        status,
        seatCode: seatCode || student.seatCode || '',
        markedBy: toActorId(req.user.id),
        notes: notes || '',
        branch: student.branch || '',
        isValidated: true,
        validationMessage: ''
      }
    },
    { upsert: true, new: true }
  );

  await AuditLog.create({
    action: 'attendance_marked',
    actorId: toActorId(req.user.id),
    actorRole: req.user.role,
    actorName: req.user.username,
    targetType: 'Attendance',
    targetId: attendance._id.toString(),
    targetName: `${student.name} - ${attendDate}`,
    details: { method, checkIn: inTime, checkOut, durationMins, shift: studentShift, status }
  });

  return successResponse(res, attendance, 'Attendance marked successfully');
});

export const scanQrAttendanceController = asyncHandler(async (req, res) => {
  // Accepts GET (QR scan) or POST
  const sid = req.query.sid || req.body.sid || req.body.studentId;
  const date = req.query.date || req.body.date || new Date().toISOString().slice(0, 10);

  if (!sid) throw new NotFoundError('studentId (sid) is required');

  // Resolve by studentId field or Mongo _id
  const mongoose = (await import('mongoose')).default;
  const student = mongoose.Types.ObjectId.isValid(sid)
    ? await Student.findById(sid)
    : await Student.findOne({ studentId: sid });

  if (!student) throw new NotFoundError('Student not found');

  const nowTimestamp = new Date();
  const now = nowTimestamp.toTimeString().slice(0, 5);
  const studentShift = student.shift || '';

  // Toggle: if already checked in with no checkout → check out; else check in
  const existing = await Attendance.findOne({ student: student._id, date });
  let attendance;

  if (existing?.checkIn && !existing?.checkOut) {
    // Check-out action - Pure timestamp logging, NO validation
    const [ih, im] = existing.checkIn.split(':').map(Number);
    const [oh, om] = now.split(':').map(Number);
    const durationMins = Math.max(0, (oh * 60 + om) - (ih * 60 + im));
    attendance = await Attendance.findByIdAndUpdate(
      existing._id,
      {
        checkOut: now,
        checkOutTimestamp: nowTimestamp,
        durationMins,
        method: 'qr_scan',
        status: 'CHECKED_OUT',
        isValidated: true,
        validationMessage: ''
      },
      { new: true }
    );
  } else {
    // Check-in action - Pure timestamp logging, NO validation
    attendance = await Attendance.findOneAndUpdate(
      { student: student._id, date },
      {
        $setOnInsert: { student: student._id, date },
        $set: {
          checkIn: now,
          checkInTimestamp: nowTimestamp,
          checkOut: '',
          checkOutTimestamp: null,
          durationMins: 0,
          method: 'qr_scan',
          shift: studentShift,
          shiftType: studentShift,
          status: 'CHECKED_IN',
          seatCode: student.seatCode || '',
          markedBy: toActorId(req.user?.id),
          branch: student.branch || '',
          isValidated: true,
          validationMessage: ''
        }
      },
      { upsert: true, new: true }
    );
  }

  await AuditLog.create({
    action: 'attendance_qr_scan',
    actorId: toActorId(req.user?.id),
    actorRole: req.user?.role || 'system',
    actorName: req.user?.username || 'QR',
    targetType: 'Attendance',
    targetId: attendance._id.toString(),
    targetName: `${student.name} - ${date}`,
    details: {
      method: 'qr_scan',
      checkIn: now,
      action: existing?.checkIn && !existing?.checkOut ? 'checkout' : 'checkin',
      shift: studentShift
    }
  });

  return successResponse(res, {
    action: existing?.checkIn && !existing?.checkOut ? 'checked_out' : 'checked_in',
    time: now,
    student: { name: student.name, studentId: student.studentId, seatCode: student.seatCode, shift: studentShift },
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

export const checkoutAttendanceController = asyncHandler(async (req, res) => {
  const { attendanceId, studentId } = req.body;

  if (!attendanceId && !studentId) {
    throw new ValidationError('Either attendanceId or studentId is required');
  }

  const nowTimestamp = new Date();
  const now = nowTimestamp.toTimeString().slice(0, 5);

  let attendance;
  if (attendanceId) {
    attendance = await Attendance.findById(attendanceId);
    if (!attendance) throw new NotFoundError('Attendance record not found');
  } else {
    const date = new Date().toISOString().slice(0, 10);
    attendance = await Attendance.findOne({ student: studentId, date });
    if (!attendance) throw new NotFoundError('No attendance record found for today');
  }

  if (!attendance.checkIn) {
    throw new ValidationError('Student has not checked in yet');
  }

  if (attendance.checkOut) {
    throw new ValidationError('Student has already checked out');
  }

  // Pure timestamp logging - NO time restrictions
  const [ih, im] = attendance.checkIn.split(':').map(Number);
  const [oh, om] = now.split(':').map(Number);
  const durationMins = Math.max(0, (oh * 60 + om) - (ih * 60 + im));

  attendance.checkOut = now;
  attendance.checkOutTimestamp = nowTimestamp;
  attendance.durationMins = durationMins;
  attendance.status = 'CHECKED_OUT';
  await attendance.save();

  // Audit log
  await AuditLog.create({
    action: 'attendance_checkout',
    actorId: toActorId(req.user.id),
    actorRole: req.user.role,
    actorName: req.user.username,
    targetType: 'Attendance',
    targetId: attendance._id.toString(),
    targetName: `Checkout - ${attendance.date}`,
    details: { checkOut: now, durationMins }
  });

  return successResponse(res, attendance, 'Student checked out successfully');
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
