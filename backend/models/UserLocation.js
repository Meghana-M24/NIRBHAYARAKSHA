import mongoose from 'mongoose';

const userLocationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },

    latitude: {
      type: Number,
      required: true,
      min: [-90, 'Latitude must be between -90 and 90'],
      max: [90, 'Latitude must be between -90 and 90'],
    },

    longitude: {
      type: Number,
      required: true,
      min: [-180, 'Longitude must be between -180 and 180'],
      max: [180, 'Longitude must be between -180 and 180'],
    },

    accuracy: {
      type: Number,
      min: [0, 'Accuracy cannot be negative'],
      default: null,
    },

    recordedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const UserLocation = mongoose.model(
  'UserLocation',
  userLocationSchema
);

export default UserLocation;