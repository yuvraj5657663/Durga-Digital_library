const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    seatCode:         { type: String, trim: true, index: true },
    name:             { type: String, required: true, trim: true },
    email:            { type: String, trim: true, default: '' },
    mobile:           { type: String, required: true, trim: true, index: true },
    normalizedMobile: { type: String, trim: true, index: true, default: '' },
    preparation:      { type: String, trim: true, default: 'General' },
    duration:         { type: String, trim: true, default: '1 Month(s)' },
    joiningDate:      { type: String, trim: true },
    expiryDate:       { type: String, trim: true, index: true },
    fee:              { type: Number, default: 0 },
    paymentMode:      { type: String, default: 'Cash' },
    shift:            { type: String, trim: true, default: 'Shift 1' },
    shiftHours:       { type: String, trim: true, default: '' },
  },
  {
    timestamps: true,   // adds createdAt + updatedAt automatically
    toJSON: {
      // Add a virtual `id` field so existing frontend code that reads `s.id` keeps working
      virtuals: true,
      transform(doc, ret) {
        ret.id = ret._id.toString();
        return ret;
      }
    }
  }
);

// Compound index for seat uniqueness check (optional, informational)
studentSchema.index({ seatCode: 1, shift: 1 });

module.exports = mongoose.model('Student', studentSchema);
