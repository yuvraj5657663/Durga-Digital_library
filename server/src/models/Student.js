import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema(
  {
    studentId: { type: String, trim: true, unique: true, sparse: true, index: true },
    qrCodeUrl: { type: String, trim: true, default: '' },
    seatCode: { type: String, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, index: true, default: '' },
    mobile: { type: String, required: true, trim: true, index: true },
    normalizedMobile: { type: String, trim: true, index: true, default: '' },
    preparation: { type: String, trim: true, default: 'General' },
    duration: { type: String, trim: true, default: '1 Month(s)' },
    joiningDate: { type: String, trim: true },
    expiryDate: { type: String, trim: true, index: true },
    fee: { type: Number, default: 0 },
    paymentMode: { type: String, default: 'Cash' },
    shift: { type: String, trim: true, default: 'Shift 1' },
    shiftHours: { type: String, trim: true, default: '' },
    status: { type: String, enum: ['Active', 'Inactive', 'Expired'], default: 'Active' },
    branch: { type: String, trim: true, default: '' },
    userRef: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    membershipRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Membership' }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        ret.id = ret._id.toString();
        return ret;
      }
    }
  }
);

studentSchema.index({ seatCode: 1, shift: 1 });

export default mongoose.model('Student', studentSchema);
