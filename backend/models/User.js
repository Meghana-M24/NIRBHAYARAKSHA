import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please provide a valid email address',
      ],
    },

    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false,
    },

    phone: {
      type: String,
      trim: true,
      maxlength: [20, 'Phone cannot exceed 20 characters'],
      default: '',
    },

    address: {
      type: String,
      trim: true,
      maxlength: [300, 'Address cannot exceed 300 characters'],
      default: '',
    },

    emergencyInfo: {
      type: String,
      trim: true,
      maxlength: [
        1000,
        'Emergency information cannot exceed 1000 characters',
      ],
      default: '',
    },

    pinConfigured: {
      type: Boolean,
      default: false,
    },

    normalPinHash: {
      type: String,
      select: false,
      default: null,
    },

    duressPinHash: {
      type: String,
      select: false,
      default: null,
    },

    failedPinAttempts: {
      type: Number,
      default: 0,
      min: 0,
    },

    pinLockedUntil: {
      type: Date,
      default: null,
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.passwordHash;
    delete ret.normalPinHash;
    delete ret.duressPinHash;
    delete ret.__v;
    return ret;
  },
});
userSchema.statics.hashPassword = function (plainPassword) {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
};
userSchema.statics.hashPin = function (plainPin) {
  return bcrypt.hash(plainPin, SALT_ROUNDS);
};

userSchema.methods.comparePassword = function (plainPassword) {
  return bcrypt.compare(plainPassword, this.passwordHash);
};

const User = mongoose.model('User', userSchema);

export default User;