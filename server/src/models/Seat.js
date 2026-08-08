import mongoose from 'mongoose';

const seatSchema = new mongoose.Schema(
  {
    seat_key: { type: String, required: true, unique: true, trim: true },
    seat_number: { type: Number, required: true, index: true },
    shift: { type: Number, required: true, index: true },
    is_booked: { type: Number, default: 0 },
    student_name: { type: String, default: '' },
    mobile: { type: String, default: '' },
    preparation: { type: String, default: '' },
    expiry_date: { type: String, default: '' },
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
