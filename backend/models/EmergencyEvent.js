import mongoose from 'mongoose';
import { RELATIONSHIPS } from './TrustedContact.js';

const locationSchema = new mongoose.Schema(
  {
    latitude: {
      type: Number,
      min: [-90, 'Latitude must be between -90 and 90'],
      max: [90, 'Latitude must be between -90 and 90'],
      required: true,
    },

    longitude: {
      type: Number,
      min: [-180, 'Longitude must be between -180 and 180'],
      max: [180, 'Longitude must be between -180 and 180'],
      required: true,
    },

    accuracy: {
      type: Number,
      min: [0, 'Accuracy cannot be negative'],
      default: null,
    },
  },
  { _id: false }
);

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

const emergencyEventSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ['active', 'cancelled', 'resolved'],
      default: 'active',
      required: true,
    },

    isDuress: {
      type: Boolean,
      default: false,
      select: false,
    },

    location: {
      type: locationSchema,
      default: null,
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

    triggeredAt: {
      type: Date,
      default: Date.now,
      required: true,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

emergencyEventSchema.index({ user: 1, triggeredAt: -1 });

const EmergencyEvent = mongoose.model(
  'EmergencyEvent',
  emergencyEventSchema
);

export default EmergencyEvent;