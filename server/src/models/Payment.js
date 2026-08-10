import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    membership: { type: mongoose.Schema.Types.ObjectId, ref: 'Membership', default: null },
    receiptNo: { type: String, trim: true, unique: true, sparse: true, index: true },
    type: { type: String, enum: ['admission', 'renewal', 'penalty', 'refund', 'other'], default: 'admission', index: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    mode: { type: String, enum: ['cash', 'upi', 'bank_transfer', 'cheque', 'other'], default: 'cash' },
    status: { type: String, enum: ['pending', 'processing', 'completed', 'failed', 'refunded'], default: 'completed', index: true },
    transactionId: { type: String, trim: true, default: '' },
    upiRef: { type: String, trim: true, default: '' },
    paidOn: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' },
    collectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    branch: { type: String, trim: true, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    // NEW: Renewal request specific fields
    screenshotUrl: { type: String, trim: true, default: '' }, // Screenshot/QR confirmation URL
    requestedAt: { type: Date, default: null }, // When renewal was requested
    expiresAt: { type: Date, default: null }, // 10-minute timer expiration
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Admin who verified
    verifiedAt: { type: Date, default: null }, // When verification happened
    rejectionReason: { type: String, trim: true, default: '' }, // Reason for rejection
    duration: { type: String, trim: true, default: '' }, // Renewal duration requested
    isRenewalRequest: { type: Boolean, default: false } // Flag for renewal requests
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

paymentSchema.index({ student: 1, createdAt: -1 });
paymentSchema.index({ paidOn: 1 });
paymentSchema.index({ status: 1, isRenewalRequest: 1 }); // NEW: Index for renewal requests
paymentSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // NEW: TTL index for expired requests

export default mongoose.model('Payment', paymentSchema);