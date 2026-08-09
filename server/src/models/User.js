import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: '' },
    username: { type: String, trim: true, lowercase: true, sparse: true, unique: true },
    email: { type: String, trim: true, lowercase: true, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'student'], required: true, default: 'student' },
    mobile: { type: String, trim: true, index: true, default: '' },
    normalizedMobile: { type: String, trim: true, default: '' },
    active: { type: Boolean, default: true },
    studentRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
    refreshTokens: [
      {
        tokenHash: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
        expiresAt: { type: Date }
      }
    ]
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        ret.id = ret._id.toString();
        delete ret.passwordHash;
        delete ret.refreshTokens;
        delete ret.__v;
      }
    }
  }
);

userSchema.index({ normalizedMobile: 1 });

export default mongoose.model('User', userSchema);
