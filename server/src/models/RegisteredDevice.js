import mongoose from 'mongoose';

const registeredDeviceSchema = new mongoose.Schema(
  {
    deviceId: { type: String, required: true, unique: true, index: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    
    deviceInfo: {
      name: { type: String, trim: true, default: '' },
      type: { type: String, trim: true, enum: ['mobile', 'laptop', 'tablet', 'other'], default: 'other' },
      platform: { type: String, trim: true, default: '' },
      firstSeen: { type: Date, default: Date.now },
      lastSeen: { type: Date, default: Date.now }
    },
    
    deviceFingerprint: {
      macAddress: { type: String, trim: true, default: '' },
      userAgent: { type: String, trim: true, default: '' }
    },
    
    status: { 
      type: String, 
      enum: ['active', 'revoked', 'suspended'], 
      default: 'active',
      index: true
    },
    
    registration: {
      method: { type: String, trim: true, enum: ['wifi_auth', 'manual'], default: 'wifi_auth' },
      registeredAt: { type: Date, default: Date.now },
      registeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    },
    
    security: {
      trustScore: { type: Number, default: 100, min: 0, max: 100 },
      riskFlags: [{ type: String, trim: true }],
      lastSecurityCheck: { type: Date, default: Date.now }
    }
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
registeredDeviceSchema.index({ student: 1, status: 1 });
registeredDeviceSchema.index({ 'deviceFingerprint.macAddress': 1 }, { sparse: true });

export default mongoose.model('RegisteredDevice', registeredDeviceSchema);
