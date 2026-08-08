import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    membership: { type: mongoose.Schema.Types.ObjectId, ref: 'Membership' },
    date: { type: String, required: true, trim: true, index: true },
    checkIn: { type: String, trim: true, default: '' },
    checkOut: { type: String, trim: true, default: '' },
    durationMins: { type: Number, default: 0 },
    method: { type: String, enum: ['qr_scan', 'manual', 'system'], default: 'manual' },
    shift: { type: String, trim: true, default: '' },
    seatCode: { type: String, trim: true, default: '' },
    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String, trim: true, default: '' },
    branch: { type: String, trim: true, default: '' }
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

export default mongoose.model('Attendance', attendanceSchema);
