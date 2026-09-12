import mongoose from 'mongoose';

const captivePortalSessionSchema = new mongoose.Schema(
  {
    portalSessionId: { type: String, required: true, unique: true, index: true },
    gatewayId: { type: String, required: true, trim: true, index: true },

    client: {
      ipAddress: { type: String, trim: true },
      macAddress: { type: String, trim: true },
      userAgent: { type: String, trim: true }
    },

    originalUrl: { type: String, trim: true },

    status: {
      type: String,
      enum: ['pending', 'authenticated', 'authorized', 'expired', 'failed'],
      default: 'pending',
      index: true
    },

    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', index: true },
    device: { type: mongoose.Schema.Types.ObjectId, ref: 'RegisteredDevice', index: true },
    wifiSession: { type: mongoose.Schema.Types.ObjectId, ref: 'WiFiSession', index: true },

    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    authenticatedAt: { type: Date },
    authorizedAt: { type: Date },

    failureReason: { type: String, trim: true }
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

// Index for efficient queries
captivePortalSessionSchema.index({ gatewayId: 1, status: 1 });
captivePortalSessionSchema.index({ student: 1, status: 1 });
captivePortalSessionSchema.index({ createdAt: -1 });

export default mongoose.model('CaptivePortalSession', captivePortalSessionSchema);
