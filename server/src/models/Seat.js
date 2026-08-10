import mongoose from 'mongoose';

const seatSchema = new mongoose.Schema(
  {
    seat_key: { type: String, required: true, unique: true, trim: true },
    seat_number: { type: Number, required: true, index: true },
    shift: { type: String, required: true, index: true }, // Changed from Number to String
    shift_name: { type: String, default: '' }, // For human-readable shift names
    is_booked: { type: Number, default: 0 },
    student_name: { type: String, default: '' },
    mobile: { type: String, default: '' },
    preparation: { type: String, default: '' },
    expiry_date: { type: String, default: '' },
    custom_timing: { type: String, default: '' }, // For custom shift timing
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

seatSchema.index({ shift: 1, seat_number: 1 });

export default mongoose.model('Seat', seatSchema);
