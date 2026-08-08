import mongoose from 'mongoose';

const branchSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, trim: true, unique: true, uppercase: true, index: true },
    name: { type: String, required: true, trim: true },
    address: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    state: { type: String, trim: true, default: '' },
    pincode: { type: String, trim: true, default: '' },
    mobile: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, default: '' },
    managerName: { type: String, trim: true, default: '' },
    managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    capacity: { type: Number, default: 24 },
    shifts: [
      {
        shiftNum: { type: Number, required: true },
        label: { type: String, trim: true },
        startTime: { type: String, trim: true },
        endTime: { type: String, trim: true },
        baseFee: { type: Number, default: 0 }
      }
    ],
    active: { type: Boolean, default: true, index: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
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

export default mongoose.model('Branch', branchSchema);
