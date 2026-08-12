import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', default: null, index: true },
    type: {
      type: String,
      enum: ['renewal_reminder', 'membership_activated', 'membership_expired',
             'announcement', 'payment_received', 'attendance_marked',
             'password_reset', 'custom', 'admission_inquiry', 'admission_inquiry_alert'],
      required: true,
      index: true
    },
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
    isRead: { type: Boolean, default: false, index: true },
    channel: { type: String, enum: ['in_app', 'email', 'whatsapp', 'all'], default: 'in_app' },
    sentVia: {
      email: { type: Boolean, default: false },
      whatsapp: { type: Boolean, default: false }
    },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    expiresAt: { type: Date, default: null }
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

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, sparse: true });

export default mongoose.model('Notification', notificationSchema);
