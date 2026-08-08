import Announcement from '../models/Announcement.js';
import { successResponse, paginatedResponse } from '../utils/response.js';
import { asyncHandler } from '../utils/errors.js';
import { NotFoundError } from '../utils/errors.js';
import AuditLog from '../models/AuditLog.js';

export const listAnnouncementsController = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, type, branch, shift } = req.query;
  
  const filter = { publishAt: { $lte: new Date() } };
  if (type) filter.type = type;
  if (branch) filter.targetBranch = branch;
  if (shift) filter.targetShift = shift;

  const skip = (page - 1) * limit;
  const [announcements, total] = await Promise.all([
    Announcement.find(filter)
      .populate('author', 'name username')
      .sort({ pinned: -1, publishAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Announcement.countDocuments(filter)
  ]);

  return paginatedResponse(res, announcements, { page: parseInt(page), limit: parseInt(limit), total }, 'Announcements retrieved');
});

export const createAnnouncementController = asyncHandler(async (req, res) => {
  const { title, body, type, targetBranch, targetShift, pinned, publishAt, expiresAt } = req.body;
  
  const announcement = await Announcement.create({
    title,
    body,
    type: type || 'general',
    author: req.user.id,
    authorName: req.user.username,
    targetBranch: targetBranch || '',
    targetShift: targetShift || '',
    pinned: pinned || false,
    publishAt: publishAt || new Date(),
    expiresAt
  });

  await AuditLog.create({
    action: 'announcement_created',
    actorId: req.user.id,
    actorRole: req.user.role,
    actorName: req.user.username,
    targetType: 'Announcement',
    targetId: announcement._id.toString(),
    targetName: title,
    details: { type, targetBranch, targetShift }
  });

  return successResponse(res, announcement, 'Announcement created successfully', 201);
});

export const updateAnnouncementController = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const announcement = await Announcement.findByIdAndUpdate(id, updates, { new: true });

  if (!announcement) {
    throw new NotFoundError('Announcement not found');
  }

  await AuditLog.create({
    action: 'announcement_updated',
    actorId: req.user.id,
    actorRole: req.user.role,
    actorName: req.user.username,
    targetType: 'Announcement',
    targetId: id,
    targetName: announcement.title,
    details: updates
  });

  return successResponse(res, announcement, 'Announcement updated successfully');
});

export const deleteAnnouncementController = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const announcement = await Announcement.findByIdAndDelete(id);

  if (!announcement) {
    throw new NotFoundError('Announcement not found');
  }

  await AuditLog.create({
    action: 'announcement_deleted',
    actorId: req.user.id,
    actorRole: req.user.role,
    actorName: req.user.username,
    targetType: 'Announcement',
    targetId: id,
    targetName: announcement.title
  });

  return successResponse(res, null, 'Announcement deleted successfully');
});
