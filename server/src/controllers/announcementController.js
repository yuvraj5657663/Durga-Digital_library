import Announcement from '../models/Announcement.js';
import { successResponse, paginatedResponse } from '../utils/response.js';
import { asyncHandler, NotFoundError } from '../utils/errors.js';
import AuditLog from '../models/AuditLog.js';
import { toActorId } from '../utils/actorId.js';

export const listAnnouncementsController = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, type, branch, shift } = req.query;

  const now = new Date();
  const filter = {
    publishAt: { $lte: now },
    $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }]
  };
  if (type)   filter.type         = type;
  if (branch) filter.targetBranch = branch;
  if (shift)  filter.targetShift  = new RegExp(shift, 'i');

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const [announcements, total] = await Promise.all([
    Announcement.find(filter)
      .sort({ pinned: -1, publishAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10)),
    Announcement.countDocuments(filter)
  ]);

  return paginatedResponse(res, announcements,
    { page: parseInt(page, 10), limit: parseInt(limit, 10), total },
    'Announcements retrieved');
});

export const createAnnouncementController = asyncHandler(async (req, res) => {
  const { title, body, type, targetBranch, targetShift, pinned, publishAt, expiresAt } = req.body;

  if (!title) throw new Error('title is required');
  if (!body)  throw new Error('body is required');

  const announcement = await Announcement.create({
    title,
    body,
    type:         type         || 'general',
    author:       toActorId(req.user.id),              // ← safe cast
    authorName:   req.user.username || 'Admin',
    targetBranch: targetBranch || '',
    targetShift:  targetShift  || '',
    pinned:       Boolean(pinned),
    publishAt:    publishAt ? new Date(publishAt) : new Date(),
    expiresAt:    expiresAt ? new Date(expiresAt) : null
  });

  await AuditLog.create({
    action:     'announcement_created',
    actorId:    toActorId(req.user.id),               // ← safe cast
    actorRole:  req.user.role,
    actorName:  req.user.username,
    targetType: 'Announcement',
    targetId:   announcement._id.toString(),
    targetName: title,
    details:    { type, targetBranch, targetShift }
  });

  return successResponse(res, announcement, 'Announcement created successfully', 201);
});

export const updateAnnouncementController = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = { ...req.body };
  delete updates._id; delete updates.author; delete updates.readBy;
  if (updates.publishAt) updates.publishAt = new Date(updates.publishAt);
  if (updates.expiresAt) updates.expiresAt = new Date(updates.expiresAt);

  const announcement = await Announcement.findByIdAndUpdate(id, updates, { new: true });
  if (!announcement) throw new NotFoundError('Announcement not found');

  await AuditLog.create({
    action:     'announcement_updated',
    actorId:    toActorId(req.user.id),               // ← safe cast
    actorRole:  req.user.role,
    actorName:  req.user.username,
    targetType: 'Announcement',
    targetId:   id,
    targetName: announcement.title,
    details:    Object.keys(updates)
  });

  return successResponse(res, announcement, 'Announcement updated successfully');
});

export const deleteAnnouncementController = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const announcement = await Announcement.findByIdAndDelete(id);
  if (!announcement) throw new NotFoundError('Announcement not found');

  await AuditLog.create({
    action:     'announcement_deleted',
    actorId:    toActorId(req.user.id),               // ← safe cast
    actorRole:  req.user.role,
    actorName:  req.user.username,
    targetType: 'Announcement',
    targetId:   id,
    targetName: announcement.title
  });

  return successResponse(res, null, 'Announcement deleted successfully');
});
