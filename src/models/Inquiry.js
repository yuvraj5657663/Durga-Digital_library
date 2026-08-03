const mongoose = require('mongoose');

const inquirySchema = new mongoose.Schema(
  {
    name:             { type: String, required: true, trim: true },
    mobile:           { type: String, required: true, trim: true, index: true },
    normalizedMobile: { type: String, trim: true, index: true, default: '' },
    email:            { type: String, trim: true, default: '' },
    preparation:      { type: String, trim: true, default: '' },
    preferred_shift:  { type: String, trim: true, default: '' },
    father_name:      { type: String, trim: true, default: '' },
    payment_status:   { type: String, default: 'Pending' },   // Pending | Paid
    admission_status: { type: String, default: 'Pending' },   // Pending | Accepted | Rejected
  },
  {
    timestamps: true,   // createdAt replaces the SQLite `created_at` column
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        // Map mongoose `createdAt` → `created_at` so existing frontend code works unchanged
        ret.id         = ret._id.toString();
        ret.created_at = ret.createdAt;
        return ret;
      }
    }
  }
);

module.exports = mongoose.model('Inquiry', inquirySchema);
