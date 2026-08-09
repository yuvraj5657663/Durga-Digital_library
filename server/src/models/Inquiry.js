import mongoose from 'mongoose';

const inquirySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, trim: true, index: true },
    normalizedMobile: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, default: '' },
    preparation: { type: String, trim: true, default: '' },
    preferred_shift: { type: String, trim: true, default: '' },
    father_name: { type: String, trim: true, default: '' },
    payment_status: { type: String, default: 'Pending' },
    admission_status: { type: String, default: 'Pending' },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        ret.id = ret._id.toString();
        ret.created_at = ret.createdAt;
        return ret;
      }
    }
  }
);

inquirySchema.index({ normalizedMobile: 1 });

export default mongoose.model('Inquiry', inquirySchema);
