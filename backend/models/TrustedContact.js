import mongoose from 'mongoose';

export const RELATIONSHIPS = [
  'Family',
  'Friend',
  'Relative',
  'Colleague',
  'Other',
];

const trustedContactSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    name: {
      type: String,
      required: [true, 'Contact name is required'],
      trim: true,
      maxlength: [100, 'Contact name cannot exceed 100 characters'],
    },

    phone: {
      type: String,
      required: [true, 'Contact phone number is required'],
      trim: true,
      match: [/^[0-9]{10}$/, 'Phone number must be exactly 10 digits'],
    },

    relationship: {
      type: String,
      required: [true, 'Relationship is required'],
      trim: true,
      enum: {
        values: RELATIONSHIPS,
        message:
          'Relationship must be Family, Friend, Relative, Colleague, or Other',
      },
    },
  },
  {
    timestamps: true,
  }
);

trustedContactSchema.index({ owner: 1, createdAt: 1 });

trustedContactSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.owner;
    delete ret.__v;
    return ret;
  },
});

const TrustedContact = mongoose.model(
  'TrustedContact',
  trustedContactSchema
);

export default TrustedContact;