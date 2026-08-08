import mongoose from 'mongoose';

const membershipSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    type: { type: String, trim: true, default: 'Standard' },
    status: { type: String, enum: ['Active', 'Inactive', 'Expired'], default: 'Active' },
    startDate: { type: String, trim: true, default: '' },
    expiryDate: { type: String, trim: true, default: '' },
    fee: { type: Number, default: 0 },
    duration: { type: String, trim: true, default: '1 Month(s)' },
    activatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
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

export default mongoose.model('Membership', membershipSchema);
