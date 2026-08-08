import mongoose from 'mongoose';

const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    authorName: { type: String, trim: true, default: '' },
    type: { type: String, enum: ['general', 'holiday', 'maintenance', 'fee', 'exam', 'urgent'], default: 'general', index: true },
    targetBranch: { type: String, trim: true, default: '' },
    targetShift: { type: String, trim: true, default: '' },
    pinned: { type: Boolean, default: false, index: true },
    publishAt: { type: Date, default: Date.now, index: true },
    expiresAt: { type: Date, default: null },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }]
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
      }
    }
  }
);

announcementSchema.index({ publishAt: -1, pinned: -1 });

export default mongoose.model('Announcement', announcementSchema);
