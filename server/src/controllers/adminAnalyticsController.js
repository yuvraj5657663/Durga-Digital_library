import { successResponse } from '../utils/response.js';
import { asyncHandler, ValidationError } from '../utils/errors.js';
import { answerAnalyticsQuestion } from '../services/adminAnalyticsService.js';

export const answerAnalyticsController = asyncHandler(async (req, res) => {
  const { question } = req.body;
  if (!question || !String(question).trim()) {
    throw new ValidationError('Question is required');
  }

  const result = await answerAnalyticsQuestion(question);
  return successResponse(res, result, 'Analytics answer generated');
});
