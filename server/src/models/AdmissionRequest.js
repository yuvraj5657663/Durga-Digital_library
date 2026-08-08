import mongoose from 'mongoose';

const admissionRequestSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    mobile: { type: String, required: true, trim: true, index: true },
    normalizedMobile: { type: String, trim: true, index: true, default: '' },
    email: { type: String, trim: true, lowercase: true, default: '' },
    preparation: { type: String, trim: true, default: '' },
    preferred_shift: { type: String, trim: true, default: '' },
    father_name: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },
    source: { type: String, trim: true, default: 'online_form' },
    payment_status: { type: String, enum: ['Pending', 'Paid'], default: 'Pending' },
    admission_status: { type: String, enum: ['Pending', 'Accepted', 'Rejected'], default: 'Pending' },
    reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewerName: { type: String, trim: true, default: '' },
    reviewNotes: { type: String, trim: true, default: '' },
    studentRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        ret.id = ret._id.toString();
        ret.created_at = ret.createdAt;
        delete ret._id;
        delete ret.__v;
      }
    }
  }
);

admissionRequestSchema.index({ normalizedMobile: 1 });
admissionRequestSchema.index({ admission_status: 1 });
admissionRequestSchema.index({ email: 1 });

export default mongoose.model('AdmissionRequest', admissionRequestSchema, 'inquiries');
