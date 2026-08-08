import { renew, getHistory, getActive } from '../services/membershipService.js';
import { successResponse, errorResponse, paginatedResponse } from '../utils/response.js';
import { asyncHandler } from '../utils/errors.js';
import studentRepository from '../repositories/StudentRepository.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';
import logger from '../config/logger.js';

export const renewMembershipController = asyncHandler(async (req, res) => {
  const { studentId, duration, fee, paymentMode, joiningDate, transactionId } = req.body;
  const adminUser = req.user;

  if (!studentId || !duration || !fee) {
    throw new ValidationError('studentId, duration, and fee are required');
  }

  const result = await renew({
    studentId,
    duration,
    fee,
    paymentMode,
    joiningDate,
    adminUser,
    transactionId
  });

  return successResponse(res, result, 'Membership renewed successfully');
});

export const getMembershipHistoryController = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  const result = await getHistory(studentId, { page: parseInt(page), limit: parseInt(limit) });
  return paginatedResponse(res, result.memberships, result.pagination, 'Membership history retrieved');
});

export const getCurrentMembershipController = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const membership = await getActive(studentId);

  if (!membership) {
    throw new NotFoundError('No active membership found');
  }

  return successResponse(res, membership, 'Active membership retrieved');
});

export const getExpiringSoonController = asyncHandler(async (req, res) => {
  const { days = 5 } = req.query;
  const students = await studentRepository.findExpiringSoon(parseInt(days));
  
  return successResponse(res, students, 'Expiring memberships retrieved');
});
