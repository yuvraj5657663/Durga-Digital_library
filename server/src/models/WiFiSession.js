import mongoose from 'mongoose';

const wifiSessionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    device: { type: mongoose.Schema.Types.ObjectId, ref: 'RegisteredDevice', required: true, index: true },
    
    gatewayId: { type: String, required: true, trim: true },
    
    tokenHash: { type: String, index: true },
    
    status: { 
      type: String, 
      enum: ['active', 'expired', 'revoked'], 
      default: 'active',
      index: true
    },
    
    startedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    lastActivityAt: { type: Date, default: Date.now },
    
    network: {
      ipAddress: { type: String, trim: true },
      connectionType: { type: String, trim: true, default: 'wifi' }
    },
    
    attendance: {
      attendanceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Attendance' },
      created: { type: Boolean, default: false }
    },
    
    revokedAt: { type: Date },
    revokedReason: { type: String, trim: true }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.tokenHash; // Never expose token hash in JSON
      }
    }
  }
);

// Index for efficient queries
wifiSessionSchema.index({ student: 1, status: 1 });
wifiSessionSchema.index({ device: 1, status: 1 });
wifiSessionSchema.index({ expiresAt: 1 });

export default mongoose.model('WiFiSession', wifiSessionSchema);
