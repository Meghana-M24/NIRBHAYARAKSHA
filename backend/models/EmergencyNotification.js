import mongoose from 'mongoose';
import { RELATIONSHIPS } from './TrustedContact.js';

const emergencyNotificationSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmergencyEvent',
      required: true,
      index: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    contactName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    contactPhone: {
      type: String,
      required: true,
      trim: true,
      match: /^[0-9]{10}$/,
    },

    contactRelationship: {
      type: String,
      required: true,
      enum: RELATIONSHIPS,
    },

    channel: {
      type: String,
      enum: ['sms'],
      default: 'sms',
      required: true,
    },

    status: {
      type: String,
      enum: ['pending', 'simulated', 'sent', 'failed'],
      default: 'pending',
      required: true,
    },

    provider: {
      type: String,
      default: 'simulated',
      required: true,
    },

    providerMessageId: {
      type: String,
      default: null,
    },

    error: {
      type: String,
      default: null,
    },

    sentAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

emergencyNotificationSchema.index({ event: 1, createdAt: 1 });
emergencyNotificationSchema.index({ user: 1, createdAt: -1 });

const EmergencyNotification = mongoose.model(
  'EmergencyNotification',
  emergencyNotificationSchema
);

export default EmergencyNotification;