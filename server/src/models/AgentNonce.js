import mongoose from 'mongoose';

const agentNonceSchema = new mongoose.Schema(
  {
    agentId: { type: String, required: true, trim: true, index: true },
    nonce: { type: String, required: true, trim: true, index: true },
    usedAt: { type: Date, required: true, default: Date.now, index: true }
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

// Compound index for efficient duplicate checking
agentNonceSchema.index({ agentId: 1, nonce: 1 }, { unique: true });

// TTL index to automatically delete old nonces (5 minutes)
agentNonceSchema.index({ usedAt: 1 }, { expireAfterSeconds: 300 });

export default mongoose.model('AgentNonce', agentNonceSchema);
