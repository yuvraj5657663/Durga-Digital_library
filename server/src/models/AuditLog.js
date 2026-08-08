import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    action: { type: String, required: true, trim: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    actorRole: { type: String, trim: true, default: '' },
    actorName: { type: String, trim: true, default: '' },
    targetType: { type: String, trim: true, default: '' },
    targetId: { type: String, trim: true, default: '' },
    targetName: { type: String, trim: true, default: '' },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
    ip: { type: String, trim: true, default: '' },
    userAgent: { type: String, trim: true, default: '' }
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

export default mongoose.model('AuditLog', auditLogSchema);
