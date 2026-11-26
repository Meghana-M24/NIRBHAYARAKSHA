import mongoose from 'mongoose';

const locationShareSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    tokenHash: {
      type: String,
      required: true,
      unique: true,
    },

    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

locationShareSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

const LocationShare = mongoose.model(
  'LocationShare',
  locationShareSchema
);

export default LocationShare;