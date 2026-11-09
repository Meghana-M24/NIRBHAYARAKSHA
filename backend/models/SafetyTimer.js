import mongoose from 'mongoose';
import { RELATIONSHIPS } from './TrustedContact.js';

const contactSnapshotSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
      match: /^[0-9]{10}$/,
    },

    relationship: {
      type: String,
      required: true,
      enum: RELATIONSHIPS,
    },
  },
  { _id: false }
);

const safetyTimerSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ['active', 'checked_in', 'expired'],
      default: 'active',
      required: true,
    },

    isDuress: {
      type: Boolean,
      default: false,
      select: false,
    },

    durationMinutes: {
      type: Number,
      required: true,
      min: 1,
      max: 1440,
    },

    message: {
      type: String,
      trim: true,
      maxlength: [500, 'Message cannot exceed 500 characters'],
      default: '',
    },

    contacts: {
      type: [contactSnapshotSchema],
      default: [],
    },

    startedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },

    expiresAt: {
      type: Date,
      required: true,
    },

    checkedInAt: {
      type: Date,
      default: null,
    },

    expiredAt: {
      type: Date,
      default: null,
    },

    sosEvent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmergencyEvent',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

safetyTimerSchema.index({ user: 1, startedAt: -1 });

safetyTimerSchema.index(
  { user: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'active' },
    name: 'one_active_safety_timer_per_user',
  }
);

const SafetyTimer = mongoose.model(
  'SafetyTimer',
  safetyTimerSchema
);

export default SafetyTimer;