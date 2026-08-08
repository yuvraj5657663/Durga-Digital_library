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
    status: { type: String, enum: ['pending', 'completed', 'failed', 'refunded'], default: 'completed', index: true },
    transactionId: { type: String, trim: true, default: '' },
    upiRef: { type: String, trim: true, default: '' },
    paidOn: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' },
    collectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    branch: { type: String, trim: true, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
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

export default mongoose.model('Payment', paymentSchema);
