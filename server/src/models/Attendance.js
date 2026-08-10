import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    membership: { type: mongoose.Schema.Types.ObjectId, ref: 'Membership' },
    date: { type: String, required: true, trim: true, index: true },
    checkIn: { type: String, trim: true, default: '' },
    checkOut: { type: String, trim: true, default: '' },
    checkInTimestamp: { type: Date, default: null }, // NEW: Exact check-in timestamp
    checkOutTimestamp: { type: Date, default: null }, // NEW: Exact check-out timestamp
    durationMins: { type: Number, default: 0 },
    method: { type: String, enum: ['qr_scan', 'manual', 'system'], default: 'manual' },
    shift: { type: String, trim: true, default: '' },
    seatCode: { type: String, trim: true, default: '' },
    shiftType: { type: String, trim: default: '' }, // NEW: For shift-based validation
    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String, trim: true, default: '' },
    branch: { type: String, trim: default: '' },
    isValidated: { type: Boolean, default: true }, // NEW: Whether shift validation passed
    validationMessage: { type: String, default: '' } // NEW: Validation message if failed
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

attendanceSchema.index({ student: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: 1, branch: 1 });
attendanceSchema.index({ shift: 1, date: 1 }); // NEW: Index for shift-based queries

export default mongoose.model('Attendance', attendanceSchema);
