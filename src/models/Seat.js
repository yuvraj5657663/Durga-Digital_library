const mongoose = require('mongoose');

const seatSchema = new mongoose.Schema(
  {
    // seat_key mirrors the SQLite PK pattern: "s_5_shift_1"
    seat_key:     { type: String, required: true, unique: true, trim: true },
    seat_number:  { type: Number, required: true, index: true },
    shift:        { type: Number, required: true, index: true },
    is_booked:    { type: Number, default: 0 },   // 0 = vacant, 1 = booked  (kept as Number for API response compat)
    student_name: { type: String, default: '' },
    mobile:       { type: String, default: '' },
    preparation:  { type: String, default: '' },
    expiry_date:  { type: String, default: '' },  // YYYY-MM-DD string (UI compatible)
  },
  {
    timestamps: false,  // seats table had no timestamps in SQLite
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        ret.id = ret._id.toString();
        return ret;
      }
    }
  }
);

// Compound index to speed up "fetch all booked seats for a shift"
seatSchema.index({ shift: 1, seat_number: 1 });

module.exports = mongoose.model('Seat', seatSchema);
