import mongoose from 'mongoose';

const networkDeviceSchema = new mongoose.Schema(
  {
    agentId: { type: String, required: true, trim: true, index: true },
    
    deviceName: { type: String, trim: true, default: 'Unknown Device' },
    hostname: { type: String, trim: true, default: '' },
    
    ipAddress: { type: String, required: true, trim: true, index: true },
    macAddress: { type: String, trim: true, default: '', index: true },
    
    manufacturer: { type: String, trim: true, default: '' },
    
    source: {
      type: String,
      enum: ['arp_scan', 'router_dhcp', 'router_arp', 'ping'],
      default: 'arp_scan',
      index: true
    },
    
    status: {
      type: String,
      enum: ['online', 'recently_seen', 'unreachable', 'offline'],
      default: 'online',
      index: true
    },
    
    firstSeen: { type: Date, default: Date.now },
    lastSeen: { type: Date, default: Date.now },

    lastSeenAt: { type: Date, default: Date.now }
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
networkDeviceSchema.index({ agentId: 1, ipAddress: 1, macAddress: 1 }, { unique: true });
networkDeviceSchema.index({ agentId: 1, status: 1 });
networkDeviceSchema.index({ lastSeenAt: 1 });

export default mongoose.model('NetworkDevice', networkDeviceSchema);
