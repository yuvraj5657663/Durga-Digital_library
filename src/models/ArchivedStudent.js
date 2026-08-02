const mongoose = require('mongoose');

const archivedStudentSchema = new mongoose.Schema(
  {
    originalId:  { type: String, default: '' },  // stores the original Student _id string
    seatCode:    { type: String, default: '' },
    name:        { type: String, default: '' },
    email:       { type: String, default: '' },
    mobile:      { type: String, default: '' },
    preparation: { type: String, default: '' },
    duration:    { type: String, default: '' },
    joiningDate: { type: String, default: '' },
    expiryDate:  { type: String, default: '' },
    fee:         { type: Number, default: 0 },
    paymentMode: { type: String, default: 'Cash' },
    shift:       { type: String, default: '' },
    shiftHours:  { type: String, default: '' },
    reason:      { type: String, default: 'Deleted from Directory by Admin' },
    deleted_at:  { type: Date, default: Date.now },
  },
  {
    timestamps: false,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        ret.id = ret._id.toString();
        return ret;
      }
    }
  }
);

module.exports = mongoose.model('ArchivedStudent', archivedStudentSchema);
