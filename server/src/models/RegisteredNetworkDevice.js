import mongoose from 'mongoose';

const registeredNetworkDeviceSchema = new mongoose.Schema(
  {
    networkDeviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'NetworkDevice', required: true, index: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    agentId: { type: String, required: true, trim: true, index: true },
    
    deviceLabel: { type: String, trim: true, default: '' },
    
    ipAddress: { type: String, trim: true },
    macAddress: { type: String, trim: true, default: '' },
    manufacturer: { type: String, trim: true, default: '' },
    
    registrationSource: { 
      type: String, 
      enum: ['manual_admin', 'manual_student', 'auto', 'unknown'], 
      default: 'manual_admin' 
    },
    
    registeredAt: { type: Date, default: Date.now },
    lastSeenAt: { type: Date, default: Date.now },
    
    status: { 
      type: String, 
      enum: ['active', 'disabled', 'revoked'], 
      default: 'active',
      index: true
    },
    
    enabled: { type: Boolean, default: true },
    
    notes: { type: String, trim: true, default: '' },
    
    registeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
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

// Compound index for efficient queries
registeredNetworkDeviceSchema.index({ studentId: 1, status: 1 });
registeredNetworkDeviceSchema.index({ networkDeviceId: 1 }, { unique: true });
registeredNetworkDeviceSchema.index({ agentId: 1, status: 1 });

export default mongoose.model('RegisteredNetworkDevice', registeredNetworkDeviceSchema);
