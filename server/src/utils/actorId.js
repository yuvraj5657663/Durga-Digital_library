/**
 * actorId.js
 * ----------
 * Safely converts an actor identifier (req.user.id / adminUser._id)
 * to a Mongoose-compatible ObjectId value.
 *
 * The env-admin shortcut stores 'env-admin' as a plain string, which cannot
 * be cast to ObjectId. Whenever that value (or any other non-ObjectId string)
 * would be written into an ObjectId field we return null instead, so Mongoose
 * skips the field rather than throwing a BSONError.
 *
 * Usage:
 *   activatedBy: toActorId(req.user.id)
 *   actorId:     toActorId(adminUser?._id || adminUser?.id)
 */

import mongoose from 'mongoose';

export function toActorId(id) {
  if (!id) return null;
  const str = String(id);
  return mongoose.Types.ObjectId.isValid(str) ? str : null;
}
