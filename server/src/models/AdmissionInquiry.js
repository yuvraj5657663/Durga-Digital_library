import mongoose from 'mongoose';

const admissionInquirySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true, index: true },
    whatsapp: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    shift: { 
      type: String, 
      required: true, 
      enum: ['Morning', 'Afternoon', 'Evening', 'Full Day'],
      default: 'Morning'
    },
    joiningDate: { type: Date, required: true },
    status: { 
      type: String, 
      enum: ['Pending', 'Approved', 'Rejected', 'Seat Assigned'],
      default: 'Pending'
    },
    createdAt: { type: Date, default: Date.now }
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

admissionInquirySchema.index({ status: 1 });
admissionInquirySchema.index({ createdAt: -1 });

export default mongoose.model('AdmissionInquiry', admissionInquirySchema);