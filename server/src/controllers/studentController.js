import studentRepository from '../repositories/StudentRepository.js';
import { successResponse, paginatedResponse } from '../utils/response.js';
import { asyncHandler } from '../utils/errors.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import AuditLog from '../models/AuditLog.js';

export const listStudentsController = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, branch, shift } = req.query;
  
  const filter = {};
  if (status) filter.status = status;
  if (branch) filter.branch = branch;
  if (shift) filter.shift = shift;

  const result = await studentRepository.paginate(filter, {
    page: parseInt(page),
    limit: parseInt(limit),
    sort: { createdAt: -1 }
  });

  return paginatedResponse(res, result.data, result.pagination, 'Students retrieved');
});

export const getStudentController = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const student = await studentRepository.findById(id);

  if (!student) {
    throw new NotFoundError('Student not found');
  }

  return successResponse(res, student, 'Student retrieved');
});

export const updateStudentController = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const student = await studentRepository.updateById(id, updates);

  if (!student) {
    throw new NotFoundError('Student not found');
  }

  await AuditLog.create({
    action: 'student_updated',
    actorId: req.user.id,
    actorRole: req.user.role,
    actorName: req.user.username,
    targetType: 'Student',
    targetId: id,
    targetName: student.name,
    details: updates
  });

  return successResponse(res, student, 'Student updated successfully');
});

export const deactivateStudentController = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const student = await studentRepository.deactivateStudent(id);

  if (!student) {
    throw new NotFoundError('Student not found');
  }

  await AuditLog.create({
    action: 'student_deactivated',
    actorId: req.user.id,
    actorRole: req.user.role,
    actorName: req.user.username,
    targetType: 'Student',
    targetId: id,
    targetName: student.name
  });

  return successResponse(res, student, 'Student deactivated successfully');
});

export const getDashboardStatsController = asyncHandler(async (req, res) => {
  const { branch } = req.query;

  const [total, active, inactive, expired] = await Promise.all([
    studentRepository.count(branch ? { branch } : {}),
    studentRepository.count({ status: 'Active', ...(branch ? { branch } : {}) }),
    studentRepository.count({ status: 'Inactive', ...(branch ? { branch } : {}) }),
    studentRepository.count({ status: 'Expired', ...(branch ? { branch } : {}) })
  ]);

  const stats = {
    total,
    active,
    inactive,
    expired,
    expiringSoon: (await studentRepository.findExpiringSoon(5)).length
  };

  return successResponse(res, stats, 'Dashboard stats retrieved');
});

export const getAuditLogsController = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, action, targetType } = req.query;
  
  const filter = {};
  if (action) filter.action = action;
  if (targetType) filter.targetType = targetType;

  const skip = (page - 1) * limit;
  const [logs, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
    AuditLog.countDocuments(filter)
  ]);

  return paginatedResponse(res, logs, { page: parseInt(page), limit: parseInt(limit), total }, 'Audit logs retrieved');
});
